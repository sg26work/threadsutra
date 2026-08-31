import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
try {
  const page = browser.contexts().flatMap((context) => context.pages()).find((candidate) => candidate.url().includes('selCompanyLocationBS.action'));
  if (!page) throw new Error('Authenticated LIVE shell unavailable');
  const master = page.locator('.sidebar-menu > li').nth(1);
  await master.hover(); await master.getByText('Customer Master', { exact: true }).click(); await page.waitForTimeout(450);
  const activeFrame = async (pattern) => {
    const candidates = await Promise.all(page.frames().filter((candidate) => pattern.test(candidate.url())).map(async (frame) => ({ frame, visible: await frame.frameElement().then((element) => element.isVisible()).catch(() => false), size: (await frame.locator('body').innerText().catch(() => '')).length })));
    return candidates.filter((candidate) => candidate.visible).sort((a, b) => b.size - a.size)[0]?.frame;
  };
  const enquiry = await activeFrame(/customerEnqDisplayBS/i);
  if (!enquiry) throw new Error('Customer Enquiry unavailable');
  await enquiry.locator('[title^="Add New"]').click(); await page.waitForTimeout(900);
  const editor = await activeFrame(/customerMaintenanceDisplayBS/i);
  if (!editor) throw new Error('Customer editor unavailable');
  const actions = await editor.locator('button:visible').evaluateAll((buttons) => buttons.map((button) => ({ text: button.innerText.trim(), title: button.title, onclick: button.getAttribute('onclick') })));
  const sources = await editor.evaluate(() => Object.fromEntries(Object.keys(window).filter((key) => /save|reset|audit|parent|shipping/i.test(key) && typeof window[key] === 'function').map((key) => [key, String(window[key])]).filter(([, source]) => /customerDTO|customerMaintenance|parentCustomer|otherShipping|audit/i.test(source)).slice(0, 30)));
  await editor.getByText('Save', { exact: true }).first().click(); await page.waitForTimeout(250);
  const shellAlerts = await page.locator('.modal:visible, [role=dialog]:visible, .alert:visible').evaluateAll((elements) => elements.map((element) => (element.innerText || '').replace(/\s+/g, ' ').trim()).filter(Boolean));
  const visibleClose = page.locator('.modal:visible button, [role=dialog]:visible button').filter({ hasText: /^(OK|Ok|Close|×)$/ }).first();
  if (await visibleClose.count()) await visibleClose.click().catch(() => {});
  await editor.getByText('Customer Details', { exact: true }).first().click();
  await editor.locator('#parentButton').click(); await editor.waitForTimeout(250);
  const parentDialog = await editor.locator('.modal:visible, [role=dialog]:visible').first().evaluate((root) => ({ text: (root.innerText || '').replace(/\s+/g, ' ').trim(), controls: [...root.querySelectorAll('input:not([type=hidden]),select,button,a')].filter((element) => { const box = element.getBoundingClientRect(); return box.width && box.height; }).map((element) => ({ tag: element.tagName, id: element.id, text: (element.innerText || '').replace(/\s+/g, ' ').trim(), title: element.getAttribute('title'), onclick: element.getAttribute('onclick') })) })).catch(() => null);
  await editor.evaluate(() => window.jQuery?.('.modal').modal('hide'));
  await editor.getByText('Other Shipping Addresses', { exact: true }).first().click(); await editor.waitForTimeout(120);
  await editor.getByText('Add New', { exact: true }).first().click(); await editor.waitForTimeout(180);
  const otherShipping = await editor.locator('body').evaluate((root) => ({ text: (root.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 4000), labels: [...root.querySelectorAll('label')].filter((element) => { const box = element.getBoundingClientRect(); return box.width && box.height; }).map((element) => (element.innerText || '').replace(/\s+/g, ' ').trim()).filter(Boolean), controls: [...root.querySelectorAll('input:not([type=hidden]),select,textarea,button')].filter((element) => { const box = element.getBoundingClientRect(); return box.width && box.height; }).map((element) => ({ id: element.id, name: element.getAttribute('name'), type: element.getAttribute('type'), text: (element.innerText || '').replace(/\s+/g, ' ').trim(), maxlength: element.getAttribute('maxlength') })) }));
  console.log(JSON.stringify({ actions, sources, emptySaveAlerts: shellAlerts, parentDialog, otherShipping }, null, 2));
} finally { await browser.close(); }
