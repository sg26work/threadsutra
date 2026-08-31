import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
try {
  const page = browser.contexts().flatMap((context) => context.pages()).find((candidate) => candidate.url().includes('selCompanyLocationBS.action'));
  if (!page) throw new Error('Authenticated LIVE shell unavailable');
  const info = (selector) => page.locator(selector).evaluate((root) => {
    const describe = (element) => { const box = element.getBoundingClientRect(); return { tag: element.tagName, id: element.id, text: (element.innerText || element.value || '').replace(/\s+/g, ' ').trim(), type: element.getAttribute('type'), value: element.value, title: element.getAttribute('title'), onclick: element.getAttribute('onclick'), maxlength: element.getAttribute('maxlength'), x: box.x, y: box.y, width: box.width, height: box.height }; };
    return { root: describe(root), controls: [...root.querySelectorAll('input,select,button,a,textarea')].filter((element) => { const box = element.getBoundingClientRect(); return box.width > 0 && box.height > 0; }).map(describe), text: (root.innerText || '').replace(/\s+/g, ' ').trim() };
  });
  const account = page.locator('.user-menu > a, .navbar-nav > .user-menu > a').first();
  await account.click();
  await page.locator('a[title="Change Password"]').click();
  await page.waitForTimeout(150);
  const changePassword = await info('#changePasswordDialog');
  await page.evaluate(() => window.jQuery('#changePasswordDialog').modal('hide'));
  const functions = await page.evaluate(() => Object.fromEntries(['resetPasswordChangeFields','clickSave','checkPasswordStrength','saveChangePassword','changeUserPassword','passwordProcessBar','showUserSessionLogDetails','openSpeedTestDialog'].filter((name) => typeof window[name] === 'function').map((name) => [name, String(window[name]).slice(0, 6000)])));
  console.log(JSON.stringify({ changePassword, functions }, null, 2));
} finally {
  await browser.close();
}
