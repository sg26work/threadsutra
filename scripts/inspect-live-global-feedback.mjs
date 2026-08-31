import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');

try {
  const page = browser.contexts().flatMap((context) => context.pages())
    .find((candidate) => candidate.url().includes('demo.vineretail.com/eRetailWeb'));
  if (!page || !page.url().includes('selCompanyLocationBS.action')) {
    throw new Error(`Authenticated LIVE shell unavailable: ${page?.url() || 'no Vin page'}`);
  }

  const shellFunctions = await page.evaluate(() => Object.fromEntries(
    Object.getOwnPropertyNames(window)
      .filter((name) => /alert|confirm|message|blockui/i.test(name) && typeof window[name] === 'function')
      .sort()
      .map((name) => [name, String(window[name]).slice(0, 8000)]),
  ));

  const feedbackView = async () => page.evaluate(() => ['mesgParentDiv', 'mesgDiv', 'messageLabel', 'successMsgParentDiv', 'successMsgDiv', 'successMessageLabel', 'actionMessageDiv']
    .map((id) => document.getElementById(id)).filter(Boolean).map((element) => {
      const style = getComputedStyle(element); const rect = element.getBoundingClientRect();
      return { id: element.id, className: String(element.className), text: (element.innerText || '').trim().replace(/\s+/g, ' '), display: style.display, position: style.position, top: style.top, right: style.right, backgroundColor: style.backgroundColor, color: style.color, zIndex: style.zIndex, rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height } };
    }));
  await page.evaluate(() => window.showAlert('GLOBAL-PARITY-ERROR'));
  await page.waitForTimeout(100);
  const alertView = await feedbackView();
  await page.evaluate(() => { window.stopAlert(); window.showAlertSuccess('GLOBAL-PARITY-SUCCESS'); });
  await page.waitForTimeout(100);
  const successView = await feedbackView();
  await page.evaluate(() => window.stopAlertSuccess());

  const targets = [
    ['Price Zone Master', 'priceZoneActionBS', 'fa fa-arrow-circle-right'],
    ['Vendor Promotions', 'displayVendorPromoEnquiryBS', 'fa fa-arrow-circle-right'],
    ['External Apps', 'ExtAppsEnquiry', 'fa fa-arrow-circle-right'],
  ];
  const modules = [];
  for (const [label, url, icon] of process.env.SHELL_ONLY === '1' ? [] : targets) {
    await page.evaluate(([tabName, srcUrl, css]) => window.openScreen(tabName, srcUrl, css), [label, url, icon]);
    await page.waitForTimeout(500);
    const frame = page.frames().find((candidate) => candidate.url().includes(url));
    if (!frame) throw new Error(`${label} frame unavailable`);
    modules.push(await frame.evaluate((moduleLabel) => {
      const names = Object.getOwnPropertyNames(window).filter((name) => typeof window[name] === 'function');
      const relevant = Object.fromEntries(names.map((name) => [name, String(window[name])])
        .filter(([, source]) => /(?:parent\.|window\.)?(?:showAlert|showConfirm|showMessage|blockUIStart|blockUIEnd)|\.modal\(/i.test(source))
        .slice(0, 80)
        .map(([name, source]) => [name, source.slice(0, 8000)]));
      return { label: moduleLabel, url: location.href, relevant };
    }, label));
  }

  const output = process.env.SUMMARY_ONLY === '1'
    ? {
        shellFunctions: Object.fromEntries(Object.entries(shellFunctions)
          .filter(([name]) => ['showAlert', 'showAlertSuccess', 'blockUIStart', 'blockUIEnd'].includes(name))),
        alertView,
        successView,
        moduleUsage: modules.map(({ label, url, relevant }) => ({
          label,
          url,
          functions: Object.keys(relevant),
          usesParentAlert: Object.values(relevant).some((source) => /(?:window\.)?parent\.showAlert/.test(source)),
          usesParentBlocking: Object.values(relevant).some((source) => /(?:window\.)?parent\.blockUI(?:Start|End)/.test(source)),
          usesNativeConfirm: Object.values(relevant).some((source) => /\bconfirm\s*\(/.test(source)),
        })),
      }
    : { shellFunctions, alertView, successView, modules };
  console.log(JSON.stringify(output, null, 2));
} finally {
  await browser.close();
}
