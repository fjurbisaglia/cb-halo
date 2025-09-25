import * as admin from 'firebase-admin';
import { GoogleAuth } from 'google-auth-library';

/**
 * Use your real values:
 * - INDEX_ENDPOINT: IndexEndpoint resource name (NOT the Index resource)
 * - DEPLOYED_INDEX_ID: The deployed index ID used when you deployed the index
 */
const INDEX_ENDPOINT =
  'projects/59703367386/locations/us-central1/indexEndpoints/2766144756089094144';
const DEPLOYED_INDEX_ID = 'insurances_index_tree_v1';

export class VectorSearchService {
  private db = admin.firestore();
  private auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });

  /**
   * Performs a pure cloud-based vector search using Vertex AI Matching Engine.
   *
   * @param queryEmbedding 1536-dimensional embedding representing the user query.
   * @param k              Number of nearest neighbors to retrieve.
   * @returns Object containing:
   *   - ids: The Firestore document IDs returned by Matching Engine
   *   - context: Concatenated string with key insurance details
   */
  async findWithContext(
    queryEmbedding: number[],
    k = 5
  ): Promise<{ ids: string[]; context: string }> {
    console.log('🔍 [VectorSearch] Starting findWithContext...');
    console.log(`ℹ️  Using INDEX_ENDPOINT=${INDEX_ENDPOINT}`);
    console.log(`ℹ️  Using DEPLOYED_INDEX_ID=${DEPLOYED_INDEX_ID}`);
    console.log(`ℹ️  Query vector length: ${queryEmbedding.length}, retrieving top-${k} neighbors`);

    try {
      // 1) Get authenticated HTTP client for Vertex AI REST API
      console.log('🔑 Getting Google Auth client...');
      const client = await this.auth.getClient();
      console.log('✅ Auth client acquired.');

      const url = `https://628806361.us-central1-59703367386.vdb.vertexai.goog/v1/${INDEX_ENDPOINT}:findNeighbors`;

      // 2) Build request payload for Matching Engine
      const body = {
        deployedIndexId: DEPLOYED_INDEX_ID,
        queries: [{ neighborCount: k, datapoint: { featureVector: queryEmbedding } }],
      };

      console.log('📤 Sending request to Vertex Matching Engine...');
      // 3) Call Vertex Matching Engine
      const resp = await client.request<{
        nearestNeighbors: Array<{
          neighbors: Array<{ datapoint?: { datapointId?: string } }>;
        }>;
      }>({ url, method: 'POST', data: body });

      console.log('✅ Vertex ME response received.');
      console.log(`📄 Raw response: ${JSON.stringify(resp.data, null, 2)}`);

      // 4) Extract the IDs of the nearest datapoints
      const neighbors = resp.data?.nearestNeighbors?.[0]?.neighbors ?? [];
      console.log(`🔎 Found ${neighbors.length} neighbors from ME.`);

      const ids = neighbors
        .map((n) => n?.datapoint?.datapointId)
        .filter((x): x is string => !!x);

      if (!ids.length) {
        console.warn('⚠️ No datapoint IDs returned by Matching Engine.');
        return { ids: [], context: '' };
      }

      console.log(`📚 Fetching ${ids.length} insurance documents from Firestore...`);

      // 5) Fetch full insurance documents from Firestore
      const docs = await Promise.all(ids.map((id) => this.db.collection('insurances').doc(id).get()));

      // 6) Build context string directly from insurance fields
      const context = docs
        .filter((d) => d.exists)
        .map((d) => {
          const data = d.data()!;
          return [
            `Plan: ${data.name}`,
            `Region: ${data.region}`,
            `Medical Coverage: ${data.amountCovered ?? data.coverageMedical} ${data.currency}`,
            `Price/Day: ${data.pricePerDay} ${data.currency}`,
            `Details: ${data.description}`,
          ].join('\n');
        })
        .join('\n---\n');

      console.log('✅ Context built successfully.');
      return { ids, context };
    } catch (error: any) {
      console.error('❌ [VectorSearch] Error during findWithContext:', error?.response?.data || error);
      throw error;
    }
  }
}
