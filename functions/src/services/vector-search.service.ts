import * as admin from 'firebase-admin';
import { GoogleAuth } from 'google-auth-library';

const INDEX_ENDPOINT =
  'projects/59703367386/locations/us-central1/indexEndpoints/2766144756089094144';
const DEPLOYED_INDEX_ID = 'insurances_index_tree_v1';

export class VectorSearchService {
  private db = admin.firestore();
  private auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });

  async findWithContext(
    queryEmbedding: number[],
    k = 5
  ): Promise<{ ids: string[]; context: string }> {
    try {
      const client = await this.auth.getClient();
      const url = `https://628806361.us-central1-59703367386.vdb.vertexai.goog/v1/${INDEX_ENDPOINT}:findNeighbors`;

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

      if (!ids.length) {
        return { ids: [], context: '' };
      }

      const docs = await Promise.all(ids.map((id) => this.db.collection('insurances').doc(id).get()));

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

      return { ids, context };
    } catch (error: any) {
      throw error;
    }
  }
}
