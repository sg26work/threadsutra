import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('https://demo.vineretail.com/eRetailWeb/eRetailLogin.action?popup=true', { waitUntil: 'domcontentloaded' });
  const links = await page.locator('a, input[type=submit], input[type=reset]').evaluateAll((elements) => elements.map((element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return { id: element.id, tag: element.tagName, text: (element.textContent || '').trim(), value: element.getAttribute('value'), href: element.getAttribute('href'), visible: style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0 };
  }));
  await page.locator('#forget-password').click();
  await page.waitForTimeout(400);
  const dialogs = await page.locator('[role=dialog], .modal:visible').evaluateAll((elements) => elements.map((element) => ({ id: element.id, text: (element.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 500) })));
  const frames = page.frames().filter((frame) => frame !== page.mainFrame()).map((frame) => frame.url());
  const frameControls = [];
  for (const frame of page.frames().filter((candidate) => candidate !== page.mainFrame())) {
    frameControls.push({ url: frame.url(), controls: await frame.locator('input,button,select,a').evaluateAll((elements) => elements.map((element) => ({ tag: element.tagName, id: element.id, name: element.getAttribute('name'), type: element.getAttribute('type'), text: (element.textContent || '').trim(), value: element.getAttribute('value') }))).catch(() => []) });
  }
  console.log(JSON.stringify({ links, dialogs, frames, frameControls }, null, 2));
} finally {
  await browser.close();
}
