import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
try {
  const pages = browser.contexts().flatMap((context) => context.pages());
  const page = pages.find((candidate) => candidate.url().includes('vineretail'));
  if (!page) throw new Error('Authenticated live eRetail page is unavailable.');
  const navigation = await page.evaluate(() => [...document.querySelectorAll('a,button,[onclick]')].map((element, order) => {
    const onclick = element.getAttribute('onclick') || '';
    const text = (element.textContent || element.getAttribute('title') || '').trim().replace(/\s+/g, ' ');
    const ancestors = []; let parent = element.parentElement;
    while (parent && ancestors.length < 5) { const label = (parent.querySelector(':scope > a,:scope > span,:scope > div > a')?.textContent || '').trim().replace(/\s+/g, ' '); if (label && label !== text) ancestors.push(label.slice(0, 120)); parent = parent.parentElement; }
    return { order, tag: element.tagName, text, id: element.id, onclick, href: element.getAttribute('href'), display: getComputedStyle(element).display, visibility: getComputedStyle(element).visibility, ancestors };
  }).filter((item) => /openScreen|Manage ASN|Common Import|ASN|Invoice/i.test(`${item.text} ${item.onclick}`)));
  console.log(JSON.stringify({ url: page.url(), navigation: navigation.filter((item) => item.order >= 69 && /openScreen/.test(item.onclick)).map(({ order, text, onclick, display, visibility, ancestors }) => ({ order, text, onclick, display, visibility, section: ancestors[0] || '' })) }, null, 2));
} finally { await browser.close(); }
