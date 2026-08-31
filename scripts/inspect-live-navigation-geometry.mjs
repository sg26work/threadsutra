import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
try {
  const page = browser.contexts().flatMap((context) => context.pages()).find((candidate) => candidate.url().includes('selCompanyLocationBS.action'));
  if (!page) throw new Error('Authenticated LIVE shell unavailable');
  const entries = page.locator('.sidebar-menu > li');
  const output = [];
  for (let index = 0; index < await entries.count(); index += 1) {
    const entry = entries.nth(index);
    await entry.hover();
    await page.waitForTimeout(80);
    output.push(await entry.evaluate((root, entryIndex) => ({
      index: entryIndex,
      groups: [...root.querySelectorAll('.menuDiv')].map((group) => {
        const rect = group.getBoundingClientRect();
        const style = getComputedStyle(group);
        return {
          title: (group.firstElementChild?.textContent || '').replace(/\s+/g, ' ').trim(),
          rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
          display: style.display,
          visibility: style.visibility,
          opacity: style.opacity,
          items: [...group.querySelectorAll('a')].map((anchor) => {
            const itemRect = anchor.getBoundingClientRect();
            return {
              label: (anchor.textContent || '').replace(/\s+/g, ' ').trim(),
              rect: { x: itemRect.x, y: itemRect.y, width: itemRect.width, height: itemRect.height },
              visible: !!(itemRect.width && itemRect.height),
            };
          }),
        };
      }),
    }), index));
  }
  await page.mouse.move(1100, 20);
  console.log(JSON.stringify(output, null, 2));
} finally {
  await browser.close();
}
