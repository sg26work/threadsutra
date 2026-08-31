import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');

try {
  const context = browser.contexts()[0];
  const page = browser.contexts().flatMap((candidate) => candidate.pages()).find((candidate) => candidate.url().includes('demo.vineretail.com/eRetailWeb'));
  if (!page || !page.url().includes('selCompanyLocationBS.action')) throw new Error('Authenticated LIVE shell unavailable');

  const inspect = () => page.evaluate(() => {
    const jq = window.jQuery?.ajaxSettings;
    return {
      url: location.href.replace(/[?#].*$/, ''),
      storageKeys: {
        local: Object.keys(localStorage),
        session: Object.keys(sessionStorage),
      },
      ajax: jq ? {
        type: jq.type,
        contentType: jq.contentType,
        processData: jq.processData,
        async: jq.async,
        timeout: jq.timeout,
        cache: jq.cache,
        traditional: jq.traditional,
      } : null,
      beforeUnload: typeof window.onbeforeunload,
      shellVisible: Boolean(document.querySelector('.main-sidebar, .sidebar-menu')),
    };
  });

  const before = await inspect();
  const cookieNames = (await context.cookies(page.url())).map(({ name, domain, sameSite, secure, httpOnly }) => ({ name, domain, sameSite, secure, httpOnly }));
  const resources = await page.evaluate(() => performance.getEntriesByType('resource').map((entry) => entry.name).filter((name) => name.includes('/eRetailWeb/')).slice(-30).map((name) => name.replace(/[?#].*$/, '')));
  console.log(JSON.stringify({ session: before, cookieNames, recentResourcePaths: [...new Set(resources)].map((url) => new URL(url).pathname) }, null, 2));
} finally {
  await browser.close();
}
