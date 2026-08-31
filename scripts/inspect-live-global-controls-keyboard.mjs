import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');

try {
  const page = browser.contexts().flatMap((context) => context.pages()).find((candidate) => candidate.url().includes('demo.vineretail.com/eRetailWeb'));
  if (!page || !page.url().includes('selCompanyLocationBS.action')) throw new Error('Authenticated LIVE shell unavailable');

  const targets = [
    { label: 'Price Zone Master', enquiry: 'PriceZoneMaster_IFrame', editor: 'PriceZoneMaster_IFrame', url: 'priceZoneActionBS' },
    { label: 'Vendor Promotions', enquiry: 'VendorPromotions_IFrame', editor: 'VendorPromotionCreateEdit_IFrame', url: 'displayVendorPromoEnquiryBS' },
    { label: 'External Apps', enquiry: 'ExternalApps_IFrame', editor: 'ExternalAppsCreateEdit_IFrame', url: 'ExtAppsEnquiry' },
  ];
  const modules = [];

  for (const target of targets) {
    await page.evaluate(([label, url]) => window.openScreen(label, url, 'fa fa-arrow-circle-right'), [target.label, target.url]);
    await page.waitForTimeout(500);
    const enquiry = page.frames().find((frame) => frame.name() === target.enquiry);
    if (!enquiry) throw new Error(`${target.label} enquiry unavailable`);
    if (target.label === 'Price Zone Master' && !await enquiry.locator('#priceZoneDialog:visible').count()) {
      await enquiry.locator('button:visible').filter({ hasText: /Add New/i }).first().click();
      await enquiry.waitForTimeout(200);
    }
    const editor = page.frames().find((frame) => frame.name() === target.editor) || enquiry;
    const collect = (frame, scope) => frame.evaluate(({ scopeSelector }) => {
      const root = document.querySelector(scopeSelector) || document;
      const visible = (element) => { const rect = element.getBoundingClientRect(); const style = getComputedStyle(element); return style.display !== 'none' && rect.width > 0 && rect.height > 0; };
      const eventSources = (element) => {
        const jq = window.jQuery;
        if (!jq?._data) return {};
        const events = jq._data(element, 'events') || {};
        return Object.fromEntries(Object.entries(events).map(([name, handlers]) => [name, handlers.map((handler) => String(handler.handler).slice(0, 1200))]));
      };
      const controls = [...root.querySelectorAll('input:not([type="hidden"]),select,textarea')].filter(visible).slice(0, 50).map((element) => ({
        tag: element.tagName,
        id: element.id,
        name: element.getAttribute('name'),
        type: element.getAttribute('type'),
        className: String(element.className),
        value: element.value,
        checked: element.checked,
        disabled: element.disabled,
        readOnly: element.readOnly,
        maxLength: element.maxLength,
        min: element.getAttribute('min'),
        max: element.getAttribute('max'),
        step: element.getAttribute('step'),
        placeholder: element.getAttribute('placeholder'),
        title: element.getAttribute('title'),
        inlineEvents: Object.fromEntries(['onkeydown','onkeypress','onkeyup','onchange','onblur'].map((name) => [name, element.getAttribute(name)]).filter(([, value]) => value)),
        jqueryEvents: eventSources(element),
        options: element.tagName === 'SELECT' ? [...element.options].slice(0, 20).map((option) => ({ text: option.text.trim(), value: option.value, selected: option.selected })) : undefined,
      }));
      return { url: location.href, controls };
    }, { scopeSelector: scope });
    const enquirySnapshot = await collect(enquiry, '.ui-jqgrid, body');
    const editorSnapshot = await collect(editor, target.label === 'Price Zone Master' ? '#priceZoneDialog' : 'body');
    const sharedFunctions = await enquiry.evaluate(() => Object.fromEntries(['validatecharacter', 'validateCurrency', 'validateAdvAmount'].map((name) => [name, typeof window[name] === 'function' ? String(window[name]).slice(0, 3000) : null])));
    modules.push({ label: target.label, enquiry: enquirySnapshot, editor: editorSnapshot, sharedFunctions });
  }
  console.log(JSON.stringify({ modules }, null, 2));
} finally {
  await browser.close();
}
