import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
try {
  const page = browser.contexts().flatMap((context) => context.pages()).find((candidate) => candidate.url().includes('vineretail'));
  if (!page) throw new Error('Authenticated live eRetail page is unavailable.');
  await page.evaluate(() => window.openScreen('Vendor Promotions', 'displayVendorPromoEnquiryBS', 'fa fa-arrow-circle-right'));
  await page.waitForTimeout(1500);
  const frame = page.frames().find((candidate) => candidate.url().includes('displayVendorPromoEnquiryBS'));
  if (!frame) throw new Error('Vendor Promotions frame did not open.');
  const evidence = await frame.evaluate(async () => {
    const controls = [...document.querySelectorAll('input:not([type=hidden]),select,textarea,button,a')].map((element) => ({ tag: element.tagName, id: element.id, name: element.getAttribute('name'), type: element.getAttribute('type'), text: (element.textContent || element.getAttribute('value') || '').trim().replace(/\s+/g, ' ').slice(0, 300), value: element.value, onclick: element.getAttribute('onclick'), onchange: element.getAttribute('onchange'), disabled: element.disabled, multiple: element.multiple, optionCount: element.tagName === 'SELECT' ? element.options.length : undefined, options: element.tagName === 'SELECT' ? [...element.options].slice(0, 30).map((option) => ({ value: option.value, text: option.text })) : undefined }));
    const forms = [...document.forms].map((form) => ({ id: form.id, name: form.name, action: form.action, method: form.method, fields: [...new FormData(form).entries()].map(([key, value]) => [key, typeof value === 'string' ? value : `[File:${value.name}]`]) }));
    const grids = [...document.querySelectorAll('.ui-jqgrid')].map((grid) => ({ id: grid.id, headings: [...grid.querySelectorAll('.ui-jqgrid-htable th')].map((cell) => cell.textContent.trim()), text: grid.textContent.trim().replace(/\s+/g, ' ').slice(0, 3000) }));
    const names = [...new Set(controls.flatMap((control) => `${control.onclick || ''} ${control.onchange || ''}`.match(/[A-Za-z_$][\w$]*(?=\()/g) || []))];
    const functions = Object.fromEntries(names.map((name) => [name, typeof window[name] === 'function' ? String(window[name]) : null]));
    const inline = [...document.scripts].filter((script) => !script.src).map((script) => script.textContent || '').join('\n');
    const endpointSnippets = [...inline.matchAll(/.{0,500}(?:url\s*:|\.action|json[A-Z]|vendorPromo)[^\n;]{0,1200}/gi)].map((match) => match[0]).slice(0, 80);
    return { url: location.href, body: document.body.innerText.slice(0, 12000), controls, forms, grids, functions, endpointSnippets };
  });
  const requestPromise = page.waitForRequest((request) => request.url().includes('vendorPromotionSearch'));
  await frame.locator('#SearchBtn').click();
  const request = await requestPromise; const response = await request.response();
  evidence.search = { url: request.url(), method: request.method(), payload: request.postData(), status: response?.status(), response: (await response?.text())?.slice(0, 12000) };
  await frame.evaluate(() => window.addNew()); await page.waitForTimeout(1200);
  const editor = page.frames().find((candidate) => candidate.url().includes('displayVendorPromoMaintBS'));
  evidence.editor = editor ? await editor.evaluate(() => {
    const controls = [...document.querySelectorAll('input:not([type=hidden]),select,textarea,button,a')].map((element) => ({ tag: element.tagName, id: element.id, name: element.getAttribute('name'), type: element.getAttribute('type'), text: (element.textContent || element.getAttribute('value') || '').trim().replace(/\s+/g, ' ').slice(0, 240), value: element.value, onclick: element.getAttribute('onclick'), onchange: element.getAttribute('onchange'), disabled: element.disabled, multiple: element.multiple, optionCount: element.tagName === 'SELECT' ? element.options.length : undefined, options: element.tagName === 'SELECT' ? [...element.options].slice(0, 40).map((option) => ({ value: option.value, text: option.text })) : undefined }));
    const names = [...new Set(controls.flatMap((control) => `${control.onclick || ''} ${control.onchange || ''}`.match(/[A-Za-z_$][\w$]*(?=\()/g) || []))];
    const functions = Object.fromEntries(names.map((name) => [name, typeof window[name] === 'function' ? String(window[name]) : null]));
    const forms = [...document.forms].map((form) => ({ id: form.id, name: form.name, action: form.action, method: form.method, fields: [...new FormData(form).entries()].map(([key, value]) => [key, typeof value === 'string' ? value : `[File:${value.name}]`]) }));
    const grids = [...document.querySelectorAll('.ui-jqgrid')].map((grid) => ({ id: grid.id, headings: [...grid.querySelectorAll('.ui-jqgrid-htable th')].map((cell) => cell.textContent.trim()), text: grid.textContent.trim().replace(/\s+/g, ' ').slice(0, 4000) }));
    const inline = [...document.scripts].filter((script) => !script.src).map((script) => script.textContent || '').join('\n');
    const endpointSnippets = [...inline.matchAll(/.{0,600}(?:url\s*:|\.action|saveVendor|Promo)[^\n;]{0,1800}/gi)].map((match) => match[0]).slice(0, 120);
    return { url: location.href, body: document.body.innerText.slice(0, 18000), controls, forms, grids, functions, endpointSnippets };
  }) : null;
  console.log(JSON.stringify(evidence, null, 2));
} finally { await browser.close(); }
