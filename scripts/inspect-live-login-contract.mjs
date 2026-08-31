import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('https://demo.vineretail.com/eRetailWeb/eRetailLogin.action?popup=true', { waitUntil: 'domcontentloaded' });
  const contract = await page.evaluate(() => ({
    action: document.querySelector('form')?.getAttribute('action')?.replace(/;jsessionid=[^?;]+/i, ';jsessionid=[REDACTED_SESSION]'),
    method: document.querySelector('form')?.getAttribute('method'),
    controls: [...document.querySelectorAll('input, button, select, a')].map((element) => ({
      tag: element.tagName,
      type: element.getAttribute('type'),
      id: element.id,
      name: element.getAttribute('name'),
      placeholder: element.getAttribute('placeholder'),
      autocomplete: element.getAttribute('autocomplete'),
      maxLength: element.getAttribute('maxlength'),
      text: (element.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80),
      onclick: element.getAttribute('onclick'),
    })),
    handlers: [...document.scripts].map((script) => script.textContent || '').filter((text) => /login|password|submit/i.test(text) && !/BEGIN PUBLIC KEY/.test(text)).map((text) => text.replace(/\s+/g, ' ').trim().slice(0, 1200)),
    storageKeys: { local: Object.keys(localStorage), session: Object.keys(sessionStorage) },
  }));
  console.log(JSON.stringify(contract, null, 2));
} finally {
  await browser.close();
}
