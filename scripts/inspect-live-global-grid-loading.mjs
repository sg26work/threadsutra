import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');

try {
  const page = browser.contexts().flatMap((context) => context.pages())
    .find((candidate) => candidate.url().includes('demo.vineretail.com/eRetailWeb'));
  if (!page || !page.url().includes('selCompanyLocationBS.action')) {
    throw new Error(`Authenticated LIVE shell unavailable: ${page?.url() || 'no Vin page'}`);
  }

  await page.evaluate(() => window.blockUIStart(60000));
  await page.waitForTimeout(100);
  const shellBlocking = await page.evaluate(() => {
    const candidates = [...document.querySelectorAll('body *')].filter((element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && Number(style.zIndex) >= 1000 && rect.width > 0 && rect.height > 0;
    });
    return candidates.map((element) => {
      const style = getComputedStyle(element); const rect = element.getBoundingClientRect();
      return {
        id: element.id,
        className: String(element.className),
        text: (element.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 200),
        position: style.position,
        zIndex: style.zIndex,
        backgroundColor: style.backgroundColor,
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      };
    });
  });
  await page.evaluate(() => window.blockUIEnd());

  const targets = [
    ['Price Zone Master', 'priceZoneActionBS', 'fa fa-arrow-circle-right'],
    ['Vendor Promotions', 'displayVendorPromoEnquiryBS', 'fa fa-arrow-circle-right'],
    ['External Apps', 'ExtAppsEnquiry', 'fa fa-arrow-circle-right'],
  ];
  const modules = [];

  for (const [label, url, icon] of targets) {
    await page.evaluate(([tabName, srcUrl, css]) => window.openScreen(tabName, srcUrl, css), [label, url, icon]);
    await page.waitForTimeout(700);
    const frame = page.frames().find((candidate) => candidate.url().includes(url));
    if (!frame) throw new Error(`${label} frame unavailable`);
    modules.push(await frame.evaluate((moduleLabel) => {
      const visible = (element) => {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 || rect.height > 0;
      };
      const grids = [...document.querySelectorAll('.ui-jqgrid')].filter(visible).map((grid) => {
        const table = grid.querySelector('table.ui-jqgrid-btable');
        const pager = grid.querySelector('.ui-jqgrid-pager');
        const emptyRows = table ? [...table.querySelectorAll('tr.jqgrow')].length === 0 : true;
        return {
          id: grid.id,
          tableId: table?.id || '',
          columns: [...grid.querySelectorAll('.ui-jqgrid-htable th')].map((th) => (th.textContent || '').trim()).filter(Boolean),
          rowCount: table?.querySelectorAll('tr.jqgrow').length || 0,
          emptyRows,
          pagerText: (pager?.innerText || '').replace(/\s+/g, ' ').trim(),
          pageSizeOptions: [...(pager?.querySelectorAll('select option') || [])].map((option) => option.textContent?.trim()),
          pageInput: pager?.querySelector('input.ui-pg-input')?.value || '',
          loadingText: (grid.querySelector('.loading')?.textContent || '').trim(),
          loadingDisplay: grid.querySelector('.loading') ? getComputedStyle(grid.querySelector('.loading')).display : '',
        };
      });
      const progressFunctions = Object.fromEntries(['showProgressBar', 'hideProgressBar'].map((name) => [name, typeof window[name] === 'function' ? String(window[name]) : null]));
      return { label: moduleLabel, url: location.href, grids, progressFunctions };
    }, label));
  }

  console.log(JSON.stringify({ shellBlocking, modules }, null, 2));
} finally {
  await browser.close();
}
