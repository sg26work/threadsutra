import { chromium } from 'playwright';

const base = process.env.ERETAIL_BASE_URL || 'http://127.0.0.1:3011';
const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 623 } });
  await page.addInitScript(() => localStorage.setItem('vin_user', JSON.stringify({ username: 'shell-audit' })));
  await page.goto(`${base}/app/dashboard`, { waitUntil: 'domcontentloaded' });

  const inspectAt = async (viewport) => {
    await page.setViewportSize(viewport);
    const masterButton = page.getByTitle('Master', { exact: true });
    await masterButton.hover();
    await page.getByText('SKU Management', { exact: true }).waitFor();
    await page.locator('[data-menu-group="SKU Management"]').evaluate((element) => { element.scrollTop = 0; });

    const snapshot = async (stage) => page.evaluate((label) => {
      const rect = (element) => {
        if (!element) return null;
        const box = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return { x: box.x, y: box.y, width: box.width, height: box.height, overflowX: style.overflowX, overflowY: style.overflowY, scrollHeight: element.scrollHeight, clientHeight: element.clientHeight, scrollTop: element.scrollTop };
      };
      const byText = (text) => [...document.querySelectorAll('*')].find((element) => element.children.length === 0 && element.textContent?.trim() === text);
      const master = document.querySelector('button[title="Master"]');
      const rail = document.querySelector('[data-sidebar-rail]');
      const flyout = document.querySelector('[data-menu-flyout-body]');
      const skuHeading = byText('SKU Management');
      const skuGroup = skuHeading?.parentElement;
      const header = document.querySelector('header');
      const main = document.querySelector('main');
      const footer = document.querySelector('footer');
      return {
        stage: label,
        page: { scrollY, bodyHeight: document.body.scrollHeight, documentHeight: document.documentElement.scrollHeight },
        header: rect(header), rail: rect(rail), masterButton: rect(master), flyout: rect(flyout), skuGroup: rect(skuGroup), main: rect(main), footer: rect(footer),
        visibleSliderCount: [...document.querySelectorAll('[class*=slim],[class*=slider],[class*=resize],[class*=drag],input[type=range]')].filter((element) => { const box = element.getBoundingClientRect(); return box.width > 0 && box.height > 0; }).length,
      };
    }, stage);

    const evidence = [await snapshot('opened')];
    const skuGroup = page.getByText('SKU Management', { exact: true }).locator('..');
    const box = await skuGroup.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.wheel(0, 800);
      await page.waitForTimeout(100);
      evidence.push(await snapshot('wheel-down'));
    }
    return { viewport, evidence };
  };

  const results = [];
  for (const viewport of [{ width: 1200, height: 623 }, { width: 1200, height: 480 }]) results.push(await inspectAt(viewport));
  console.log(JSON.stringify({ results }, null, 2));
} finally {
  await browser.close();
}
