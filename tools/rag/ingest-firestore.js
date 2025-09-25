import 'dotenv/config';
import OpenAI from 'openai';
import admin from 'firebase-admin';
import aiplatform from '@google-cloud/aiplatform';

// --- Load environment variables from .env file ---
const {
  OPENAI_API_KEY,
  GCP_PROJECT,
  GCP_LOCATION = 'us-central1',
  INDEX_RESOURCE_NAME
} = process.env;

// --- Validate required environment variables ---
if (!OPENAI_API_KEY) throw new Error('Missing OPENAI_API_KEY');
if (!GCP_PROJECT) throw new Error('Missing GCP_PROJECT');
if (!INDEX_RESOURCE_NAME) throw new Error('Missing INDEX_RESOURCE_NAME');

// --- Initialize Firebase Admin SDK to connect to Firestore using ADC (Application Default Credentials) ---
if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

// --- Initialize OpenAI client with the API key ---
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// --- Initialize Vertex AI Matching Engine client ---
const { v1 } = aiplatform;
console.log(`📡 Using INDEX_RESOURCE_NAME=${INDEX_RESOURCE_NAME}`);
const indexClient = new v1.IndexServiceClient({
  apiEndpoint: `${GCP_LOCATION}-aiplatform.googleapis.com`,
});

// --- Helper: Converts an insurance policy into a single descriptive text block (used for embeddings) ---
function toText(pkg) {
  return [
    `Plan: ${pkg.name}`,
    `Region: ${pkg.region}`,
    `Medical Coverage: ${pkg.amountCovered ?? pkg.coverageMedical} ${pkg.currency}`,
    `Price/Day: ${pkg.pricePerDay} ${pkg.currency}`,
    `Details: ${pkg.description}`,
  ].join('\n');
}

// --- Helper: Calls OpenAI Embeddings API to generate vector embeddings for a batch of texts ---
async function embedBatch(texts) {
  const res = await openai.embeddings.create({
    model: 'text-embedding-3-small', // 1536-dimensional embeddings
    input: texts,
  });
  return res.data.map(d => d.embedding);
}

async function main() {
  console.log('🔄 Reading policies from Firestore collection: insurances ...');

  // 1) Fetch all documents from the "insurances" collection in Firestore
  const snap = await db.collection('insurances').get();
  if (snap.empty) {
    console.log('⚠️ No documents found in "insurances".');
    return;
  }

  // 2) Convert Firestore docs to JS objects
  const rows = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  console.log(`✅ Found ${rows.length} policies.`);

  // 3) Convert each insurance policy to text for embedding
  const texts = rows.map(toText);

  // 4) Generate embeddings in batches to avoid exceeding API limits
  const BATCH = 64;
  const datapoints = [];

  for (let i = 0; i < texts.length; i += BATCH) {
    const part = texts.slice(i, i + BATCH);
    const embs = await embedBatch(part);
    for (let j = 0; j < embs.length; j++) {
      datapoints.push({ id: rows[i + j].id, vec: embs[j] });
    }
    console.log(`🧠 Embedded ${Math.min(i + BATCH, texts.length)}/${texts.length}`);
  }

  // 5) Upsert (insert or update) embeddings into Vertex AI Matching Engine
  // Using STREAM_UPDATE, so no LRO (long-running operation) is returned
  console.log('⬆️ Upserting embeddings to Matching Engine...');
  await indexClient.upsertDatapoints({
    index: INDEX_RESOURCE_NAME,
    datapoints: datapoints.map(d => ({
      datapointId: d.id,
      featureVector: d.vec,
    })),
  });

  console.log('✅ Upsert complete. Firestore remains the single source of truth.');
}

// --- Run main() and catch any errors ---
main().catch(err => {
  console.error('❌ Ingest error:', err);
  process.exit(1);
});
