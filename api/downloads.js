import { find, insert, update, remove, cors } from './mongo.js';

// Download history store.
// GET    /api/downloads            -> list (newest first)
// POST   /api/downloads            -> record a download { filename, format, module, row_count, size, content }
// DELETE /api/downloads  { id }    -> remove one   (or { all:true } to clear)
export default async function handler(req, res) {
  if (cors(req, res)) return;
  try {
    if (req.method === 'GET') {
      const rows = await find('downloads', {}, { sort: { id: -1 } });
      return res.status(200).json(rows);
    }
    if (req.method === 'POST') {
      const { filename, format, module, row_count, size, content, mime, exported_by, status } = req.body;
      const doc = await insert('downloads', {
        filename, format, module: module || '—', row_count: row_count || 0,
        size: size || 0, content: content || '', mime: mime || 'text/plain',
        exported_by: exported_by || 'system', status: status || 'Completed',
        created_at: new Date().toISOString(),
      });
      return res.status(201).json(doc);
    }
    if (req.method === 'PUT') {
      const { id, ...fields } = req.body;
      const rows = await update('downloads', id, fields);
      return res.status(200).json(rows[0]);
    }
    if (req.method === 'DELETE') {
      const { id, all } = req.body;
      if (all) {
        const rows = await find('downloads', {});
        for (const r of rows) await remove('downloads', r.id);
        return res.status(200).json({ ok: true, cleared: rows.length });
      }
      await remove('downloads', id);
      return res.status(200).json({ ok: true });
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('downloads error:', err);
    res.status(500).json({ error: err.message });
  }
}
