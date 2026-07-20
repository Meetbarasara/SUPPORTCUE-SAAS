/**
 * Atlas Vector Search Index Setup
 *
 *   npm run setup:vector-index
 *
 * Creates the `vector_index` that ragService expects, so retrieval uses
 * Atlas $vectorSearch instead of the in-memory cosine-similarity fallback.
 *
 * Atlas cannot build a search index on a collection that does not exist, so
 * this creates the `documentchunks` collection first when it is missing.
 * That means you can run this before uploading any documents.
 *
 * Safe to re-run: it reports and exits if the index already exists.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');

const COLLECTION = 'documentchunks';
const INDEX_NAME = 'vector_index'; // must match ragService.searchRelevantChunks
const DIMENSIONS = 768;            // must match embeddingService output

const definition = {
  fields: [
    { type: 'vector', path: 'embedding', numDimensions: DIMENSIONS, similarity: 'cosine' },
    { type: 'filter', path: 'companyId' }
  ]
};

async function main() {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not set.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 20000 });
  const db = mongoose.connection.db;
  console.log(`Connected to "${mongoose.connection.name}"`);

  const existing = await db.listCollections({ name: COLLECTION }).toArray();
  if (existing.length === 0) {
    await db.createCollection(COLLECTION);
    console.log(`Created empty collection "${COLLECTION}".`);
  }

  const coll = db.collection(COLLECTION);

  // Search indexes are managed via the $listSearchIndexes aggregation stage and
  // the driver's createSearchIndex() helper — not via db.command(), which
  // returns CommandNotFound on Atlas.
  const listIndexes = () => coll.aggregate([{ $listSearchIndexes: {} }]).toArray();

  let current;
  try {
    current = await listIndexes();
  } catch (err) {
    console.error('\nThis cluster does not support Atlas Search:');
    console.error(`  ${err.codeName || err.message}`);
    console.error('\nAtlas Vector Search is required. A local mongod does not support it.');
    process.exit(1);
  }

  const already = current.find(i => i.name === INDEX_NAME);
  if (already) {
    console.log(`Index "${INDEX_NAME}" already exists (status: ${already.status}, queryable: ${already.queryable}).`);
    if (already.status === 'READY' || already.queryable) {
      console.log('Nothing to do — retrieval is using $vectorSearch.');
      await mongoose.disconnect();
      return;
    }
  } else {
    if (typeof coll.createSearchIndex !== 'function') {
      console.error('\nThis MongoDB driver is too old to create search indexes.');
      console.error('Upgrade the driver, or create the index from the Atlas UI.');
      process.exit(1);
    }
    await coll.createSearchIndex({ name: INDEX_NAME, type: 'vectorSearch', definition });
    console.log(`Created "${INDEX_NAME}" on ${COLLECTION} (${DIMENSIONS} dims, cosine, filtered by companyId).`);
  }

  process.stdout.write('Waiting for it to finish building');
  const deadline = Date.now() + 5 * 60 * 1000;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 5000));
    const idx = (await listIndexes()).find(i => i.name === INDEX_NAME);
    if (idx && (idx.status === 'READY' || idx.queryable)) {
      console.log(`\nIndex is READY — retrieval will now use $vectorSearch.`);
      await mongoose.disconnect();
      return;
    }
    if (idx && idx.status === 'FAILED') {
      console.error(`\nIndex build FAILED. Check the Atlas Search tab for details.`);
      process.exit(1);
    }
    process.stdout.write('.');
  }

  console.log('\nStill building. It will become queryable on its own; re-run this to check.');
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
