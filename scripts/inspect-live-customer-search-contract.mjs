import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
try {
  const page = browser.contexts().flatMap((context) => context.pages()).find((candidate) => candidate.url().includes('selCompanyLocationBS.action'));
  if (!page) throw new Error('Authenticated LIVE shell unavailable');
  const master = page.locator('.sidebar-menu > li').nth(1);
  await master.hover(); await master.getByText('Customer Master', { exact: true }).click(); await page.waitForTimeout(600);
  const frames = await Promise.all(page.frames().filter((candidate) => candidate.url().includes('customerEnqDisplayBS')).map(async (frame) => ({ frame, visible: await frame.frameElement().then((element) => element.isVisible()).catch(() => false) })));
  const frame = frames.filter((candidate) => candidate.visible).at(-1)?.frame;
  if (!frame) throw new Error('Active Customer Enquiry unavailable');
  await frame.locator('#gs_customerCode').fill('ZZZ-NO-LIVE-CUSTOMER-999');
  await frame.locator('#gs_type').selectOption('1');
  const responsePromise = page.waitForResponse((response) => response.url().includes('jsonCustEnqSearch') && response.request().method() === 'POST');
  await frame.locator('#SearchBtn').click();
  const response = await responsePromise;
  const request = response.request();
  console.log(JSON.stringify({ url: request.url(), method: request.method(), postData: request.postData(), status: response.status(), response: await response.json().catch(async () => await response.text()) }, null, 2));
} finally { await browser.close(); }
