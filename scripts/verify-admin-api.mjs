const base = 'http://127.0.0.1:3002/api/admin';
const request = async (path = '', method = 'GET', body) => {
  const response = await fetch(`${base}${path}`, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
  return { status: response.status, data: await response.json() };
};
const assert = (value, message) => { if (!value) throw new Error(message); };
let checks = 0;
const ok = (value, message) => { assert(value, message); checks += 1; };

const users = await request('?type=user');
ok(users.status === 200 && users.data.length >= 19, 'seeded User Enquiry data did not load');
ok(users.data.some((row) => row.username === '09curefit' && row.status === 'InActive'), 'recorded inactive user is absent');

const audit = await request('?type=audit');
ok(audit.status === 200 && audit.data.some((row) => row.processGroup === 'Vendor Maintenance' && row.action === 'UPDATE'), 'recorded Audit Logs rows did not load');
ok(audit.data.some((row) => row.processGroup === 'SKU Maintenance' && row.action === 'INSERT'), 'recorded SKU Audit Logs rows did not load');

const apis = await request('?type=api-key');
ok(apis.status === 200 && apis.data.length === 6, 'Manage API seed list is incorrect');
const inactiveSa = apis.data.find((row) => row.owner === 'sa' && row.status === 'Inactive');
const activated = await request('', 'PUT', { ...inactiveSa, status: 'Active' });
ok(activated.status === 200 && activated.data.status === 'Active', 'Inactive API key did not activate');
ok((await request('?type=api-key')).data.find((row) => row.id === inactiveSa.id).status === 'Active', 'activated API key did not persist');

const firstApi = (await request('?type=api-key')).data[0];
const changed = await request('', 'PUT', { ...firstApi, permissions: firstApi.permissions.map((permission, index) => index === 0 ? { ...permission, access: true, locations: ['1mg'] } : permission) });
ok(changed.status === 200 && changed.data.permissions[0].access && changed.data.permissions[0].locations.includes('1mg'), 'API access-right and location changes did not persist');
const stale = await request('', 'PUT', { ...firstApi, owner: 'stale-write' });
ok(stale.status === 409, 'stale API edit did not receive version-conflict response');

const missingApi = await request('', 'POST', { type: 'api-key', apiKey: 'missing-fields' });
ok(missingApi.status === 422 && missingApi.data.error.includes('Mandatory'), 'API add required-field validation failed');
const forcePullMissing = await request('', 'POST', { action: 'force-pull', location: '', orders: '' });
ok(forcePullMissing.status === 422 && forcePullMissing.data.error === 'Location is Mandatory', 'Force Order Pull location validation failed');
const forcePullTooMany = await request('', 'POST', { action: 'force-pull', location: 'QA11', orders: Array.from({ length: 21 }, (_, index) => `O${index}`).join(',') });
ok(forcePullTooMany.status === 422 && forcePullTooMany.data.error.includes('Max 20'), 'Force Order Pull 20-order limit failed');

console.log(JSON.stringify({ checks, workflows: ['User Enquiry data/search source', 'Audit Logs data/search source', 'Manage API activation', 'Manage API rights/location persistence', 'stale-edit protection', 'validation paths'] }, null, 2));
