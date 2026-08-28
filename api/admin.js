import { cors, find, findOne, insert, update, remove } from './mongo.js';

const USERS = 'user';
const ROLES = 'role';
const IMPORTS = 'import';
const PULLS = 'force-pull';
const APIS = 'api-key';
const AUDIT = 'audit';

const now = () => new Date().toISOString();
const typeRows = async (type) => find('admin_records', { type }, { sort: { id: 1 } });
const audit = async (event, entity, entityId, meta = {}) => insert('admin_records', {
  type: AUDIT, event, entity, entityId, meta, at: now(), actor: 'demo-admin',
});
const bad = (res, message) => res.status(422).json({ error: message });

export default async function handler(req, res) {
  if (cors(req, res)) return;
  try {
    const action = req.query.action || req.body?.action;
    if (req.method === 'GET') {
      if (action === 'dashboard') {
        const apis = await typeRows(APIS);
        const pulls = await typeRows(PULLS);
        return res.json({
          cards: { apiKeys: apis.length, activeKeys: apis.filter((r) => r.status === 'Active').length, pulls: pulls.length, failedImports: (await typeRows(IMPORTS)).filter((r) => r.status === 'Failure').length },
          hits: [112, 354, 88, 90, 91, 90, 87, 91, 12, 169, 89, 92],
          topApis: [{ label: 'eretail/v3/sku/inventoryStatus', value: 78 }, { label: 'eretail/v1/orders/validate', value: 16 }, { label: 'eretail/v1/order/orderPull', value: 3 }, { label: 'eretail/v1/order/orderreturn', value: 3 }],
        });
      }
      const type = String(req.query.type || '');
      if (!type) return bad(res, 'Record type is required');
      const rows = await typeRows(type);
      return res.json(rows);
    }
    if (req.method === 'POST') {
      if (action === 'force-pull') {
        const { location, orders, addWhHo } = req.body;
        if (!location) return bad(res, 'Location is Mandatory');
        const orderList = String(orders || '').toUpperCase().split(',').map((s) => s.trim()).filter(Boolean);
        if (!orderList.length) return bad(res, 'Order Number is Mandatory');
        if (orderList.length > 20) return bad(res, 'Max 20 order numbers are allowed');
        const record = await insert('admin_records', { type: PULLS, location, orders: orderList, addWhHo: !!addWhHo, status: 'Completed', createdAt: now() });
        await audit('Orders Pulled Successfully', PULLS, record.id, { location, count: orderList.length });
        return res.status(201).json(record);
      }
      const { type, ...payload } = req.body;
      if (![USERS, ROLES, IMPORTS, APIS].includes(type)) return bad(res, 'Unsupported Admin record type');
      if (type === USERS) {
        if (!payload.username || !payload.firstName || !payload.lastName || !payload.title) return bad(res, 'User Name, First Name, Last Name and Title are Mandatory');
        const duplicate = (await typeRows(USERS)).find((u) => u.username?.toLowerCase() === payload.username.toLowerCase());
        if (duplicate) return res.status(409).json({ error: 'User Name already exists' });
      }
      if (type === ROLES && (!payload.roleType || !payload.description)) return bad(res, 'Role Type and Description are Mandatory');
      if (type === IMPORTS && (!payload.importType || !payload.fileName)) return bad(res, 'Import Type and Upload Template are Mandatory');
      if (type === APIS) {
        if (!payload.apiKey || !payload.owner || !payload.expiryDate) return bad(res, 'API Key, API Owner and Expiry Date are Mandatory');
        const duplicate = (await typeRows(APIS)).find((api) => api.apiKey === payload.apiKey);
        if (duplicate) return res.status(409).json({ error: 'API Key already exists' });
      }
      const record = await insert('admin_records', { type, ...payload, status: payload.status || 'Active', createdAt: now(), version: 1 });
      await audit('Created', type, record.id);
      return res.status(201).json(record);
    }
    if (req.method === 'PUT') {
      const { id, type, version, ...payload } = req.body;
      const record = await findOne('admin_records', { id });
      if (!record || (type && record.type !== type)) return res.status(404).json({ error: 'Admin record not found' });
      if (version != null && record.version != null && Number(version) !== Number(record.version)) return res.status(409).json({ error: 'Record was changed by another user. Refresh and try again.' });
      // The list/editor deliberately receive a masked key. Do not let that
      // display value overwrite the stored key when another API field changes.
      if (record.type === APIS && typeof payload.apiKey === 'string' && payload.apiKey.includes('X')) payload.apiKey = record.apiKey;
      const rows = await update('admin_records', id, { ...payload, version: (record.version || 0) + 1, updatedAt: now() });
      await audit('Updated', record.type, id);
      const updated = rows[0];
      return res.json(updated);
    }
    if (req.method === 'DELETE') {
      const { id, type } = req.body;
      const record = await findOne('admin_records', { id });
      if (!record || (type && record.type !== type)) return res.status(404).json({ error: 'Admin record not found' });
      await remove('admin_records', id);
      await audit('Deleted', record.type, id);
      return res.json({ ok: true });
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Admin API error:', error);
    res.status(500).json({ error: error.message || 'Unexpected Admin API error' });
  }
}
