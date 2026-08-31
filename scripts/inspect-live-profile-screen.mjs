import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
try {
  const page = browser.contexts().flatMap((context) => context.pages()).find((candidate) => candidate.url().includes('selCompanyLocationBS.action'));
  if (!page) throw new Error('Authenticated LIVE shell unavailable');
  const frame = page.frames().find((candidate) => candidate.url().includes('myAccountSPdisplayBS'));
  if (!frame) throw new Error('LIVE Profile frame unavailable');
  const output = await frame.locator('body').evaluate((root) => {
    const info = (element) => { const box = element.getBoundingClientRect(); return { tag: element.tagName, id: element.id, name: element.getAttribute('name'), type: element.getAttribute('type'), text: (element.innerText || '').replace(/\s+/g, ' ').trim(), value: element.value, checked: element.checked, disabled: element.disabled, title: element.getAttribute('title'), onclick: element.getAttribute('onclick'), x: box.x, y: box.y, width: box.width, height: box.height }; };
    return { text: (root.innerText || '').replace(/\s+/g, ' ').trim(), controls: [...root.querySelectorAll('input,select,textarea,button,a')].filter((element) => { const box = element.getBoundingClientRect(); return box.width && box.height; }).map(info) };
  });
  console.log(JSON.stringify(output, null, 2));
} finally {
  await browser.close();
}
