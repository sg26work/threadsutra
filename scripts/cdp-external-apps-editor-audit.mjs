import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts().flatMap((context) => context.pages())
  .find((candidate) => candidate.url().includes('demo.vineretail.com/eRetailWeb'));
if (!page || !page.url().includes('selCompanyLocationBS.action')) throw new Error('Authenticated shell unavailable');

await page.evaluate(() => window.openScreen('External Apps', 'ExtAppsEnquiry', 'fa fa-arrow-circle-right'));
await page.waitForTimeout(1500);
const enquiry = page.frames().find((candidate) => candidate.url().includes('ExtAppsEnquiry'));
if (!enquiry) throw new Error('External Apps enquiry unavailable');
await enquiry.evaluate(() => window.addNewChannel());
await page.waitForTimeout(1800);
const editor = page.frames().find((candidate) => candidate.url().includes('displayExtAppsEnquiry'));
if (!editor) throw new Error(`External Apps editor unavailable: ${page.frames().map((frame) => frame.url()).join(' | ')}`);

const evidence = await editor.evaluate(() => {
  const visible = (element) => { const rect = element.getBoundingClientRect(); return Boolean(rect.width || rect.height); };
  const controls = [...document.querySelectorAll('input,select,textarea,button,a')]
    .filter((element) => element.type !== 'hidden' && visible(element))
    .map((element) => ({
      tag: element.tagName, id: element.id, name: element.getAttribute('name'), type: element.getAttribute('type'),
      text: (element.innerText || element.value || '').replace(/\s+/g, ' ').trim(),
      value: element.value, placeholder: element.getAttribute('placeholder'), maxlength: element.getAttribute('maxlength'),
      required: element.required, readonly: element.readOnly, disabled: element.disabled,
      checked: element.checked, onclick: element.getAttribute('onclick'), onchange: element.getAttribute('onchange'),
      options: element.tagName === 'SELECT' ? [...element.options].map((option) => ({ text: option.text, value: option.value, selected: option.selected })) : undefined,
    }));
  const handlerNames = [...new Set(controls.flatMap((control) => [control.onclick, control.onchange])
    .filter(Boolean).flatMap((source) => source.match(/[A-Za-z_$][\w$]*(?=\s*\()/g) || []))];
  return {
    url: location.href, title: document.title, readyState: document.readyState,
    body: (document.body.innerText || '').replace(/\s+/g, ' ').trim(),
    controls,
    forms: [...document.forms].map((form) => ({ id: form.id, name: form.name, action: form.action, method: form.method })),
    handlers: Object.fromEntries(handlerNames.map((name) => [name, typeof window[name] === 'function' ? String(window[name]) : null])),
  };
});

await writeFile('docs/live-exploration/external-apps-editor-live-audit.json', JSON.stringify({ collectedAt: new Date().toISOString(), ...evidence }, null, 2));
process.stdout.write(`${JSON.stringify({ url: evidence.url, controls: evidence.controls.length, forms: evidence.forms, handlers: Object.keys(evidence.handlers) }, null, 2)}\n`);
process.exit(0);
