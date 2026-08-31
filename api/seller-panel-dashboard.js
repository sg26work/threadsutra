export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const selectMode = String(req.body?.selectMode || '1');
  if (!['1', '7', '2'].includes(selectMode)) return res.status(422).json({ error: 'Invalid seller mode' });
  return res.json({ selectMode, counts: { confirmed: 0, readyForShip: 0, shipped: 0, returned: 0, cancelled: 0 }, replenishment: [], topSold: [] });
}
