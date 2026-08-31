import { chromium } from 'playwright';

const base = process.env.ERETAIL_BASE_URL || 'http://127.0.0.1:3011';
const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 623 } });
  await page.addInitScript(() => localStorage.setItem('vin_user', JSON.stringify({ username: 'grid-loading-verifier' })));
  const active = () => page.locator('[data-screen-frame][aria-hidden="false"]');
  await page.goto(`${base}/app/m/price-zone`, { waitUntil: 'domcontentloaded' });

  let releasePriceZone;
  const priceZoneGate = new Promise((resolve) => { releasePriceZone = resolve; });
  await page.route('**/api/price-zones', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    await priceZoneGate;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ gridModel: [], rows: [], page: 0, total: 0, records: 0 }) });
  });
  await active().getByRole('button', { name: 'Search', exact: true }).click();
  const blocker = page.locator('[data-global-blocking="true"]');
  await blocker.waitFor({ state: 'visible' });
  const blockerBox = await blocker.boundingBox();
  const panelBox = await blocker.locator('[data-global-blocking-panel="true"]').boundingBox();
  if (!blockerBox || blockerBox.width !== 1200 || blockerBox.height !== 623) throw new Error(`Unexpected blocker geometry: ${JSON.stringify(blockerBox)}`);
  if (!panelBox || Math.round(panelBox.width) !== 140 || Math.round(panelBox.height) !== 45) throw new Error(`Unexpected loading panel geometry: ${JSON.stringify(panelBox)}`);

  releasePriceZone();
  await blocker.waitFor({ state: 'hidden' });

  await page.goto(`${base}/app/m/vendor-promotions`, { waitUntil: 'domcontentloaded' });
  let releasePromotions;
  const promotionGate = new Promise((resolve) => { releasePromotions = resolve; });
  await page.route('**/api/vendor-promotions', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    await promotionGate;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ gridModel: [], rows: [], page: 0, total: 0, records: 0 }) });
  });
  await active().getByRole('button', { name: 'Search', exact: true }).click();
  await blocker.waitFor({ state: 'visible' });
  releasePromotions();
  await blocker.waitFor({ state: 'hidden' });

  await page.goto(`${base}/app/m/external-apps`, { waitUntil: 'domcontentloaded' });
  const sizes = await active().getByLabel('Records per Page').locator('option').allTextContents();
  if (JSON.stringify(sizes) !== JSON.stringify(['20', '50', '100', '200'])) throw new Error(`Unexpected page sizes: ${JSON.stringify(sizes)}`);
  if (!await active().getByText('No records to view', { exact: true }).last().isVisible()) throw new Error('Shared empty footer is missing');

  console.log(JSON.stringify({ blocker: blockerBox, loadingPanel: panelBox, pageSizes: sizes, emptyText: 'No records to view', modules: ['Price Zone Master', 'Vendor Promotions', 'External Apps'] }, null, 2));
} finally {
  await browser.close();
}
