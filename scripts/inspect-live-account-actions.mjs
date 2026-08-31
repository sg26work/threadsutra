import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
try {
  const page = browser.contexts().flatMap((context) => context.pages()).find((candidate) => candidate.url().includes('selCompanyLocationBS.action'));
  if (!page) throw new Error('Authenticated LIVE shell unavailable');
  const menuTrigger = page.locator('.user-menu > a, .navbar-nav > .user-menu > a').first();
  const describeVisible = async () => page.evaluate(() => {
    const info = (element) => { const box = element.getBoundingClientRect(); return { tag: element.tagName, id: element.id, className: String(element.className), text: (element.innerText || '').replace(/\s+/g, ' ').trim(), title: element.getAttribute('title'), onclick: element.getAttribute('onclick'), x: box.x, y: box.y, width: box.width, height: box.height }; };
    return [...document.querySelectorAll('.modal, .ui-dialog, [role=dialog]')].filter((element) => { const box = element.getBoundingClientRect(); return box.width && box.height && getComputedStyle(element).visibility !== 'hidden'; }).map((root) => ({ root: info(root), controls: [...root.querySelectorAll('input,select,button,a')].filter((element) => { const box = element.getBoundingClientRect(); return box.width && box.height; }).map(info) }));
  });
  const output = {};
  for (const action of ['Profile', 'Test My Internet Speed']) {
    await menuTrigger.click(); await page.waitForTimeout(80);
    await page.locator('.user-menu .dropdown-menu').getByText(action, { exact: true }).click();
    await page.waitForTimeout(500);
    output[action] = { dialogs: await describeVisible(), frames: page.frames().filter((frame) => frame !== page.mainFrame()).map((frame) => frame.url()) };
    await page.evaluate(() => window.jQuery?.('.modal').modal('hide'));
  }
  await menuTrigger.click(); await page.waitForTimeout(80);
  await page.locator('.user-menu .dropdown-menu a[title="User Activity Log"]').click();
  await page.waitForTimeout(500);
  output['User Activity Log'] = { dialogs: await describeVisible(), frames: page.frames().filter((frame) => frame !== page.mainFrame()).map((frame) => frame.url()) };
  await page.evaluate(() => window.jQuery?.('.modal').modal('hide'));
  console.log(JSON.stringify(output, null, 2));
} finally {
  await browser.close();
}
