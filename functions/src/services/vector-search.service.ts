import * as admin from 'firebase-admin';
import { GoogleAuth } from 'google-auth-library';
import OpenAI from 'openai';

/**
 * INDEX_ENDPOINT
 *  - Full resource name of your IndexEndpoint (NOT the Index).
 *  - Format: projects/{PROJECT_NUMBER}/locations/{REGION}/indexEndpoints/{ENDPOINT_ID}
 *
 * DEPLOYED_INDEX_ID
 *  - The deployed index alias you used when running `gcloud ai index-endpoints deploy-index --deployed-index-id=...`
 *  - This is required by the findNeighbors API to select which deployed index to query.
 */
const INDEX_ENDPOINT =
  'projects/59703367386/locations/us-central1/indexEndpoints/2766144756089094144';
const DEPLOYED_INDEX_ID = 'insurances_index_stream';

/**
 * Compute cosine similarity between two vectors of equal length.
 * Returns a value in [-1, 1], where 1 means “identical direction” (highest similarity).
 * We guard against division-by-zero for empty/zero vectors by using denom || 1.
 */
function cosineSim(a: number[], b: number[]) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i] || 0;
    const y = b[i] || 0;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb) || 1;
  return dot / denom;
}

/**
 * VectorSearchService
 *
 * Responsibilities:
 *  - Query Vertex AI Matching Engine (ME) via REST (regional host).
 *  - If ME returns an error (e.g., 501 UNIMPLEMENTED while an endpoint is settling),
 *    gracefully fall back to a local brute-force semantic search using OpenAI embeddings.
 *  - Build the final “context” from Firestore mirror documents (`me_chunks`) so the LLM
 *    can answer with grounded information.
 *
 * Design choices:
 *  - We use REST (not gRPC) to avoid environment-specific “UNIMPLEMENTED” errors that can
 *    show up in Cloud Run/Functions with certain gRPC builds.
 *  - Fallback is intentionally simple and works for small datasets (tens/hundreds of docs).
 *  - The service is stateless; it reads source text from `me_chunks` every time.
 *    For high QPS, consider caching, precomputed embeddings, and pagination.
 */
export class VectorSearchService {
  private db = admin.firestore();

  /**
   * GoogleAuth with Cloud Platform scope:
   *  - Uses Application Default Credentials (ADC) in Cloud Functions.
   *  - Automatically refreshes access tokens.
   */
  private auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });

  /**
   * Find neighbors for a query embedding and return both:
   *  - ids: the top-k document IDs (vector matches)
   *  - context: a concatenated string from Firestore (`me_chunks`) to feed the LLM
   *
   * @param queryEmbedding The 1536-d float vector (OpenAI `text-embedding-3-small`) for the user query.
   * @param k              Number of nearest neighbors to retrieve (top-k).
   * @param openai         OpenAI client; required ONLY for the local fallback path.
   *
   * Error handling:
   *  - First, we try Vertex ME (`findNeighbors`). If it returns neighbors, we’re done.
   *  - If ME errors (e.g., 501/UNIMPLEMENTED) OR returns zero neighbors,
   *    we enter fallback mode (requires `openai` parameter).
   *
   * Performance notes:
   *  - Fallback embeds all `me_chunks` on the fly — OK for small corpora. For larger sets,
   *    store chunk embeddings in Firestore and reuse them.
   */
  async findWithContext(
    queryEmbedding: number[],
    k = 5,
    openai?: OpenAI
  ): Promise<{ ids: string[]; context: string }> {
    // ------------------------------
    // 1) Primary path: Vertex ME REST
    // ------------------------------
    try {
      const client = await this.auth.getClient();
      const url = `https://us-central1-aiplatform.googleapis.com/v1/${INDEX_ENDPOINT}:findNeighbors`;

      // Matching Engine request payload:
      // - deployedIndexId: which deployed index to route the query to
      // - queries: array of queries (we use a single one)
      const body = {
        deployedIndexId: DEPLOYED_INDEX_ID,
        queries: [{ neighborCount: k, datapoint: { featureVector: queryEmbedding } }],
      };

      const resp = await client.request<{
        nearestNeighbors: Array<{
          neighbors: Array<{ datapoint?: { datapointId?: string } }>;
        }>;
      }>({ url, method: 'POST', data: body });

      const neighbors = resp.data?.nearestNeighbors?.[0]?.neighbors ?? [];
      const ids = neighbors
        .map((n) => n?.datapoint?.datapointId)
        .filter((x): x is string => !!x);

      if (ids.length > 0) {
        // Fetch the matched chunks from Firestore and concatenate their text as LLM context
        const docs = await Promise.all(
          ids.map((id) => this.db.collection('me_chunks').doc(id).get())
        );
        const context = docs
          .filter((d) => d.exists)
          .map((d) => d.data()?.text as string)
          .filter(Boolean)
          .join('\n---\n');

        return { ids, context };
      }

      // ME responded but returned no neighbors — proceed to fallback to still be helpful.
      throw new Error('Vertex returned no neighbors');
    } catch (err: any) {
      // Log key diagnostics without failing the whole request.
      // Common cases:
      //  - 501/UNIMPLEMENTED when endpoint isn’t fully serving/compatible
      //  - transient errors during rollout
      const code = err?.response?.status || err?.code || '';
      const status = err?.response?.data?.error?.status || '';
      const msg = err?.response?.data?.error?.message || err?.message || '';
      console.warn('Vertex findNeighbors failed, falling back to local search:', {
        code,
        status,
        msg,
      });
    }

    // ---------------------------------------
    // 2) Fallback path: local brute-force RAG
    // ---------------------------------------
    if (!openai) {
      // We can’t do fallback without the OpenAI client.
      // Throwing here surfaces a clear error to the caller.
      throw new Error('OpenAI client required for fallback');
    }

    // Load all mirror chunks from Firestore.
    // Each document is expected to have: { text, ...metadata }
    const snap = await this.db.collection('me_chunks').get();
    const rows = snap.docs
      .map((d) => ({ id: d.id, text: (d.data()?.text as string) || '' }))
      .filter((r) => r.text);

    if (rows.length === 0) return { ids: [], context: '' };

    // Embed all texts in batches (avoid hitting token limits and keep memory moderate).
    const BATCH = 64;
    const sims: Array<{ id: string; score: number }> = [];

    for (let i = 0; i < rows.length; i += BATCH) {
      const part = rows.slice(i, i + BATCH);
      const emb = await openai.embeddings.create({
        model: 'text-embedding-3-small', // 1536-dimensional vectors
        input: part.map((p) => p.text),
      });

      // Compute cosine similarity for each chunk vs the query embedding.
      emb.data.forEach((d, j) => {
        const score = cosineSim(queryEmbedding, d.embedding);
        sims.push({ id: part[j].id, score });
      });
    }

    // Rank chunks by similarity and take top-k
    sims.sort((a, b) => b.score - a.score);
    const top = sims.slice(0, k);
    const ids = top.map((t) => t.id);

    // Build final concatenated context from the selected chunks
    const docs = await Promise.all(
      ids.map((id) => this.db.collection('me_chunks').doc(id).get())
    );
    const context = docs
      .filter((d) => d.exists)
      .map((d) => d.data()?.text as string)
      .filter(Boolean)
      .join('\n---\n');

    return { ids, context };
  }
}
