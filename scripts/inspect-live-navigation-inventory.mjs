import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
try {
  const page = browser.contexts().flatMap((context) => context.pages()).find((candidate) => candidate.url().includes('selCompanyLocationBS.action'));
  if (!page) throw new Error('Authenticated LIVE shell unavailable');
  await page.evaluate(() => scrollTo(0, 0));
  const entries = page.locator('.sidebar-menu > li');
  const inventory = [];
  for (let index = 0; index < await entries.count(); index += 1) {
    const entry = entries.nth(index);
    const trigger = entry.locator(':scope > a');
    const title = (await trigger.innerText()).replace(/\s+/g, ' ').trim();
    await entry.hover();
    await page.waitForTimeout(80);
    const details = await entry.evaluate((root) => ({
      groups: [...root.querySelectorAll('.menuDiv')].map((group) => ({
        title: (group.querySelector('.header, h1, h2, h3, h4, strong, b')?.textContent || group.firstElementChild?.textContent || '').replace(/\s+/g, ' ').trim(),
        items: [...group.querySelectorAll('a')].map((anchor) => ({ label: (anchor.textContent || '').replace(/\s+/g, ' ').trim(), href: anchor.getAttribute('href'), onclick: anchor.getAttribute('onclick') })),
      })),
      direct: root.querySelector(':scope > a')?.getAttribute('onclick') || root.querySelector(':scope > a')?.getAttribute('href'),
    }));
    inventory.push({ index, title, ...details });
  }
  await page.mouse.move(1100, 20);
  console.log(JSON.stringify(inventory, null, 2));
} finally {
  await browser.close();
}
