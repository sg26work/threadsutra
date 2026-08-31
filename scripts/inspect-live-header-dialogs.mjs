import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
try {
  const page = browser.contexts().flatMap((context) => context.pages()).find((candidate) => candidate.url().includes('selCompanyLocationBS.action'));
  if (!page) throw new Error('Authenticated LIVE shell unavailable');
  const describe = async (selector) => page.locator(selector).evaluate((root) => {
    const info = (element) => { const box = element.getBoundingClientRect(); return { tag: element.tagName, id: element.id, className: String(element.className), text: (element.innerText || '').replace(/\s+/g, ' ').trim(), value: element.value, title: element.getAttribute('title'), onclick: element.getAttribute('onclick'), x: box.x, y: box.y, width: box.width, height: box.height }; };
    return { root: info(root), controls: [...root.querySelectorAll('input,select,button,a')].filter((element) => { const box = element.getBoundingClientRect(); return box.width > 0 && box.height > 0; }).map(info), html: root.outerHTML.slice(0, 12000) };
  });
  await page.locator('[title="Switch Location"]').first().click();
  await page.waitForTimeout(500);
  const switchDialog = await describe('#changeCompanyDialog');
  const switchFrame = page.frames().find((frame) => frame.url().includes('selCompanyLocationBS?operation=switch'));
  const switchFrameControls = switchFrame ? await switchFrame.locator('body').evaluate((root) => [...root.querySelectorAll('input,select,button,a')].filter((element) => { const box = element.getBoundingClientRect(); return box.width > 0 && box.height > 0; }).map((element) => { const box = element.getBoundingClientRect(); return { tag: element.tagName, id: element.id, text: (element.innerText || element.value || '').replace(/\s+/g, ' ').trim(), value: element.value, type: element.getAttribute('type'), onclick: element.getAttribute('onclick'), x: box.x, y: box.y, width: box.width, height: box.height }; })) : [];
  await page.evaluate(() => window.jQuery('#changeCompanyDialog').modal('hide'));
  await page.locator('.user-menu > a, .navbar-nav > .user-menu > a').first().click();
  await page.waitForTimeout(100);
  const accountMenu = await describe('.user-menu .dropdown-menu');
  await page.keyboard.press('Escape');
  const functions = await page.evaluate(() => Object.fromEntries(['openSwitchDialog', 'switchCompLoc', 'loadUserProfile', 'changePassword'].filter((name) => typeof window[name] === 'function').map((name) => [name, String(window[name]).slice(0, 5000)])));
  console.log(JSON.stringify({ switchDialog, switchFrameControls, accountMenu, functions }, null, 2));
} finally {
  await browser.close();
}
