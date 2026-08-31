import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
try {
  const page = browser.contexts().flatMap((context) => context.pages()).find((candidate) => candidate.url().includes('selCompanyLocationBS.action'));
  if (!page) throw new Error('Authenticated LIVE shell unavailable');
  const result = await page.evaluate(async () => {
    const options = [...document.querySelector('#searchType').options].map((option) => ({ value: option.value, label: option.textContent.trim() }));
    const responses = [];
    for (const option of options) {
      const params = new URLSearchParams({ orderno: `__PARITY_NOT_FOUND_${option.value}__`, searchType: option.value });
      const response = await fetch('jsonOrderExits', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded; charset=UTF-8' }, body: params.toString() });
      const body = await response.json();
      responses.push({ ...option, status: response.status, keys: Object.keys(body), body });
    }
    return { options, responses };
  });
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
