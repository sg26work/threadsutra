import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
try {
  const page = browser.contexts().flatMap((context) => context.pages()).find((candidate) => candidate.url().includes('vineretail'));
  if (!page) throw new Error('Authenticated Vin eRetail page is unavailable.');
  await page.evaluate(() => window.openScreen('ARS Execution Log', 'arsExecLogDisplay', 'fa fa-fw fa-truck'));
  await page.waitForTimeout(1200);
  const frame = page.frames().find((candidate) => candidate.url().includes('arsExecLogDisplay'));
  if (!frame) throw new Error('ARS Execution Log frame is unavailable.');
  let request = null;
  const capture = (candidate) => {
    if (candidate.url().includes('fetchExecutionLog')) request = { url: candidate.url(), method: candidate.method(), postData: candidate.postData() };
  };
  page.on('request', capture);
  await frame.evaluate(() => window.callSearch());
  await page.waitForTimeout(1000);
  page.off('request', capture);
  const grid = await frame.evaluate(() => {
    const jq = window.jQuery('#arsExecutionLogList');
    return {
      url: jq.jqGrid('getGridParam', 'url'),
      records: jq.jqGrid('getGridParam', 'records'),
      firstRow: jq.jqGrid('getRowData')[0],
      columns: (jq.jqGrid('getGridParam', 'colModel') || []).map((column) => ({
        name: column.name,
        index: column.index,
        hidden: column.hidden,
        sortable: column.sortable,
        search: column.search,
        formatter: typeof column.formatter === 'function' ? String(column.formatter) : column.formatter,
      })),
    };
  });
  const functions = await frame.evaluate(() => Object.fromEntries(
    ['openDialogExecScreen', 'openStatusDialog', 'openRulePickList', 'openExecPickList', 'openDialog'].map((name) => [name, typeof window[name] === 'function' ? String(window[name]) : null]),
  ));
  console.log(JSON.stringify({ request, grid, functions }, null, 2));
} finally {
  await browser.close();
}
