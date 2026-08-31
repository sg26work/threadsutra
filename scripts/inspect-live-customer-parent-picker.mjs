import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
try {
  const page = browser.contexts().flatMap((context) => context.pages()).find((candidate) => candidate.url().includes('selCompanyLocationBS.action'));
  if (!page) throw new Error('Authenticated LIVE shell unavailable');
  const selectVisible = async (pattern) => {
    const candidates = await Promise.all(page.frames().filter((frame) => pattern.test(frame.url())).map(async (frame) => ({
      frame,
      visible: await frame.frameElement().then((element) => element.isVisible()).catch(() => false),
      size: (await frame.locator('body').innerText().catch(() => '')).length,
    })));
    return candidates.filter((candidate) => candidate.visible).sort((a, b) => b.size - a.size)[0]?.frame;
  };
  const editor = await selectVisible(/customerMaintenanceDisplayBS/i);
  if (!editor) throw new Error('Active Customer editor unavailable');
  const existingDialog = editor.locator('.modal:visible, [role="dialog"]:visible').first();
  if (!await existingDialog.count()) {
    await editor.getByText('Customer Details', { exact: true }).first().click();
    await editor.locator('#parentButton').click();
    await page.waitForTimeout(400);
  }
  const frames = await Promise.all(page.frames().map(async (frame) => ({
    frame,
    url: frame.url(),
    visible: frame === page.mainFrame() || await frame.frameElement().then((element) => element.isVisible()).catch(() => false),
    body: (await frame.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').trim().slice(0, 500),
  })));
  const picker = frames.filter((item) => item.frame !== page.mainFrame() && item.frame !== editor && /parentcustomerPickListEretail/i.test(item.url)).sort((a, b) => b.body.length - a.body.length)[0]?.frame;
  if (!picker) throw new Error(`Parent picker iframe unavailable: ${JSON.stringify(frames.map(({ url, visible, body }) => ({ url, visible, body })), null, 2)}`);
  const requests = [];
  page.on('request', (request) => {
    if (/customer|parent/i.test(request.url())) requests.push({ method: request.method(), url: request.url(), postData: request.postData(), headers: request.headers() });
  });
  const responsePromise = page.waitForResponse((response) => response.url().includes('jsonParentCustomerList'));
  await picker.goto(picker.url(), { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(300);
  const parentResponse = await responsePromise.then(async (response) => ({ status: response.status(), body: await response.text() }));
  const snapshot = await picker.locator('body').evaluate((root) => ({
    text: (root.innerText || '').replace(/\s+/g, ' ').trim(),
    controls: [...root.querySelectorAll('input:not([type=hidden]),select,button,a')].filter((element) => { const box = element.getBoundingClientRect(); return box.width > 0 && box.height > 0; }).map((element) => ({
      tag: element.tagName, id: element.id, name: element.getAttribute('name'), type: element.getAttribute('type'), text: (element.innerText || '').replace(/\s+/g, ' ').trim(), title: element.getAttribute('title'), onclick: element.getAttribute('onclick'),
      options: element.tagName === 'SELECT' ? [...element.options].map((option) => ({ value: option.value, text: option.text })) : undefined,
    })),
    headers: [...root.querySelectorAll('th')].filter((element) => { const box = element.getBoundingClientRect(); return box.width > 0 && box.height > 0; }).map((element) => (element.innerText || '').replace(/\s+/g, ' ').trim()).filter(Boolean),
  }));
  console.log(JSON.stringify({ frames: frames.map(({ url, visible, body }) => ({ url, visible, body })), url: picker.url(), snapshot, requests, parentResponse }, null, 2));
} finally {
  await browser.close();
}
