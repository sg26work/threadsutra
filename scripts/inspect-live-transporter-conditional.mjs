import { chromium } from 'playwright';
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
try {
  const page = browser.contexts().flatMap((context) => context.pages()).find((candidate) => candidate.url().includes('selCompanyLocationBS.action'));
  const candidates = await Promise.all(page.frames().filter((frame) => frame.url().includes('displayTransporterMaintenanceBS')).map(async (frame) => ({ frame, visible: await frame.frameElement().then((element) => element.isVisible()).catch(() => false), size: (await frame.locator('body').innerText().catch(() => '')).length })));
  const frame = candidates.filter((candidate) => candidate.visible).sort((a, b) => b.size - a.size)[0]?.frame;
  if (!frame) throw new Error('Active Transporter editor unavailable');
  const snapshot = async () => frame.locator('body').evaluate((root) => ({
    tabs: [...root.querySelectorAll('a[data-toggle="tab"]')].filter((element) => { const box = element.getBoundingClientRect(); return box.width > 0 && box.height > 0; }).map((element) => element.textContent.trim()),
    headings: [...root.querySelectorAll('h1,h2,h3,h4,legend,th')].filter((element) => { const box = element.getBoundingClientRect(); return box.width > 0 && box.height > 0; }).map((element) => element.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean),
    visibleIds: [...root.querySelectorAll('input:not([type=hidden]),select,textarea,button')].filter((element) => { const box = element.getBoundingClientRect(); return box.width > 0 && box.height > 0; }).map((element) => element.id || element.getAttribute('name') || element.textContent.trim()).filter(Boolean),
  }));
  const before = await snapshot();
  await frame.locator('#trnstype').selectOption({ label: 'Delhivery (Recommended)' });
  await frame.waitForTimeout(500);
  const afterProvider = await snapshot();
  const conditional = {};
  for (const id of ['enableLocationLinkingFlagCheckbox','enableCodLimitCheckbox','enableReturnCodLimitCheckbox','otpSupportFlagCheckBox','secureShippingSupportFlagCheckbox']) {
    const control = frame.locator(`#${id}`);
    if (await control.count()) {
      await control.check({ force: true });
      await frame.waitForTimeout(100);
      conditional[id] = await snapshot();
      await control.uncheck({ force: true }).catch(() => {});
    }
  }
  await frame.getByText('User Defined Field', { exact: true }).click();
  await frame.waitForTimeout(100);
  const udf = await frame.locator('input:not([type=hidden]):visible,select:visible,textarea:visible').evaluateAll((elements) => elements.map((element) => ({ id: element.id, name: element.getAttribute('name'), maxlength: element.getAttribute('maxlength'), value: element.value })));
  console.log(JSON.stringify({ before, afterProvider, conditional, udf }, null, 2));
} finally { await browser.close(); }
