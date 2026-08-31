import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
try {
  const page = browser.contexts().flatMap((context) => context.pages()).find((candidate) => candidate.url().includes('selCompanyLocationBS.action'));
  if (!page) throw new Error('Authenticated LIVE shell unavailable');
  const frames = await Promise.all(page.frames().filter((frame) => frame.url().includes('displayTransporterEnquiryBS')).map(async (frame) => ({ frame, visible: await frame.frameElement().then((element) => element.isVisible()).catch(() => false) })));
  const frame = frames.filter((candidate) => candidate.visible).at(-1)?.frame;
  if (!frame) throw new Error('Active Transporter Enquiry unavailable');
  await frame.locator('#gs_transporterCode').fill(`NO-MATCH-${Date.now()}`);
  const requestPromise = page.waitForRequest((request) => request.url().includes('jsonTransporterEnquirySearch'));
  const responsePromise = page.waitForResponse((response) => response.url().includes('jsonTransporterEnquirySearch'));
  await frame.locator('#SearchBtn').click();
  const request = await requestPromise;
  const response = await responsePromise;
  console.log(JSON.stringify({
    request: { method: request.method(), url: request.url(), postData: request.postData(), headers: request.headers() },
    response: { status: response.status(), body: await response.text() },
  }, null, 2));
  await frame.evaluate(() => window.resetAll());
} finally {
  await browser.close();
}
