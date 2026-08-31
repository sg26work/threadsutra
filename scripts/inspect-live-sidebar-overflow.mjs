import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
try {
  const page = browser.contexts().flatMap((context) => context.pages()).find((candidate) => candidate.url().includes('selCompanyLocationBS.action'));
  if (!page) throw new Error('Authenticated LIVE shell unavailable');
  const original = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }));

  const inspectAt = async (viewport) => {
    await page.setViewportSize(viewport);
    await page.evaluate(() => scrollTo(0, 0));
    const master = page.locator('.sidebar-menu > li').filter({ hasText: /^\s*Master\s*/ }).first();
    await master.hover();
    await page.waitForTimeout(200);
    const snapshot = (stage) => master.evaluate((root, label) => {
      const describe = (element) => { const box = element.getBoundingClientRect(); const style = getComputedStyle(element); return { text: (element.innerText || '').split(/\n+/).map((value) => value.trim()).filter(Boolean), x: box.x, y: box.y, width: box.width, height: box.height, overflowX: style.overflowX, overflowY: style.overflowY, scrollHeight: element.scrollHeight, clientHeight: element.clientHeight, scrollTop: element.scrollTop }; };
      const groups = [...root.querySelectorAll('.menuDiv')];
      const skuGroup = groups.find((element) => /^\s*SKU Management\s*/.test(element.innerText || ''));
      return {
        stage: label,
        page: { scrollY, bodyHeight: document.body.scrollHeight, documentHeight: document.documentElement.scrollHeight },
        flyout: describe(root.querySelector(':scope > .treeview-menu')),
        skuGroup: skuGroup ? describe(skuGroup) : null,
        visibleSliderCount: [...document.querySelectorAll('[class*=slim],[class*=slider],[class*=resize],[class*=drag],input[type=range]')].filter((element) => { const box = element.getBoundingClientRect(); return box.width > 0 && box.height > 0; }).length,
      };
    }, stage);
    const evidence = [await snapshot('opened')];
    const box = await master.locator(':scope > .treeview-menu').boundingBox();
    if (box) {
      const overflowingGroup = master.locator('.menuDiv').filter({ hasText: /^\s*SKU Management\s*/ }).first();
      const groupBox = await overflowingGroup.boundingBox();
      await page.mouse.move(groupBox ? groupBox.x + groupBox.width / 2 : box.x + 300, groupBox ? groupBox.y + groupBox.height / 2 : box.y + 200);
      await page.mouse.wheel(0, 800);
      await page.waitForTimeout(200);
      evidence.push(await snapshot('wheel-down'));
      await page.mouse.wheel(0, -800);
      await page.waitForTimeout(200);
      evidence.push(await snapshot('wheel-up'));
    }
    return { viewport, evidence };
  };

  const results = [];
  for (const viewport of [{ width: 1200, height: 623 }, { width: 1200, height: 480 }]) results.push(await inspectAt(viewport));
  await page.setViewportSize(original);
  await page.evaluate(() => scrollTo(0, 0));
  console.log(JSON.stringify({ original, results }, null, 2));
} finally {
  await browser.close();
}
