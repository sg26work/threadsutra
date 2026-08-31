import { chromium } from 'playwright';

const localBase = process.env.ERETAIL_BASE_URL || 'http://127.0.0.1:3011';
const cdp = await chromium.connectOverCDP('http://127.0.0.1:9222');
const localBrowser = await chromium.launch({ headless: true });
const rails = ['Dashboard', 'Master', 'Procurement', 'Sales', 'WMS', 'Returns & Transfers', 'Admin', 'Reports'];
try {
  const live = cdp.contexts().flatMap((context) => context.pages()).find((page) => page.url().includes('selCompanyLocationBS.action'));
  if (!live) throw new Error('Authenticated LIVE shell unavailable');
  const local = await localBrowser.newPage({ viewport: { width: 1200, height: 623 } });
  await local.addInitScript(() => localStorage.setItem('vin_user', JSON.stringify({ username: 'navigation-geometry-audit' })));
  await local.goto(`${localBase}/app/dashboard`, { waitUntil: 'domcontentloaded' });
  const differences = [];
  for (let index = 0; index < rails.length; index += 1) {
    const liveEntry = live.locator('.sidebar-menu > li').nth(index);
    await liveEntry.hover(); await live.waitForTimeout(50);
    const liveData = await liveEntry.evaluate((root) => {
      const toRect = (element) => { const value = element.getBoundingClientRect(); return { x: value.x, y: value.y, width: value.width, height: value.height }; };
      return {
        groups: [...root.querySelectorAll('.menuDiv')].filter((group) => !group.parentElement?.closest('.menuDiv')).map((group) => ({ title: (group.firstElementChild?.textContent || '').replace(/\s+/g, ' ').trim(), rect: toRect(group) })),
        items: [...root.querySelectorAll('.menuDiv a')].map((item) => ({ label: (item.textContent || '').replace(/\s+/g, ' ').trim(), rect: toRect(item) })),
      };
    });
    const localButton = local.getByTitle(rails[index], { exact: true });
    await localButton.hover(); await local.waitForTimeout(50);
    const localData = await local.locator('[data-menu-flyout]').evaluate((root) => {
      const toRect = (element) => { const value = element.getBoundingClientRect(); return { x: value.x, y: value.y, width: value.width, height: value.height }; };
      return {
        groups: [...root.querySelectorAll('[data-menu-group]')].map((group) => ({ title: group.getAttribute('data-menu-group') || '', rect: toRect(group) })),
        items: [...root.querySelectorAll('[data-menu-group] button')].map((item) => ({ label: (item.textContent || '').replace(/\s+/g, ' ').trim(), rect: toRect(item) })),
      };
    });
    const itemDiffs = liveData.items.map((item, itemIndex) => {
      const candidate = localData.items[itemIndex];
      return { label: item.label, localLabel: candidate?.label, delta: candidate ? Object.fromEntries(Object.keys(item.rect).map((key) => [key, +(candidate.rect[key] - item.rect[key]).toFixed(2)])) : null };
    }).filter((item) => item.localLabel !== item.label || !item.delta || Object.values(item.delta).some((value) => Math.abs(value) > 2));
    differences.push({ rail: rails[index], liveGroups: liveData.groups, localGroups: localData.groups, liveItems: process.env.DETAIL ? liveData.items.slice(0, 3) : undefined, localItems: process.env.DETAIL ? localData.items.slice(0, 3) : undefined, itemDiffs });
    await local.mouse.move(1100, 20);
  }
  const filter = process.env.RAIL;
  const selected = filter ? differences.filter((entry) => entry.rail === filter) : differences;
  console.log(JSON.stringify(process.env.SUMMARY ? selected.map(({ rail, liveGroups, localGroups }) => ({ rail, liveGroups, localGroups })) : selected, null, 2));
} finally {
  await localBrowser.close();
  await cdp.close();
}
