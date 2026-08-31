import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');

try {
  const page = browser.contexts().flatMap((context) => context.pages())
    .find((candidate) => candidate.url().includes('demo.vineretail.com/eRetailWeb'));
  if (!page || !page.url().includes('selCompanyLocationBS.action')) {
    throw new Error(`Authenticated LIVE shell unavailable: ${page?.url() || 'no Vin page'}`);
  }

  const snapshot = async (stage) => page.evaluate((currentStage) => {
    const visible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && (rect.width > 0 || rect.height > 0);
    };
    const candidates = [...document.querySelectorAll('[id], [class], a, button, iframe')]
      .filter((element) => visible(element))
      .filter((element) => /screen|tab|back|history|bread|menu|iframe|content/i.test(`${element.id} ${element.className} ${element.getAttribute('role') || ''}`))
      .slice(0, 240)
      .map((element) => ({
        tag: element.tagName,
        id: element.id,
        className: String(element.className).slice(0, 240),
        text: (element.innerText || element.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 300),
        href: element.getAttribute('href'),
        onclick: element.getAttribute('onclick'),
        src: element.getAttribute('src'),
      }));
    const functionNames = Object.getOwnPropertyNames(window)
      .filter((name) => /screen|tab|back|history/i.test(name) && typeof window[name] === 'function')
      .sort();
    return {
      stage: currentStage,
      title: document.title,
      bodyText: (document.body.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 2400),
      candidates,
      functions: Object.fromEntries(functionNames.map((name) => [name, String(window[name]).slice(0, 4000)])),
    };
  }, stage);

  const evidence = [];
  evidence.push(await snapshot('initial'));
  const screens = [
    ['Price Zone Master', 'priceZoneActionBS', 'fa fa-arrow-circle-right'],
    ['Vendor Promotions', 'displayVendorPromoEnquiryBS', 'fa fa-arrow-circle-right'],
    ['External Apps', 'ExtAppsEnquiry', 'fa fa-arrow-circle-right'],
  ];
  for (const screen of screens) {
    await page.evaluate(([label, url, icon]) => window.openScreen(label, url, icon), screen);
    await page.waitForTimeout(1000);
    evidence.push(await snapshot(`opened:${screen[0]}`));
  }

  const historyBeforeBack = await page.evaluate(() => ({
    length: window.historyItems.length,
    visibleFrame: document.querySelector('.screenIframe:not([style*="display: none"])')?.id || '',
  }));
  await page.evaluate(() => window.backClick());
  const historyAfterBack = await page.evaluate(() => ({
    length: window.historyItems.length,
    visibleFrame: document.querySelector('.screenIframe:not([style*="display: none"])')?.id || '',
  }));
  await page.evaluate(() => window.openScreen('External Apps', 'ExtAppsEnquiry', 'fa fa-arrow-circle-right'));
  const backHistory = { before: historyBeforeBack, after: historyAfterBack };

  const priceFrame = page.frames().find((frame) => frame.url().includes('priceZoneActionBS'));
  const promoFrame = page.frames().find((frame) => frame.url().includes('displayVendorPromoEnquiryBS'));
  if (!priceFrame || !promoFrame) throw new Error('Representative LIVE frames unavailable for state-retention check');
  const priceInput = priceFrame.locator('input[type="text"]:not([disabled])').first();
  const promoInput = promoFrame.locator('input[type="text"]:not([disabled])').first();
  const priceOriginal = await priceInput.inputValue();
  const promoOriginal = await promoInput.inputValue();
  await priceInput.evaluate((element) => { element.value = 'LIVE-STATE-PRICE'; });
  await promoInput.evaluate((element) => { element.value = 'LIVE-STATE-PROMO'; });
  await page.evaluate(() => window.showScreen('Price Zone Master'));
  await page.evaluate(() => window.showScreen('Vendor Promotions'));
  await page.evaluate(() => window.showScreen('Price Zone Master'));
  const stateRetention = {
    priceZone: await priceInput.inputValue(),
    vendorPromotions: await promoInput.inputValue(),
  };
  await priceInput.evaluate((element, value) => { element.value = value; }, priceOriginal);
  await promoInput.evaluate((element, value) => { element.value = value; }, promoOriginal);

  const result = {
    shellUrl: page.url(),
    frames: page.frames().map((frame) => frame.url()),
    evidence,
    stateRetention,
    backHistory,
  };
  if (process.env.DETAIL === '1') console.log(JSON.stringify(result, null, 2));
  else console.log(JSON.stringify({
    shellUrl: result.shellUrl,
    stages: evidence.map((item) => ({ stage: item.stage, bodyText: item.bodyText })),
    screenFrames: result.frames.filter((url) => !['', 'about:blank'].includes(url)),
    contracts: {
      openScreen: evidence[0].functions.openScreen,
      showScreen: evidence[0].functions.showScreen,
      closeTab: evidence[0].functions.closeTab,
    },
    stateRetention: result.stateRetention,
    backHistory: result.backHistory,
  }, null, 2));
} finally {
  await browser.close();
}
