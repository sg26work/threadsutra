import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
try {
  const page = browser.contexts().flatMap((context) => context.pages()).find((candidate) => candidate.url().includes('vineretail'));
  const frame = page?.frames().find((candidate) => candidate.url().includes('displayVendorPromoMaintBS'));
  if (!frame) throw new Error('Live Vendor Promotion editor is unavailable.');
  const evidence = await frame.evaluate(() => {
    const fields = [...document.querySelectorAll('input:not([type=hidden]),select,textarea')].map((element) => ({ tag: element.tagName, id: element.id, name: element.getAttribute('name'), type: element.getAttribute('type'), value: element.value, disabled: element.disabled, checked: element.checked, multiple: element.multiple, options: element.tagName === 'SELECT' ? [...element.options].slice(0, 30).map((option) => `${option.value}:${option.text}`) : undefined }));
    const buttons = [...document.querySelectorAll('button,input[type=button],input[type=submit],a[onclick]')].map((element) => ({ id: element.id, text: (element.textContent || element.getAttribute('value') || '').trim().replace(/\s+/g, ' '), onclick: element.getAttribute('onclick'), disabled: element.disabled })).filter((item) => item.text || item.onclick);
    const labels = [...document.querySelectorAll('label,legend,.panel-title,.nav-tabs li')].map((element) => element.textContent.trim().replace(/\s+/g, ' ')).filter(Boolean);
    const grids = [...document.querySelectorAll('.ui-jqgrid')].map((grid) => ({ id: grid.id, headings: [...grid.querySelectorAll('.ui-jqgrid-htable th')].map((cell) => cell.textContent.trim()).filter(Boolean), pager: grid.querySelector('.ui-jqgrid-pager')?.textContent.trim().replace(/\s+/g, ' ') }));
    const functionNames = ['savePromotion','checkMandatoryFields','prepareGridData','prepareGridData2','fillScreenData','cancelPromotion','clickCancel','addButtonTab1','removePromoLine','addButtonTab2','removeButtonTab2','showVendorPickList','showSkuPickList','openMerchTreePL','resetAll'];
    const functions = Object.fromEntries(functionNames.map((name) => [name, typeof window[name] === 'function' ? String(window[name]) : null]));
    return { url: location.href, labels, fields, buttons, grids, functions };
  });
  console.log(JSON.stringify(evidence, null, 2));
} finally { await browser.close(); }
