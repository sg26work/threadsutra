// ============================================================================
//  Data layer — MongoDB with an automatic in-memory fallback.
//
//  If MONGODB_URI is set, all data is read/written to your MongoDB Atlas
//  cluster. Collections are auto-seeded on first run if empty.
//
//  If MONGODB_URI is NOT set (or the connection fails), the app transparently
//  uses an in-memory store seeded with the same data, so it always works.
//
//  Every collection uses a numeric `id` field (auto-incremented) so the
//  frontend contract is identical to the previous backend.
// ============================================================================
import { MongoClient } from 'mongodb';
import { SEED } from './seed.js';

const URI = process.env.MONGODB_URI || '';
const DB_NAME = process.env.MONGODB_DB || 'eretail';
const COLLECTIONS = Object.keys(SEED);

let mode = 'memory';        // 'mongo' | 'memory'
let clientPromise = null;   // Promise<Db>
let mem = null;             // in-memory store: { collection: [rows] }
let memSeq = {};            // per-collection id counter (memory mode)

// ---- In-memory store ----
function initMemory() {
  if (mem) return;
  mem = {};
  memSeq = {};
  for (const c of COLLECTIONS) {
    mem[c] = SEED[c].map((row, i) => ({ id: i + 1, ...row }));
    memSeq[c] = SEED[c].length;
  }
}

// ---- Mongo connection (lazy, cached) ----
async function getDb() {
  if (clientPromise) return clientPromise;
  clientPromise = (async () => {
    const client = new MongoClient(URI, { serverSelectionTimeoutMS: 8000 });
    await client.connect();
    const db = client.db(DB_NAME);
    // Seed any empty collection + ensure a counters doc for id generation
    for (const c of COLLECTIONS) {
      const col = db.collection(c);
      const count = await col.countDocuments();
      if (count === 0) {
        const docs = SEED[c].map((row, i) => ({ id: i + 1, ...row }));
        if (docs.length) await col.insertMany(docs);
        await db.collection('_counters').updateOne(
          { _id: c }, { $set: { seq: SEED[c].length } }, { upsert: true }
        );
      } else {
        // make sure counter is at least the max id present
        const top = await col.find().sort({ id: -1 }).limit(1).toArray();
        const maxId = top[0]?.id || count;
        await db.collection('_counters').updateOne(
          { _id: c }, { $max: { seq: maxId } }, { upsert: true }
        );
      }
    }
    return db;
  })();
  return clientPromise;
}

async function nextId(db, c) {
  const r = await db.collection('_counters').findOneAndUpdate(
    { _id: c }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: 'after' }
  );
  const doc = r.value || r; // driver version differences
  return doc.seq;
}

// Initialize: try Mongo if a URI exists, else memory.
let ready = (async () => {
  if (URI) {
    try {
      await getDb();
      mode = 'mongo';
      console.log('[data] Connected to MongoDB (' + DB_NAME + ')');
      return;
    } catch (e) {
      console.warn('[data] MongoDB connection failed, using in-memory store:', e.message);
    }
  } else {
    console.log('[data] MONGODB_URI not set — using in-memory store');
  }
  initMemory();
})();

function stripId(doc) {
  if (!doc) return doc;
  const { _id, ...rest } = doc;
  return rest;
}

// Simple equality-based matcher for memory mode.
function matches(row, query) {
  return Object.entries(query || {}).every(([k, v]) => row[k] === v);
}

// ---------------------------------------------------------------- public API
export function getMode() { return mode; }

export async function find(collection, query = {}, { sort } = {}) {
  if (collection === 'products') collection = 'skus';
  await ready;
  if (mode === 'mongo') {
    const db = await getDb();
    let cur = db.collection(collection).find(query);
    if (sort) cur = cur.sort(sort);
    const docs = await cur.toArray();
    return docs.map(stripId);
  }
  let rows = mem[collection].filter((r) => matches(r, query));
  if (sort) {
    const [field, dir] = Object.entries(sort)[0];
    rows = [...rows].sort((a, b) => (a[field] > b[field] ? 1 : -1) * dir);
  }
  return rows.map((r) => ({ ...r }));
}

export async function findOne(collection, query = {}) {
  const rows = await find(collection, query);
  return rows[0] || null;
}

export async function insert(collection, doc) {
  await ready;
  if (mode === 'mongo') {
    const db = await getDb();
    const id = await nextId(db, collection);
    const full = { id, ...doc };
    if (full.id == null) full.id = id;
    await db.collection(collection).insertOne(full);
    return stripId(full);
  }
  const id = ++memSeq[collection];
  const full = { id, ...doc };
  if (full.id == null) full.id = id;
  mem[collection].push(full);
  return { ...full };
}

// Update by matching numeric id(s). ids can be a single id or an array.
export async function update(collection, ids, fields) {
  await ready;
  const list = Array.isArray(ids) ? ids : [ids];
  if (mode === 'mongo') {
    const db = await getDb();
    await db.collection(collection).updateMany({ id: { $in: list } }, { $set: fields });
    const docs = await db.collection(collection).find({ id: { $in: list } }).toArray();
    return docs.map(stripId);
  }
  const updated = [];
  mem[collection] = mem[collection].map((r) => {
    if (list.includes(r.id)) { const n = { ...r, ...fields }; updated.push(n); return n; }
    return r;
  });
  return updated.map((r) => ({ ...r }));
}

// Update rows matching an arbitrary query (used e.g. by GRN -> PO close).
export async function updateWhere(collection, query, fields) {
  await ready;
  if (mode === 'mongo') {
    const db = await getDb();
    await db.collection(collection).updateMany(query, { $set: fields });
    return;
  }
  mem[collection] = mem[collection].map((r) => (matches(r, query) ? { ...r, ...fields } : r));
}

export async function remove(collection, id) {
  await ready;
  if (mode === 'mongo') {
    const db = await getDb();
    await db.collection(collection).deleteOne({ id });
    return { ok: true };
  }
  mem[collection] = mem[collection].filter((r) => r.id !== id);
  return { ok: true };
}

// CORS + JSON helper shared by all routes.
export function cors(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.status(204).end(); return true; }
  return false;
}
