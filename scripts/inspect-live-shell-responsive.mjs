import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
try {
  const page = browser.contexts().flatMap((context) => context.pages()).find((candidate) => candidate.url().includes('selCompanyLocationBS.action'));
  if (!page) throw new Error('Authenticated LIVE shell unavailable');

  const snapshot = (label) => page.evaluate((stage) => {
    const visible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const rect = (element) => element ? (() => {
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        tag: element.tagName,
        id: element.id,
        className: String(element.className).slice(0, 180),
        text: (element.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 180),
        x: box.x, y: box.y, width: box.width, height: box.height,
        position: style.position, overflowX: style.overflowX, overflowY: style.overflowY,
        zIndex: style.zIndex, display: style.display,
        scrollWidth: element.scrollWidth, scrollHeight: element.scrollHeight,
        clientWidth: element.clientWidth, clientHeight: element.clientHeight,
      };
    })() : null;
    const first = (...selectors) => selectors.map((selector) => document.querySelector(selector)).find(Boolean);
    const shell = {
      header: rect(first('.main-header', 'header')),
      sidebar: rect(first('.main-sidebar', '.sidebar')),
      sidebarMenu: rect(first('.sidebar-menu')),
      contentWrapper: rect(first('.content-wrapper', '#bodyContent', '.right-side')),
      contentHeader: rect(first('.content-header', '.breadcrumb')),
      screenTabs: rect(first('#openScreens', '.screen-tabs', '.nav-tabs-custom', '[class*=screenTab]')),
      footer: rect(first('.main-footer', 'footer')),
    };
    const forensic = [...document.querySelectorAll('input,button,a,div,span')]
      .filter(visible)
      .filter((element) => /slider|resize|collapse|expand|sidebar|scroll|drag|toggle/i.test(`${element.id} ${element.className} ${element.getAttribute('title') || ''} ${element.getAttribute('onclick') || ''}`))
      .slice(0, 120)
      .map((element) => ({ ...rect(element), type: element.getAttribute('type'), title: element.getAttribute('title'), onclick: element.getAttribute('onclick') }));
    const functions = Object.getOwnPropertyNames(window).filter((name) => /slider|resize|collapse|expand|sidebar|scroll|drag|toggle/i.test(name) && typeof window[name] === 'function').sort();
    const layers = [...document.querySelectorAll('body *')].filter(visible).filter((element) => ['fixed', 'sticky'].includes(getComputedStyle(element).position) || Number(getComputedStyle(element).zIndex) >= 1000).slice(0, 80).map(rect);
    return {
      stage,
      viewport: { innerWidth, innerHeight, outerWidth, outerHeight, devicePixelRatio, visualScale: visualViewport?.scale || null, bodyScrollWidth: document.body.scrollWidth, bodyScrollHeight: document.body.scrollHeight, documentScrollWidth: document.documentElement.scrollWidth, documentScrollHeight: document.documentElement.scrollHeight },
      shell,
      forensic,
      functions: Object.fromEntries(functions.map((name) => [name, String(window[name]).slice(0, 1800)])),
      layers,
    };
  }, label);

  const original = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }));
  const evidence = [await snapshot('current-100-percent')];
  for (const viewport of [{ width: 1280, height: 720 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(250);
    evidence.push(await snapshot(`${viewport.width}x${viewport.height}`));
  }
  await page.setViewportSize(original);
  console.log(JSON.stringify({ original, evidence }, null, 2));
} finally {
  await browser.close();
}
