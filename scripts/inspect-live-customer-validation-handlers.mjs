import { chromium } from 'playwright';
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
try {
  const page = browser.contexts().flatMap((context) => context.pages()).find((candidate) => candidate.url().includes('selCompanyLocationBS.action'));
  if (!page) throw new Error('Authenticated LIVE shell unavailable');
  const frames = await Promise.all(page.frames().filter((candidate) => candidate.url().includes('customerMaintenanceDisplayBS')).map(async (frame) => ({ frame, visible: await frame.frameElement().then((element) => element.isVisible()).catch(() => false), size: (await frame.locator('body').innerText().catch(() => '')).length })));
  const frame = frames.filter((candidate) => candidate.visible).sort((a, b) => b.size - a.size)[0]?.frame;
  if (!frame) throw new Error('Active Customer editor unavailable');
  const names = ['clickSave','saveCustomer','validateEmail','isValidLatitude','isValidLongitude','openParentCustomerPopup','openAuditPopUp'];
  console.log(JSON.stringify(await frame.evaluate((items) => Object.fromEntries(items.map((name) => [name, typeof window[name] === 'function' ? String(window[name]) : null])), names), null, 2));
} finally { await browser.close(); }
