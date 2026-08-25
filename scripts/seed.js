// Manually (re)seed your MongoDB database with the starter data.
//   node scripts/seed.js            -> insert seed data if collections are empty
//   node scripts/seed.js --reset    -> wipe collections first, then reseed
//
// Requires MONGODB_URI in your .env. If it's not set, this just prints a note
// (the app will use the in-memory store instead).
import '../env.js';
import { SEED, COLLECTIONS } from '../api/_seed.js';

const URI = process.env.MONGODB_URI || '';
const DB_NAME = process.env.MONGODB_DB || 'eretail';
const RESET = process.argv.includes('--reset');

async function main() {
  if (!URI) {
    console.log('\n  ⚠  MONGODB_URI is not set in .env.');
    console.log('     The app will use its built-in in-memory store instead.');
    console.log('     To use a real database, add MONGODB_URI and run this again.\n');
    return;
  }
  const { MongoClient } = await import('mongodb');
  const client = new MongoClient(URI);
  await client.connect();
  const db = client.db(DB_NAME);
  console.log(`\n  Connected to MongoDB database "${DB_NAME}"`);

  const counters = db.collection('_counters');
  for (const c of COLLECTIONS) {
    const col = db.collection(c);
    if (RESET) { await col.deleteMany({}); await counters.deleteOne({ _id: c }); }
    const count = await col.estimatedDocumentCount();
    if (count === 0) {
      const rows = SEED[c].map((row, i) => ({ id: i + 1, ...row }));
      if (rows.length) await col.insertMany(rows);
      await counters.updateOne({ _id: c }, { $set: { seq: rows.length } }, { upsert: true });
      console.log(`   ✓ ${c}: inserted ${rows.length} rows`);
    } else {
      console.log(`   • ${c}: already has ${count} rows (skipped)`);
    }
  }
  await client.close();
  console.log('\n  Done! Your MongoDB is ready. 🎉\n');
}

main().catch((e) => { console.error('Seed failed:', e.message); process.exit(1); });
