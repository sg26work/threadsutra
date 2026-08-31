import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
try {
  const authenticated = browser.contexts().flatMap((context) => context.pages()).find((page) => page.url().includes('selCompanyLocationBS.action'));
  if (!authenticated) throw new Error('Authenticated LIVE shell unavailable');
  const shell = await authenticated.evaluate(() => {
    const scripts = [...document.scripts].map((script) => script.textContent || '').join('\n');
    const names = [...new Set([...scripts.matchAll(/function\s+([A-Za-z_$][\w$]*(?:logout|logOut|signOut|session)[\w$]*)\s*\(/gi)].map((match) => match[1]))];
    return {
      functions: Object.fromEntries(names.map((name) => [name, typeof window[name] === 'function' ? String(window[name]).slice(0, 1600) : null])),
      logoutControls: [...document.querySelectorAll('a,button,input')].filter((element) => /logout|log out|sign out/i.test(`${element.id} ${element.className} ${element.getAttribute('title')} ${element.textContent} ${element.getAttribute('onclick')}`)).map((element) => ({ tag: element.tagName, id: element.id, title: element.getAttribute('title'), text: (element.textContent || '').trim(), onclick: element.getAttribute('onclick'), href: element.getAttribute('href') })),
    };
  });

  const isolated = await browser.newContext();
  const page = await isolated.newPage();
  const response = await page.request.get('https://demo.vineretail.com/eRetailWeb/commonJsonSearch', { maxRedirects: 0 });
  const unauthenticated = { status: response.status(), location: response.headers().location || null, contentType: response.headers()['content-type'] || null, bodyStart: (await response.text()).replace(/\s+/g, ' ').slice(0, 240) };
  await isolated.close();
  console.log(JSON.stringify({ shell, unauthenticated }, null, 2));
} finally {
  await browser.close();
}
