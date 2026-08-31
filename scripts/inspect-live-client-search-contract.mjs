import { chromium } from 'playwright';
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
try {
  const page = browser.contexts().flatMap((context) => context.pages()).find((candidate) => candidate.url().includes('selCompanyLocationBS.action'));
  const frames = await Promise.all(page.frames().filter((frame) => frame.url().includes('showClientEnquiryBS')).map(async (frame) => ({ frame, visible: await frame.frameElement().then((element) => element.isVisible()).catch(() => false) })));
  const frame = frames.filter((candidate) => candidate.visible).at(-1)?.frame;
  if (!frame) throw new Error('Active Client Master unavailable');
  await frame.locator('#gs_clientName').fill(process.env.CLIENT_TERM ?? `NO-MATCH-${Date.now()}`);
  const requestPromise = page.waitForRequest((request) => request.url().includes('jsonClientMasterEnquirySearch'));
  const responsePromise = page.waitForResponse((response) => response.url().includes('jsonClientMasterEnquirySearch'));
  await frame.locator('#SearchBtn').click();
  const request = await requestPromise, response = await responsePromise;
  await frame.waitForTimeout(250);
  const ui = await frame.locator('body').evaluate((root) => ({ text: (root.innerText || '').replace(/\s+/g, ' ').trim().slice(-700), loading: [...root.querySelectorAll('[aria-busy=true],.loading,.ui-jqgrid-loading')].filter((element) => { const box = element.getBoundingClientRect(); return box.width > 0 && box.height > 0; }).map((element) => element.textContent.trim()) }));
  console.log(JSON.stringify({ request: { method: request.method(), url: request.url(), postData: request.postData(), headers: request.headers() }, response: { status: response.status(), body: await response.text() }, ui }, null, 2));
  await frame.evaluate(() => window.doreset());
} finally { await browser.close(); }
