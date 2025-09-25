import * as admin from 'firebase-admin';
import { GoogleAuth } from 'google-auth-library';
import OpenAI from 'openai';

// Usa tus valores reales
const INDEX_ENDPOINT =
  'projects/59703367386/locations/us-central1/indexEndpoints/2766144756089094144';
const DEPLOYED_INDEX_ID = 'insurances_index_stream';

function cosineSim(a: number[], b: number[]) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i] || 0, y = b[i] || 0;
    dot += x * y; na += x * x; nb += y * y;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb) || 1;
  return dot / denom;
}

export class VectorSearchService {
  private db = admin.firestore();
  private auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });

  /**
   * Intenta Matching Engine (REST). Si falla (501/UNIMPLEMENTED), hace fallback
   * a brute-force en memoria embebiendo los textos de me_chunks con OpenAI.
   * Devuelve ids + contexto concatenado.
   */
  async findWithContext(
    queryEmbedding: number[],
    k = 5,
    openai?: OpenAI // pásalo desde tu ChatEngineService
  ): Promise<{ ids: string[]; context: string }> {
    // 1) Intento: Vertex REST
    try {
      const client = await this.auth.getClient();
      const url = `https://us-central1-aiplatform.googleapis.com/v1/${INDEX_ENDPOINT}:findNeighbors`;
      const body = {
        deployedIndexId: DEPLOYED_INDEX_ID,
        queries: [{ neighborCount: k, datapoint: { featureVector: queryEmbedding } }],
      };

      const resp = await client.request<{
        nearestNeighbors: Array<{ neighbors: Array<{ datapoint?: { datapointId?: string } }> }>;
      }>({ url, method: 'POST', data: body });

      const neighbors = resp.data?.nearestNeighbors?.[0]?.neighbors ?? [];
      const ids = neighbors.map(n => n?.datapoint?.datapointId).filter((x): x is string => !!x);

      if (ids.length) {
        const docs = await Promise.all(ids.map(id => this.db.collection('me_chunks').doc(id).get()));
        const context = docs.filter(d => d.exists).map(d => d.data()?.text as string).filter(Boolean).join('\n---\n');
        return { ids, context };
      }
      // Si ME respondió pero vacío, igual seguimos con fallback para ser útiles
      throw new Error('Vertex returned no neighbors');
    } catch (err: any) {
      const code = err?.response?.status || err?.code || '';
      const status = err?.response?.data?.error?.status || '';
      const msg = err?.response?.data?.error?.message || err?.message || '';
      console.warn('Vertex findNeighbors failed, falling back to local search:', { code, status, msg });
    }

    // 2) Fallback: brute-force local (embebe me_chunks y calcula coseno)
    if (!openai) throw new Error('OpenAI client required for fallback');

    // Trae textos de me_chunks
    const snap = await this.db.collection('me_chunks').get();
    const rows = snap.docs.map(d => ({ id: d.id, text: (d.data()?.text as string) || '' })).filter(r => r.text);
    if (!rows.length) return { ids: [], context: '' };

    // Embebe en batch (respetando límite del modelo)
    const BATCH = 64;
    const sims: Array<{ id: string; score: number }> = [];

    for (let i = 0; i < rows.length; i += BATCH) {
      const part = rows.slice(i, i + BATCH);
      const emb = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: part.map(p => p.text),
      });
      emb.data.forEach((d, j) => {
        const score = cosineSim(queryEmbedding, d.embedding);
        sims.push({ id: part[j].id, score });
      });
    }

    // Top-k por score
    sims.sort((a, b) => b.score - a.score);
    const top = sims.slice(0, k);
    const ids = top.map(t => t.id);

    const docs = await Promise.all(ids.map(id => this.db.collection('me_chunks').doc(id).get()));
    const context = docs.filter(d => d.exists).map(d => d.data()?.text as string).filter(Boolean).join('\n---\n');

    return { ids, context };
  }
}
