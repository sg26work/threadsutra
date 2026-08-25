import { find, findOne, insert, update, cors } from './mongo.js';
const M = 'oms-rule', text = (v) => String(v ?? '').trim();
export default async function handler(req, res) {
  if (cors(req, res)) return;
  try {
    const list = await find('generic_records', { module: M });
    if (req.method === 'GET') {
      const type = text(req.query?.type), active = text(req.query?.active);
      return res.status(200).json({ rows: list.filter((r) => (!type || r.rule_type === type) && (active !== 'true' || r.status === 'Active')).sort((a, b) => Number(a.priority) - Number(b.priority)), clients: ['0-DummyClient'], locations: await find('generic_records', { module: 'location' }), channels: await find('channels', {}) });
    }
    if (req.method === 'POST' || req.method === 'PUT') {
      const b = req.body, ruleType = text(b.rule_type), name = text(b.name), priority = Math.max(1, Number(b.priority) || 1);
      if (!['validation', 'routing', 'return', 'seller', 'shipping', 'allocation'].includes(ruleType) || !name) return res.status(400).json({ error: 'Rule Name is mandatory.' });
      const current = req.method === 'PUT' ? await findOne('generic_records', { id: Number(b.id) }) : null;
      if (req.method === 'PUT' && (!current || current.module !== M)) return res.status(404).json({ error: 'OMS Rule not found.' });
      const doc = { module: M, code: current?.code || `OMS-${Date.now()}`, name, rule_type: ruleType, priority, status: b.active === false ? 'Inactive' : 'Active', channel_type: text(b.channel_type), channel: text(b.channel), event: text(b.event), apply_to_all: Boolean(b.apply_to_all), check_inventory: Boolean(b.check_inventory), priority_type: text(b.priority_type), location_tag: text(b.location_tag), location: text(b.location), client: text(b.client), document_type: text(b.document_type), rule_direction: text(b.rule_direction) };
      if (req.method === 'POST') return res.status(201).json(await insert('generic_records', doc));
      return res.status(200).json((await update('generic_records', current.id, doc))[0]);
    }
    if (req.method === 'PATCH') {
      const current = await findOne('generic_records', { id: Number(req.body.id) }); if (!current || current.module !== M) return res.status(404).json({ error: 'OMS Rule not found.' });
      return res.status(200).json((await update('generic_records', current.id, { priority: Math.max(1, Number(req.body.priority) || current.priority), status: req.body.active === undefined ? current.status : req.body.active ? 'Active' : 'Inactive' }))[0]);
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) { console.error('oms rules error:', error); return res.status(500).json({ error: error.message }); }
}
