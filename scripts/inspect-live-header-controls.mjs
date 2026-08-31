import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
try {
  const page = browser.contexts().flatMap((context) => context.pages()).find((candidate) => candidate.url().includes('selCompanyLocationBS.action'));
  if (!page) throw new Error('Authenticated LIVE shell unavailable');
  const snapshot = async (stage) => page.evaluate((label) => {
    const header = document.querySelector('.main-header');
    const info = (element) => {
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return { tag: element.tagName, id: element.id, className: String(element.className), text: (element.innerText || '').replace(/\s+/g, ' ').trim(), title: element.getAttribute('title') || element.querySelector('[title]')?.getAttribute('title'), href: element.getAttribute('href'), onclick: element.getAttribute('onclick'), onchange: element.getAttribute('onchange'), onkeydown: element.getAttribute('onkeydown'), onkeypress: element.getAttribute('onkeypress'), x: box.x, y: box.y, width: box.width, height: box.height, display: style.display, color: style.color, background: style.backgroundColor };
    };
    return {
      stage: label,
      controls: [...header.querySelectorAll('a,button,input,select')].filter((element) => { const box = element.getBoundingClientRect(); return getComputedStyle(element).display !== 'none' && box.width > 0 && box.height > 0; }).map(info),
      menus: [...header.querySelectorAll('.dropdown-menu')].map(info),
      tags: [...header.querySelectorAll('#multiScreenDiv > *')].map(info),
      searchFunctions: Object.fromEntries(Object.getOwnPropertyNames(window).filter((name) => /search/i.test(name) && typeof window[name] === 'function').map((name) => [name, String(window[name]).slice(0, 3000)])),
    };
  }, stage);
  console.log(JSON.stringify([await snapshot('closed')], null, 2));
} finally {
  await browser.close();
}
