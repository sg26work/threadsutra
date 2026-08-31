import { chromium } from 'playwright';
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
try {
  const page = browser.contexts().flatMap((context) => context.pages()).find((candidate) => candidate.url().includes('selCompanyLocationBS.action'));
  await page.evaluate(() => ['Profile','SellerPanelDashboard','VendorMaster','CommonImport','VendorCreateEdit','CustomerMaster','CustomerCreate','TransporterMaster','TransporterCreateEdit'].forEach((name) => { if (document.getElementById(`${name}_IFrame`)) window.closeTab(name); }));
  await page.evaluate(() => window.openScreen('Client Master', 'showClientEnquiryBS', 'fa fa-arrow-circle-right'));
  await page.waitForTimeout(200);
  const enquiryFrames = await Promise.all(page.frames().filter((frame) => frame.url().includes('showClientEnquiryBS')).map(async (frame) => ({ frame, visible: await frame.frameElement().then((element) => element.isVisible()).catch(() => false) })));
  const enquiry = enquiryFrames.filter((candidate) => candidate.visible).at(-1)?.frame;
  if (!enquiry) throw new Error('Active Client Master unavailable');
  await enquiry.getByText('Add New', { exact: true }).click();
  await page.waitForTimeout(700);
  const shellState = await page.evaluate(() => ({ multi: window.multiScreenItems?.filter(Boolean), tabs: window.tabMenuItems?.filter(Boolean) }));
  const editorFrames = await Promise.all(page.frames().filter((frame) => /client.*maintenance/i.test(frame.url())).map(async (frame) => ({ frame, visible: await frame.frameElement().then((element) => element.isVisible()).catch(() => false), size: (await frame.locator('body').innerText().catch(() => '')).length })));
  const frame = editorFrames.filter((candidate) => candidate.visible).sort((a, b) => b.size - a.size)[0]?.frame;
  if (!frame) throw new Error(`Active Client editor unavailable: ${JSON.stringify(shellState)} :: ${page.frames().map((candidate) => candidate.url()).join(' | ')}`);
  const inspect = async () => frame.locator('body').evaluate((root) => ({
    text: [...root.querySelectorAll('label,legend,h1,h2,h3,h4,h5,.panel-title')].filter((element) => { const box = element.getBoundingClientRect(); return box.width > 0 && box.height > 0; }).map((element) => (element.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean),
    controls: [...root.querySelectorAll('input:not([type=hidden]),select,textarea,button,a')].filter((element) => { const box = element.getBoundingClientRect(); return box.width > 0 && box.height > 0; }).map((element) => ({ id: element.id, name: element.getAttribute('name'), tag: element.tagName, type: element.getAttribute('type'), text: element.tagName === 'SELECT' ? undefined : (element.innerText || '').replace(/\s+/g, ' ').trim(), maxlength: element.getAttribute('maxlength'), title: element.getAttribute('title'), onclick: element.getAttribute('onclick'), disabled: !!element.disabled, readonly: !!element.readOnly, checked: element.type === 'checkbox' ? element.checked : undefined, optionCount: element.tagName === 'SELECT' ? element.options.length : undefined, options: element.tagName === 'SELECT' && element.options.length <= 20 ? [...element.options].map((option) => ({ text: option.text, value: option.value })) : undefined })),
    headers: [...root.querySelectorAll('th')].filter((element) => { const box = element.getBoundingClientRect(); return box.width > 0 && box.height > 0; }).map((element) => element.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean),
  }));
  const tabs = await frame.locator('a[data-toggle="tab"]').evaluateAll((elements) => elements.filter((element) => { const box = element.getBoundingClientRect(); return box.width > 0 && box.height > 0; }).map((element) => element.textContent.trim()));
  const snapshots = {};
  const requestedTab = process.env.TARGET_TAB;
  for (const tab of requestedTab ? tabs.filter((name) => name === requestedTab) : tabs) {
    await frame.getByText(tab, { exact: true }).first().evaluate((element) => element.click());
    await frame.waitForTimeout(180);
    snapshots[tab] = await inspect();
  }
  const handlers = process.env.HANDLERS === '1' ? await frame.evaluate(() => Object.fromEntries(['clickSave','resetAll','openAuditPopUp'].map((name) => [name, typeof window[name] === 'function' ? String(window[name]) : null]))) : undefined;
  console.log(JSON.stringify({ url: frame.url(), tabs, snapshots, handlers }, null, 2));
} finally { await browser.close(); }
