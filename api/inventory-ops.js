import { find, findOne, insert, update, cors } from './mongo.js';

const collections = { moves: 'inventory_moves', history: 'inventory_moves', scan: 'inventory_moves', intercompany: 'inventory_moves', lottables: 'inventory_lottables', 'bulk-lottables': 'inventory_lottables', adjustments: 'stock_adjustments', gatepass: 'outbound_gate_passes', 'outbound-gate-pass': 'outbound_gate_passes', memo: 'outbound_memos', 'outbound-memo': 'outbound_memos', transactions: 'sku_transactions', 'sku-transaction-history': 'sku_transactions', lots: 'sku_lot_transfers', 'sku-lot-transfer': 'sku_lot_transfers' };
const text = (v) => String(v ?? '').trim();
const today = () => new Date().toISOString();

export default async function handler(req, res) {
  if (cors(req, res)) return;
  try {
    const entity = text(req.query.entity || req.body?.entity) || 'view';
    if (req.method === 'GET') return res.status(200).json(entity === 'view' ? await find('inventory', {}, { sort: { id: 1 } }) : await find(collections[entity] || entity, {}, { sort: { id: -1 } }));
    const body = req.body || {};
    if (entity === 'moves' || entity === 'scan' || entity === 'intercompany') {
      const qty = Number(body.quantity); if (!text(body.sku_code) || !text(body.from_warehouse) || !text(body.to_warehouse) || !Number.isFinite(qty) || qty <= 0) return res.status(400).json({ error: 'SKU, source, destination and a positive quantity are required.' });
      const source = await findOne('inventory', { sku_code: body.sku_code, warehouse: body.from_warehouse }); if (!source || Number(source.available) < qty) return res.status(409).json({ error: 'Insufficient available inventory at source location.' });
      const target = await findOne('inventory', { sku_code: body.sku_code, warehouse: body.to_warehouse });
      await update('inventory', source.id, { available: Number(source.available) - qty, on_hand: Number(source.on_hand) - qty });
      if (target) await update('inventory', target.id, { available: Number(target.available) + qty, on_hand: Number(target.on_hand) + qty });
      else { const { id: _sourceId, ...copy } = source; await insert('inventory', { ...copy, warehouse: body.to_warehouse, available: qty, reserved: 0, on_hand: qty }); }
      return res.status(201).json(await insert('inventory_moves', { operation: entity, sku_code: body.sku_code, from_warehouse: body.from_warehouse, to_warehouse: body.to_warehouse, quantity: qty, reference: text(body.reference), status: 'Completed', created_at: today() }));
    }
    if (entity === 'adjustments') {
      const row = await findOne('inventory', { id: Number(body.inventory_id) }); const quantity = Number(body.quantity); if (!row || !Number.isFinite(quantity) || quantity === 0) return res.status(400).json({ error: 'Inventory record and non-zero adjustment are required.' });
      if (Number(row.available) + quantity < 0) return res.status(409).json({ error: 'Adjustment cannot reduce available inventory below zero.' });
      await update('inventory', row.id, { available: Number(row.available) + quantity, on_hand: Number(row.on_hand) + quantity });
      return res.status(201).json(await insert('stock_adjustments', { inventory_id: row.id, sku_code: row.sku_code, warehouse: row.warehouse, quantity, reason: text(body.reason), status: 'Completed', created_at: today() }));
    }
    if (!collections[entity]) return res.status(400).json({ error: 'Unknown inventory operation.' });
    if (!text(body.sku_code) && !['gatepass', 'memo'].includes(entity)) return res.status(400).json({ error: 'SKU is required.' });
    return res.status(201).json(await insert(collections[entity], { ...body, entity, status: body.status || 'Pending', created_at: today() }));
  } catch (error) { res.status(error.statusCode || 500).json({ error: error.message || 'Inventory operation failed.' }); }
}
