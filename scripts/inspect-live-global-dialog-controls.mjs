import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');

try {
  const page = browser.contexts().flatMap((context) => context.pages()).find((candidate) => candidate.url().includes('demo.vineretail.com/eRetailWeb'));
  if (!page || !page.url().includes('selCompanyLocationBS.action')) throw new Error('Authenticated LIVE shell unavailable');
  const targets = [
    ['Price Zone Master', 'priceZoneActionBS', 'fa fa-arrow-circle-right'],
    ['Vendor Promotions', 'displayVendorPromoEnquiryBS', 'fa fa-arrow-circle-right'],
    ['External Apps', 'ExtAppsEnquiry', 'fa fa-arrow-circle-right'],
  ];
  const modules = [];

  for (const [label, url, icon] of targets) {
    await page.evaluate(([tabName, srcUrl, css]) => window.openScreen(tabName, srcUrl, css), [label, url, icon]);
    await page.waitForTimeout(700);
    const beforeFrame = page.frames().find((candidate) => candidate.url().includes(url));
    if (!beforeFrame) throw new Error(`${label} frame unavailable`);
    const frameName = beforeFrame.name();
    const beforeUrl = beforeFrame.url();
    const existingClose = beforeFrame.locator('.modal:visible button.close, .ui-dialog:visible .ui-dialog-titlebar-close').first();
    if (await existingClose.count()) { await existingClose.click({ force: true }).catch(() => {}); await beforeFrame.waitForTimeout(150); }
    const add = beforeFrame.locator('button:visible, a:visible').filter({ hasText: /Add New/i }).first();
    if (!await add.count()) { modules.push({ label, beforeUrl, outcome: 'no-add-control' }); continue; }
    await add.click({ timeout: 5000 });
    await page.waitForTimeout(700);
    const afterFrame = page.frames().find((candidate) => candidate.name() === frameName) || page.frames().find((candidate) => candidate.url().includes(url));
    if (!afterFrame) { modules.push({ label, beforeUrl, outcome: 'frame-closed' }); continue; }
    const snapshot = await afterFrame.evaluate((moduleLabel) => {
      const visible = (element) => { const rect = element.getBoundingClientRect(); const style = getComputedStyle(element); return style.display !== 'none' && rect.width > 0 && rect.height > 0; };
      const dialogs = [...document.querySelectorAll('[role="dialog"], .ui-dialog, .modal')].filter(visible).map((element) => {
        const rect = element.getBoundingClientRect(); const style = getComputedStyle(element);
        return { id: element.id, className: String(element.className), role: element.getAttribute('role'), title: (element.querySelector('.ui-dialog-title,.modal-title,h1,h2,h3,h4')?.textContent || '').trim(), position: style.position, zIndex: style.zIndex, rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }, closeControls: [...element.querySelectorAll('button,a')].filter(visible).map((control) => ({ text: (control.textContent || '').trim(), title: control.getAttribute('title'), className: String(control.className) })).filter((control) => /close|cancel|ui-dialog-titlebar-close/i.test(`${control.text} ${control.title} ${control.className}`)) };
      });
      const controls = [...document.querySelectorAll('input:not([type="hidden"]),select,textarea,button,a')].filter(visible).slice(0, 80).map((control) => ({ tag: control.tagName, id: control.id, type: control.getAttribute('type'), text: (control.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80), aria: control.getAttribute('aria-label'), title: control.getAttribute('title') }));
      return { label: moduleLabel, dialogs, controls, active: { tag: document.activeElement?.tagName, id: document.activeElement?.id, type: document.activeElement?.getAttribute('type') } };
    }, label);
    const afterUrl = afterFrame.url();
    let afterEscape = null;
    if (snapshot.dialogs.length) {
      await afterFrame.locator('body').press('Escape');
      await afterFrame.waitForTimeout(150);
      afterEscape = await afterFrame.locator('[role="dialog"]:visible, .ui-dialog:visible, .modal:visible').count();
      if (afterEscape) await afterFrame.locator('.modal:visible button.close, .ui-dialog:visible .ui-dialog-titlebar-close').first().click({ timeout: 2000 }).catch(() => {});
    }
    const frameTopology = page.frames().map((candidate) => ({ name: candidate.name(), url: candidate.url() })).filter((candidate) => candidate.url.includes('eRetailWeb'));
    modules.push({ beforeUrl, afterUrl, outcome: snapshot.dialogs.length ? 'dialog' : afterUrl !== beforeUrl ? 'frame-navigation' : 'inline-editor', afterEscape, frameTopology, ...snapshot });
  }
  console.log(JSON.stringify({ modules }, null, 2));
} finally {
  await browser.close();
}
