import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
try {
  const page = browser.contexts().flatMap((context) => context.pages()).find((candidate) => candidate.url().includes('selCompanyLocationBS.action'));
  if (!page) throw new Error('Authenticated LIVE shell unavailable');
  const result = await page.evaluate(() => {
    const info = (element) => {
      if (!element) return null;
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return { tag: element.tagName, id: element.id, className: String(element.className), text: (element.innerText || '').replace(/\s+/g, ' ').trim(), html: element.outerHTML.slice(0, 2500), x: box.x, y: box.y, width: box.width, height: box.height, background: style.backgroundColor, color: style.color, fontSize: style.fontSize, border: style.border };
    };
    return {
      footer: info(document.querySelector('.main-footer, footer')),
      screensWrapper: info(document.querySelector('#screensWrapper')),
      openScreenCandidates: [...document.querySelectorAll('body *')].filter((element) => /Open Screen\(s\)/i.test(element.textContent || '') && element.children.length < 12).slice(0, 10).map(info),
      breadcrumbCandidates: [...document.querySelectorAll('[class*=breadcrumb], [id*=breadcrumb]')].slice(0, 10).map(info),
    };
  });
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
