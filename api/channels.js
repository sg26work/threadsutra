import { find, insert, update, remove, cors } from './mongo.js';

// Manage Channels / Channel Enquiry
export default async function handler(req, res) {
  if (cors(req, res)) return;
  try {
    if (req.method === 'GET') {
      const rows = await find('channels', {}, { sort: { id: 1 } });
      return res.status(200).json(rows);
    }
    if (req.method === 'POST') {
      const b = req.body;
      if (b.REQ_SEARCH_FLAG) {
        let filters = {};
        try { filters = typeof b.vnfDataString === 'string' ? JSON.parse(b.vnfDataString) : (b.filters || {}); } catch { return res.status(400).json({ error: 'Invalid channel search filters.' }); }
        const has = (value, query) => !String(query ?? '').trim() || String(value ?? '').toLowerCase().includes(String(query).trim().toLowerCase());
        const status = String(filters.param4 ?? ''); const fulfilment = String(filters.param7 ?? '');
        const filtered = (await find('channels', {}, { sort: { id: -1 } })).filter((row) =>
          has(row.channel_code, filters.param1) && has(row.channel_name, filters.param2)
          && (!status || status === '-1' || (status === '1' ? row.status === 'Active' : status === '0' ? row.status === 'Inactive' : has(row.status, status)))
          && has(row.channel_type, filters.param5) && has(row.brand_code || row.brand, filters.param8)
          && has(row.location, b.param6 ?? filters.param6) && (!fulfilment || fulfilment === '-1' || (fulfilment === '1' ? row.fulfilment_status === 'Online' : fulfilment === '0' ? row.fulfilment_status === 'Offline' : has(row.fulfilment_status, fulfilment)))
          && has(row.channel_group_code, filters.param17));
        const size = [20, 50, 100, 200].includes(Number(b.rows)) ? Number(b.rows) : 20;
        const page = Math.max(1, Number(b.page) || 1); const records = filtered.length; const total = Math.ceil(records / size);
        const gridModel = filtered.slice((page - 1) * size, page * size);
        return res.status(200).json({ commonSearchDTOList: gridModel, gridModel, rows: gridModel, page, records, total, sidx: String(b.sidx || ''), sord: String(b.sord || 'desc') });
      }
      if (!String(b.channel_code || '').trim() || !String(b.channel_name || '').trim()) return res.status(400).json({ error: 'Channel Code and Channel Name are required.' });
      if (Number(b.inventory_percentage || 0) > 100) return res.status(400).json({ error: 'Channel Inventory Percentage can not be greater than 100.' });
      if ((await find('channels')).some((row) => String(row.channel_code).toLowerCase() === String(b.channel_code).trim().toLowerCase())) return res.status(409).json({ error: 'Channel Code already exists.' });
      const { REQ_SEARCH_FLAG: _search, vnfDataString: _filters, key: _key, rows: _rows, page: _page, sidx: _sidx, sord: _sord, ...channelFields } = b;
      const doc = await insert('channels', {
        ...channelFields,
        channel_code: b.channel_code, channel_name: b.channel_name,
        brand: b.brand || 'custom', channel_type: b.channel_type || 'Marketplace',
        fulfilment_status: b.fulfilment_status || 'Online', status: b.status || 'Active',
        location: b.location || 'UWH-JX Karawaci', brand_code: b.brand_code || '',
        registration_date: b.registration_date || new Date().toISOString(),
        channel_configured: b.channel_configured || 'No',
      });
      return res.status(201).json(doc);
    }
    if (req.method === 'PUT') {
      const { id, ...fields } = req.body;
      const rows = await update('channels', id, fields);
      return res.status(200).json(rows[0]);
    }
    if (req.method === 'DELETE') {
      const { id } = req.body;
      return res.status(200).json(await remove('channels', id));
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('channels error:', err);
    res.status(500).json({ error: err.message });
  }
}
