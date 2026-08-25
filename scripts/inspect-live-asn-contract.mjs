import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
try {
  const pages = browser.contexts().flatMap((context) => context.pages());
  const page = pages.find((candidate) => candidate.url().includes('vineretail'));
  if (!page) throw new Error('Authenticated live eRetail page is unavailable.');
  const frame = page.frames().find((candidate) => candidate.url().includes('createASNBS'));
  if (!frame) throw new Error('Live Create ASN frame is unavailable.');
  const evidence = await frame.evaluate(async () => {
    const names = ['clickSave', 'clickConfirm', 'clickCancel', 'clickClose', 'saveASNData', 'validateMandatoryData', 'restrictRowVersionForASN', 'prepareGridData', 'saveBtnInbMainOnClick', 'asnTags_AddButton_click', 'asnTags_SaveButton_click', 'asnTags_RemoveButton_click', 'importASN', 'resetImport', 'exportImport', 'confirmPrint'];
    const functions = Object.fromEntries(names.map((name) => {
      const value = window[name];
      return [name, typeof value === 'function' ? String(value) : null];
    }));
    const forms = [...document.forms].map((form) => ({ id: form.id, name: form.name, action: form.action, method: form.method, onsubmit: form.getAttribute('onsubmit'), fields: [...new FormData(form).entries()].map(([key, value]) => [key, typeof value === 'string' ? value : `[File:${value.name}]`]) }));
    const controls = [...document.querySelectorAll('button,input[type=button],input[type=submit],a')].map((element) => ({ id: element.id, name: element.getAttribute('name'), text: (element.textContent || element.getAttribute('value') || '').trim(), onclick: element.getAttribute('onclick'), disabled: element.disabled || element.getAttribute('aria-disabled') === 'true' })).filter((item) => /save|confirm|cancel|close|tag|document/i.test(`${item.id} ${item.name} ${item.text} ${item.onclick}`));
    const resources = performance.getEntriesByType('resource').map((entry) => entry.name).filter((url) => /\.js(?:\?|$)/.test(url));
    const matches = [];
    for (const url of resources) {
      try {
        const source = await (await fetch(url, { credentials: 'include' })).text();
        for (const token of ['saveASNData', 'saveASNAttachedDocuments', 'asnMaintAddRemoveASNTagsJson', 'clickConfirm', 'clickSave']) {
          const index = source.indexOf(token);
          if (index >= 0) matches.push({ url, token, excerpt: source.slice(Math.max(0, index - 1200), index + 3500) });
        }
      } catch { /* source may be cross-origin or unavailable */ }
    }
    return { url: location.href, functions, forms, controls, matches };
  });
  await frame.evaluate(() => window.clickClose?.());
  await page.waitForTimeout(1000);
  const closeFrame = page.frames().find((candidate) => candidate.url().includes('closeASNLinedialogBS'));
  evidence.closeDialog = closeFrame ? await closeFrame.evaluate(() => {
    const functions = Object.fromEntries(['clickCloseASN', 'closeASN', 'saveCloseASN', 'clickSave', 'validateMandatoryData'].map((name) => [name, typeof window[name] === 'function' ? String(window[name]) : null]));
    return { url: location.href, body: document.body.innerText.slice(0, 5000), forms: [...document.forms].map((form) => ({ action: form.action, method: form.method, fields: [...new FormData(form).entries()].map(([key, value]) => [key, String(value)]) })), functions, controls: [...document.querySelectorAll('button,input,a')].map((element) => ({ id: element.id, text: (element.textContent || element.getAttribute('value') || '').trim(), onclick: element.getAttribute('onclick') })).filter((item) => item.text || item.onclick) };
  }) : null;
  console.log(JSON.stringify(evidence, null, 2));
} finally {
  await browser.close();
}
