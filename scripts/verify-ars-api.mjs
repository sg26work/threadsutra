const base = 'http://127.0.0.1:3002/api';

async function request(path, method = 'GET', body) {
  const response = await fetch(base + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  return { status: response.status, data };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const link = await request('/ars', 'POST', {
  entity: 'links', sku_code: 'BACKPACK-GRY', location: 'Mumbai WH', location_type: 'Warehouse',
  fulfilment_method: 'Distribution Centre', fulfilment_wh: 'Mumbai WH', wh_lead_time: 2,
  primary_vendor: 'V001', stock_cover_days: 10, ars_flag: 'Active',
});
assert(link.status === 201 && !('entity' in link.data), `link creation failed: ${JSON.stringify(link)}`);

const duplicate = await request('/ars', 'POST', { entity: 'links', ...link.data });
assert(duplicate.status === 409, `duplicate guard failed: ${JSON.stringify(duplicate)}`);

const invalid = await request('/ars', 'POST', {
  entity: 'rules', description: 'Invalid Min-Max', ars_method: 'Min-Max', vendor_type: 'Primary',
  output_type: 'Confirmed', location: 'Mumbai WH', start_date: '2026-01-01', status: 'Pending',
  frequency: 24, minimum_qty: 10, maximum_qty: 5, sku_sets: [{ type: 'SKU', operand: 'Equals', value: 'BACKPACK-GRY' }],
});
assert(invalid.status === 400, `Min-Max validation failed: ${JSON.stringify(invalid)}`);

const rule = await request('/ars', 'POST', {
  entity: 'rules', description: 'Verification Rule', remarks: 'End-to-end ARS verification', ars_method: 'Min-Max',
  vendor_type: 'Primary', output_type: 'Confirmed', location: 'Mumbai WH', locations: ['Mumbai WH', 'Delhi NCR'], start_date: '2026-01-01', end_date: '2027-12-31',
  status: 'Pending', frequency: 24, minimum_qty: 2, maximum_qty: 10,
  sku_sets: [{ type: 'SKU', operand: 'Equals', value: 'BACKPACK-GRY' }],
});
assert(rule.status === 201 && rule.data.locations?.length === 2 && !('entity' in rule.data), `multi-location rule creation failed: ${JSON.stringify(rule)}`);

const runPending = await request('/ars', 'PUT', { entity: 'rules', action: 'run', id: rule.data.id });
assert(runPending.status === 409, `pending run guard failed: ${JSON.stringify(runPending)}`);

const confirmed = await request('/ars', 'PUT', { entity: 'rules', action: 'confirm', id: rule.data.id });
assert(confirmed.status === 200 && confirmed.data.status === 'Active', `confirmation failed: ${JSON.stringify(confirmed)}`);

const run = await request('/ars', 'PUT', { entity: 'rules', action: 'run', id: rule.data.id });
assert(run.status === 200 && run.data.generated_orders === 1 && run.data.status === 'Document Generated', `rule execution failed: ${JSON.stringify(run)}`);

const orders = await request('/purchase-orders');
const generated = orders.data.find((row) => row.ars_rule_id === rule.data.rule_id);
assert(generated && generated.status === 'Confirmed' && generated.qty === 10 && generated.line_items[0].sku_code === 'BACKPACK-GRY', 'generated PO was not synchronized correctly');

const deletedActive = await request('/ars', 'DELETE', { entity: 'rules', id: rule.data.id });
assert(deletedActive.status === 409, `active delete guard failed: ${JSON.stringify(deletedActive)}`);

const settings = await request('/ars', 'PUT', { entity: 'settings', enable_ars: false, ros_calculation_hour: 2, lifetime: true, twelve_weeks: true, six_weeks: true, one_month: true, two_weeks: true });
assert(settings.status === 200 && settings.data.enable_ars === false, 'ARS settings update failed');
const disabledRun = await request('/ars', 'PUT', { entity: 'rules', action: 'run', id: rule.data.id });
assert(disabledRun.status === 409, `disabled ARS guard failed: ${JSON.stringify(disabledRun)}`);
await request('/ars', 'PUT', { entity: 'settings', ...settings.data, enable_ars: true });

const logs = await request('/ars?entity=logs');
assert(logs.status === 200 && logs.data.some((row) => row.rule_id === rule.data.rule_id && row.generated_po_codes.includes(generated.po_no)), 'execution log/PO relationship failed');

console.log(JSON.stringify({
  checks: 11,
  created_link: link.data.sku_code,
  rule_id: rule.data.rule_id,
  generated_po: generated.po_no,
  generated_qty: generated.qty,
  execution_status: run.data.status,
  blocked_paths: ['duplicate link', 'invalid min-max', 'run pending rule', 'delete active rule', 'run while disabled'],
}, null, 2));
