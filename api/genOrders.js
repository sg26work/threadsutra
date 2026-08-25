// Deterministic generator for a rich, analytical order dataset (order + line
// level) used by the dashboard aggregations. Generated relative to "now" so the
// Last 7/14/30-day windows always contain data. Deterministic via a seeded PRNG
// so results are stable within a process/run.

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PLATFORMS = [
  { name: 'Amazon', w: 22 }, { name: 'Flipkart', w: 20 }, { name: 'Myntra', w: 14 },
  { name: 'Shopify', w: 10 }, { name: 'Website', w: 12 }, { name: 'Nykaa', w: 8 },
  { name: 'Ajio', w: 8 }, { name: 'Meesho', w: 6 },
];

const SKUS = [
  { sku: 'TSHIRT-BLK-M', price: 1299 }, { sku: 'JEANS-BLU-32', price: 2499 },
  { sku: 'SNEAK-WHT-9', price: 3499 }, { sku: 'WATCH-SS-BLK', price: 5999 },
  { sku: 'EARBUD-TWS-01', price: 2999 }, { sku: 'BACKPACK-GRY', price: 1899 },
  { sku: 'SERUM-VITC-30', price: 899 }, { sku: 'KURTA-MAROON-L', price: 1599 },
  { sku: 'BOTTLE-STL-1L', price: 1199 }, { sku: 'LAMP-LED-DSK', price: 1499 },
  { sku: 'SUNGLASS-AVT', price: 1799 }, { sku: 'HOODIE-NVY-XL', price: 1999 },
  { sku: 'CAP-RED-FS', price: 599 }, { sku: 'SOCKS-PK3', price: 399 },
];

const LOCATIONS = ['UWH-JX Karawaci', 'A01-Delhi WH', 'CHE-CHE'];

const STATUSES = [
  { s: 'Delivered', w: 26 }, { s: 'Shipped', w: 18 }, { s: 'Ready to Ship', w: 10 },
  { s: 'Confirmed', w: 12 }, { s: 'Pending', w: 10 }, { s: 'Cancelled', w: 6 },
  { s: 'Failed', w: 18 },
];

function weightedPick(rand, arr, key = 'w') {
  const total = arr.reduce((a, b) => a + b[key], 0);
  let r = rand() * total;
  for (const item of arr) { r -= item[key]; if (r <= 0) return item; }
  return arr[arr.length - 1];
}

export function generateOrders(count = 320, seed = 20260722) {
  const rand = mulberry32(seed);
  const now = new Date();
  const orders = [];
  let seq = 100000;

  for (let i = 0; i < count; i++) {
    // Recent-weighted day within last 34 days
    const daysAgo = Math.floor(Math.pow(rand(), 1.7) * 34);
    const d = new Date(now); d.setDate(d.getDate() - daysAgo); d.setHours(9 + Math.floor(rand() * 10), Math.floor(rand() * 60), 0, 0);
    const dateISO = d.toISOString();
    const dateKey = dateISO.slice(0, 10);

    const platform = weightedPick(rand, PLATFORMS, 'w').name;
    const location = LOCATIONS[Math.floor(rand() * LOCATIONS.length)];
    const status = weightedPick(rand, STATUSES, 'w').s;
    const payment_mode = rand() < 0.2 ? 'COD' : 'Prepaid';

    // lines
    const lineCount = 1 + Math.floor(Math.pow(rand(), 2) * 3); // mostly 1
    const usedSku = new Set();
    const lines = [];
    for (let l = 0; l < lineCount; l++) {
      let pick = SKUS[Math.floor(rand() * SKUS.length)];
      let guard = 0;
      while (usedSku.has(pick.sku) && guard++ < 5) pick = SKUS[Math.floor(rand() * SKUS.length)];
      usedSku.add(pick.sku);
      const qty = 1 + Math.floor(rand() * 3);
      const discount = rand() < 0.25 ? Math.round(pick.price * qty * (0.05 + rand() * 0.1)) : 0;
      const amount = pick.price * qty - discount;
      // line-level fulfillability
      const unfulfillable = (status === 'Pending' || status === 'Confirmed') && rand() < 0.18;
      lines.push({ sku: pick.sku, qty, price: pick.price, discount, amount, unfulfillable });
    }

    const qty = lines.reduce((a, b) => a + b.qty, 0);
    const grossAmount = lines.reduce((a, b) => a + b.amount, 0);
    const discount = lines.reduce((a, b) => a + b.discount, 0);
    const unfulfillableLines = lines.filter((l) => l.unfulfillable).length;
    const unfulfillable = unfulfillableLines > 0;

    const isValid = status !== 'Failed' && status !== 'Cancelled';
    const pending = status === 'Pending' || status === 'Confirmed';
    const pending_stock_qty = pending && rand() < 0.5 ? Math.min(qty, 1 + Math.floor(rand() * 3)) : 0;
    // SLA breach: not-yet-shipped orders older than 2 days
    const sla_breached = isValid && ['Confirmed', 'Pending', 'Ready to Ship'].includes(status) && daysAgo >= 2 && rand() < 0.6;
    const fulfilment_status = rand() < 0.92 ? 'Online' : 'Offline';

    orders.push({
      order_no: 'WO' + (seq++),
      external_order_no: platform.slice(0, 2).toUpperCase() + '-' + Math.floor(100000 + rand() * 899999),
      platform, location, order_date: dateISO, date_key: dateKey,
      status, fulfilment_status, payment_mode,
      lines, lines_count: lines.length, qty,
      amount: isValid ? grossAmount : 0, // failed/cancelled contribute 0 revenue
      gross_amount: grossAmount, discount,
      pending, pending_stock_qty, unfulfillable, unfulfillable_lines: unfulfillableLines,
      sla_breached, failed: status === 'Failed', cancelled: status === 'Cancelled',
      valid: isValid,
    });
  }
  // newest first
  orders.sort((a, b) => (a.order_date < b.order_date ? 1 : -1));
  return orders;
}

export const DASH_ORDERS = generateOrders();
