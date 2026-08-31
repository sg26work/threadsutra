import { chromium } from 'playwright';

const localBase = process.env.ERETAIL_BASE_URL || 'http://127.0.0.1:3011';
const cdp = await chromium.connectOverCDP('http://127.0.0.1:9222');
const localBrowser = await chromium.launch({ headless: true });
try {
  const live = cdp.contexts().flatMap((context) => context.pages()).find((page) => page.url().includes('selCompanyLocationBS.action'));
  if (!live) throw new Error('Authenticated LIVE shell unavailable');
  const local = await localBrowser.newPage({ viewport: { width: 1200, height: 623 } });
  await local.addInitScript(() => localStorage.setItem('vin_user', JSON.stringify({ username: 'navigation-audit' })));
  await local.goto(`${localBase}/app/dashboard`, { waitUntil: 'domcontentloaded' });

  const readLive = async () => {
    const entries = live.locator('.sidebar-menu > li');
    const result = [];
    for (let index = 0; index < await entries.count(); index += 1) {
      const entry = entries.nth(index);
      await entry.hover(); await live.waitForTimeout(40);
      result.push(await entry.evaluate((root) => ({
        groups: [...root.querySelectorAll('.menuDiv')].filter((group) => !group.parentElement?.closest('.menuDiv')).map((group) =>
          (group.querySelector(':scope > .header, :scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > strong, :scope > b')?.textContent || '').replace(/\s+/g, ' ').trim()
        ).filter(Boolean),
        items: [...root.querySelectorAll('.menuDiv a')].map((anchor) => (anchor.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean),
      })));
    }
    return result;
  };
  const readLocal = async () => {
    const buttons = local.locator('button[title]').filter({ has: local.locator('svg') });
    const railTitles = ['Dashboard','Master','Procurement','Sales','WMS','Returns & Transfers','Admin','Reports'];
    const result = [];
    for (const title of railTitles) {
      const button = local.getByTitle(title, { exact: true });
      await button.hover(); await local.waitForTimeout(40);
      const groups = await local.locator('[data-menu-flyout]').count() ? await local.locator('[data-menu-group]').evaluateAll((elements) => elements.map((group) => ({
        group: group.getAttribute('data-menu-group') || '',
        items: [...group.querySelectorAll('button')].map((button) => (button.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean),
      }))) : [];
      result.push({ groups: groups.map((group) => group.group).filter(Boolean), items: groups.flatMap((group) => group.items) });
      await local.mouse.move(1100, 20);
    }
    return result;
  };
  const [liveInventory, localInventory] = await Promise.all([readLive(), readLocal()]);
  const rails = ['Dashboard','Master','Procurement','Sales','WMS','Returns & Transfers','Admin','Reports'];
  const normalize = (value) => value.replace(/\s+/g, ' ').trim();
  const differences = rails.map((rail, index) => {
    const liveGroups = liveInventory[index] || { groups: [], items: [] }, localGroups = localInventory[index] || { groups: [], items: [] };
    const liveItems = liveGroups.items.map(normalize);
    const localItems = localGroups.items.map(normalize);
    return {
      rail,
      liveGroups: liveGroups.groups, localGroups: localGroups.groups,
      missingLocal: liveItems.filter((item) => !localItems.includes(item)),
      extraLocal: localItems.filter((item) => !liveItems.includes(item)),
      liveItemCount: liveItems.length, localItemCount: localItems.length,
    };
  });
  console.log(JSON.stringify({ differences, totals: { live: differences.reduce((sum, item) => sum + item.liveItemCount, 0), local: differences.reduce((sum, item) => sum + item.localItemCount, 0) } }, null, 2));
} finally {
  await localBrowser.close();
  await cdp.close();
}
