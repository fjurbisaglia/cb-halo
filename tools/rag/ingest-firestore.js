import 'dotenv/config';
import OpenAI from 'openai';
import admin from 'firebase-admin';
import aiplatform from '@google-cloud/aiplatform';

const {
  OPENAI_API_KEY,
  GCP_PROJECT,
  GCP_LOCATION = 'us-central1',
  INDEX_RESOURCE_NAME
} = process.env;

if (!OPENAI_API_KEY) throw new Error('Missing OPENAI_API_KEY');
if (!GCP_PROJECT) throw new Error('Missing GCP_PROJECT');
if (!INDEX_RESOURCE_NAME) throw new Error('Missing INDEX_RESOURCE_NAME');

// Firestore via ADC
if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const { v1 } = aiplatform;
const indexClient = new v1.IndexServiceClient({
  apiEndpoint: `${GCP_LOCATION}-aiplatform.googleapis.com`,
});

// Construye texto corto por póliza (sin chunking)
function toText(pkg) {
  // Espera campos: id, name, description, pricePerDay, currency, coverageMedical, region
  return [
    `Plan: ${pkg.name}`,
    `Region: ${pkg.region}`,
    `Medical Coverage: ${pkg.coverageMedical} ${pkg.currency}`,
    `Price/Day: ${pkg.pricePerDay} ${pkg.currency}`,
    `Details: ${pkg.description}`,
  ].join('\n');
}

async function embedBatch(texts) {
  const res = await openai.embeddings.create({
    model: 'text-embedding-3-small', // 1536 dims
    input: texts,
  });
  return res.data.map(d => d.embedding);
}

async function main() {
  console.log('🔄 Reading policies from Firestore collection: insurances ...');
  const snap = await db.collection('insurances').get();
  if (snap.empty) {
    console.log('⚠️ No documents found in "insurances".');
    return;
  }

  const rows = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  console.log(`✅ Found ${rows.length} policies.`);

  const texts = rows.map(toText);

  // Embeddings en lotes
  const BATCH = 64;
  const datapoints = [];
  for (let i = 0; i < texts.length; i += BATCH) {
    const part = texts.slice(i, i + BATCH);
    const embs = await embedBatch(part);
    for (let j = 0; j < embs.length; j++) {
      const idx = i + j;
      datapoints.push({ id: rows[idx].id, vec: embs[j] });
    }
    console.log(`🧠 Embedded ${Math.min(i + BATCH, texts.length)}/${texts.length}`);
  }

  // Upsert en Matching Engine (STREAM_UPDATE: NO devuelve LRO; no usar op.promise())
  console.log('⬆️ Upserting embeddings to Matching Engine...');
  await indexClient.upsertDatapoints({
    index: INDEX_RESOURCE_NAME,
    datapoints: datapoints.map(d => ({
      datapointId: d.id,
      featureVector: d.vec,
    })),
  });
  console.log('✅ Upsert complete.');

  // Espejo en Firestore para reconstruir contexto (colección me_chunks)
  console.log('🪞 Mirroring to me_chunks ...');
  const batch = db.batch();
  datapoints.forEach((d, k) => {
    const pkg = rows.find(r => r.id === d.id);
    const ref = db.collection('me_chunks').doc(d.id);
    batch.set(ref, {
      insuranceId: d.id,
      text: texts[k],
      name: pkg?.name ?? '',
      region: pkg?.region ?? '',
      coverageMedical: pkg?.coverageMedical ?? 0,
      currency: pkg?.currency ?? 'EUR',
      pricePerDay: pkg?.pricePerDay ?? 0,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });
  await batch.commit();
  console.log('✅ Mirror created in me_chunks.');
}

main().catch(err => {
  console.error('❌ Ingest error:', err);
  process.exit(1);
});
