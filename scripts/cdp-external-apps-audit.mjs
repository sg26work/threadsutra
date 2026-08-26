import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts().flatMap((context) => context.pages())
  .find((candidate) => candidate.url().includes('demo.vineretail.com/eRetailWeb'));
if (!page || !page.url().includes('selCompanyLocationBS.action')) {
  throw new Error(`Authenticated shell unavailable: ${page?.url() || 'no Vin page'}`);
}

await page.evaluate(() => window.openScreen('External Apps', 'ExtAppsEnquiry', 'fa fa-arrow-circle-right'));
await page.waitForTimeout(1800);
const frame = page.frames().find((candidate) => candidate.url().includes('ExtAppsEnquiry'));
if (!frame) throw new Error('External Apps iframe unavailable');

const functions = await frame.evaluate((names) => Object.fromEntries(names.map((name) => [
  name,
  typeof window[name] === 'function' ? String(window[name]) : null,
])), ['callSearch', 'resetChannelData', 'addNewChannel', 'editChannel', 'deleteChannel']);

const grid = await frame.evaluate(() => {
  const jq = window.jQuery?.('#externalAppsSearchGrid');
  if (!jq?.length) return null;
  const params = jq.jqGrid('getGridParam');
  return {
    url: params.url, datatype: params.datatype, mtype: params.mtype,
    rowNum: params.rowNum, rowList: params.rowList,
    sortname: params.sortname, sortorder: params.sortorder,
    ondblClickRow: params.ondblClickRow ? String(params.ondblClickRow) : null,
    colModel: params.colModel?.map((column) => ({
      name: column.name, index: column.index, hidden: column.hidden,
      search: column.search, stype: column.stype, width: column.width,
      formatter: typeof column.formatter === 'function' ? String(column.formatter) : column.formatter,
    })),
  };
});

const enquiry = await frame.evaluate(() => ({
  url: location.href,
  body: (document.body.innerText || '').replace(/\s+/g, ' ').trim(),
  controls: [...document.querySelectorAll('input:not([type=hidden]),select,textarea,button,a')]
    .filter((element) => { const rect = element.getBoundingClientRect(); return rect.width || rect.height; })
    .map((element) => ({
      tag: element.tagName, id: element.id, name: element.getAttribute('name'),
      type: element.getAttribute('type'), text: (element.innerText || element.value || '').trim(),
      onclick: element.getAttribute('onclick'),
      options: element.tagName === 'SELECT' ? [...element.options].map((option) => ({ text: option.text, value: option.value })) : undefined,
    })),
  headers: [...document.querySelectorAll('#channelMasterGrid th, .ui-jqgrid-htable th')]
    .map((element) => (element.innerText || '').trim()).filter(Boolean),
  firstRowHtml: document.querySelector('#externalAppsSearchGrid tr.jqgrow')?.outerHTML || '',
}));

const evidence = { collectedAt: new Date().toISOString(), shellUrl: page.url(), enquiry, functions, grid };
await mkdir('docs/live-exploration', { recursive: true });
await writeFile('docs/live-exploration/external-apps-live-audit.json', JSON.stringify(evidence, null, 2));
await frame.locator('body').screenshot({ path: 'docs/live-exploration/external-apps-live.png' });
process.stdout.write(`${JSON.stringify({ frame: enquiry.url, controls: enquiry.controls.length, grid }, null, 2)}\n`);
process.exit(0);
