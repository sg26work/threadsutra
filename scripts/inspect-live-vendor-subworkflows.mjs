import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
try {
  const page = browser.contexts().flatMap((context) => context.pages()).find((candidate) => candidate.url().includes('selCompanyLocationBS.action'));
  if (!page) throw new Error('Authenticated LIVE shell unavailable');
  const master = page.locator('.sidebar-menu > li').nth(1);
  await master.hover(); await page.waitForTimeout(80);
  await master.getByText('Vendor Master', { exact: true }).click();
  await page.waitForTimeout(500);
  let frame = page.frames().filter((candidate) => candidate.url().includes('showVendorEnquiryBS')).at(-1);
  if (!frame) throw new Error('Vendor enquiry unavailable');
  const requests = [];
  page.on('request', (request) => { if (request.frame() === frame && !/\.(css|js|png|gif|woff)/i.test(request.url())) requests.push({ method: request.method(), url: request.url(), postData: request.postData() }); });
  await frame.locator('#gs_vendorCode').fill('ZZZ-NO-LIVE-MATCH-999');
  await frame.locator('#SearchBtn').click();
  await frame.waitForTimeout(500);
  const search = { requests: [...requests], text: (await frame.locator('body').innerText()).replace(/\s+/g, ' ').trim().slice(-250) };
  await master.hover(); await page.waitForTimeout(80);
  await master.getByText('Vendor Master', { exact: true }).click();
  await page.waitForTimeout(400);
  frame = page.frames().filter((candidate) => candidate.url().includes('showVendorEnquiryBS')).at(-1);
  if (!frame) throw new Error(`Vendor enquiry disappeared after Search: ${page.frames().map((candidate) => candidate.url()).join(' | ')}`);
  requests.length = 0;
  await frame.locator('#importButton').click();
  await frame.waitForTimeout(250);
  const describe = async (scope) => scope.evaluate((root) => ({ text: (root.innerText || '').replace(/\s+/g, ' ').trim(), controls: [...root.querySelectorAll('input:not([type=hidden]),select,textarea,button,a')].filter((element) => { const box = element.getBoundingClientRect(); return box.width && box.height; }).map((element) => ({ tag: element.tagName, id: element.id, type: element.getAttribute('type'), text: (element.innerText || '').replace(/\s+/g, ' ').trim(), value: element.value, title: element.getAttribute('title'), onclick: element.getAttribute('onclick') })) }));
  const importDialog = await describe(frame.locator('.modal:visible, .ui-dialog:visible, [role=dialog]:visible').first());
  await frame.evaluate(() => window.jQuery?.('.modal').modal('hide'));
  await frame.getByRole('button', { name: 'Add New', exact: true }).click();
  await frame.waitForTimeout(500);
  const editor = page.frames().find((candidate) => /vendor/i.test(candidate.url()) && candidate !== frame && !/sellerPanel/i.test(candidate.url()));
  const editorData = editor ? await describe(editor.locator('body')) : null;
  console.log(JSON.stringify({ search, importDialog, editorUrl: editor?.url(), editorData }, null, 2));
} finally { await browser.close(); }
