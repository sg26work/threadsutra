import { chromium } from 'playwright';
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
try {
  const page = browser.contexts().flatMap((context) => context.pages()).find((candidate) => candidate.url().includes('selCompanyLocationBS.action'));
  const frames = await Promise.all(page.frames().filter((frame) => frame.url().includes('displayTransporterMaintenanceBS')).map(async (frame) => ({ frame, visible: await frame.frameElement().then((element) => element.isVisible()).catch(() => false), size: (await frame.locator('body').innerText().catch(() => '')).length })));
  const frame = frames.filter((candidate) => candidate.visible).sort((a, b) => b.size - a.size)[0]?.frame;
  if (!frame) throw new Error('Active Transporter editor unavailable');
  const values = await frame.evaluate(() => ({
    transporterTypes: [...document.querySelector('#trnstype').options].map((option) => option.text),
    states: [...document.querySelector('#state').options].map((option) => option.text),
    countries: [...document.querySelector('#countryId').options].map((option) => option.text),
  }));
  process.stdout.write(JSON.stringify(values));
} finally { await browser.close(); }
