import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
try {
  const page = browser.contexts().flatMap((context) => context.pages()).find((candidate) => candidate.url().includes('selCompanyLocationBS.action'));
  const frame = page?.frames().find((candidate) => candidate.url().includes('sellerPanelDashboardDisplayBS'));
  if (!page || !frame) throw new Error('Seller Panel Dashboard unavailable');
  const select = frame.locator('#selectMode');
  const options = await select.locator('option').evaluateAll((nodes) => nodes.map((node) => ({ value: node.value, text: node.textContent.trim() })));
  const requests = [];
  page.on('request', (request) => { if (request.frame() === frame) requests.push({ method: request.method(), url: request.url(), postData: request.postData() }); });
  const modes = [];
  for (const option of options) {
    requests.length = 0;
    await select.selectOption(option.value);
    await frame.waitForTimeout(500);
    modes.push({ ...option, text: (await frame.locator('body').innerText()).replace(/\s+/g, ' ').trim(), requests: [...requests] });
  }
  console.log(JSON.stringify(modes, null, 2));
} finally {
  await browser.close();
}
