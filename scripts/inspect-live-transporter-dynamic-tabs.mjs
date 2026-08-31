import { chromium } from 'playwright';
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
try {
  const page = browser.contexts().flatMap((context) => context.pages()).find((candidate) => candidate.url().includes('selCompanyLocationBS.action'));
  const candidates = await Promise.all(page.frames().filter((frame) => frame.url().includes('displayTransporterMaintenanceBS')).map(async (frame) => ({ frame, visible: await frame.frameElement().then((element) => element.isVisible()).catch(() => false), size: (await frame.locator('body').innerText().catch(() => '')).length })));
  const frame = candidates.filter((candidate) => candidate.visible).sort((a, b) => b.size - a.size)[0]?.frame;
  if (!frame) throw new Error('Active Transporter editor unavailable');
  await frame.getByText('Transporter Details', { exact: true }).click();
  await frame.locator('#trnstype').selectOption({ label: 'Delhivery (Recommended)' });
  await frame.waitForTimeout(300);
  const inspectTab = async (name) => {
    await frame.getByText(name, { exact: true }).click();
    await frame.waitForTimeout(200);
    return frame.locator('body').evaluate((root) => ({
      text: (root.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 5000),
      controls: [...root.querySelectorAll('input:not([type=hidden]),select,textarea,button')].filter((element) => { const box = element.getBoundingClientRect(); return box.width > 0 && box.height > 0; }).map((element) => ({ id: element.id, name: element.getAttribute('name'), tag: element.tagName, type: element.getAttribute('type'), title: element.getAttribute('title'), maxlength: element.getAttribute('maxlength'), disabled: !!element.disabled, readonly: !!element.readOnly })),
      headers: [...root.querySelectorAll('th')].filter((element) => { const box = element.getBoundingClientRect(); return box.width > 0 && box.height > 0; }).map((element) => element.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean),
    }));
  };
  const configure = await inspectTab('Configure API Details');
  await frame.getByText('Transporter Details', { exact: true }).click();
  await frame.locator('#enableLocationLinkingFlagCheckbox').check({ force: true });
  await frame.waitForTimeout(200);
  const linked = await inspectTab('Linked Location');
  console.log(JSON.stringify({ configure, linked }, null, 2));
} finally { await browser.close(); }
