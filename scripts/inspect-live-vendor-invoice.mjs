import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
try {
  const pages = browser.contexts().flatMap((context) => context.pages());
  const page = pages.find((candidate) => candidate.url().includes('vineretail'));
  if (!page) throw new Error('Authenticated live eRetail page is unavailable.');
  const results = [];
  for (const frame of page.frames()) {
    const result = await frame.evaluate(async () => {
      const terms = /vendor\s*invoice|invoice\s*vendor|purchase\s*invoice|supplier\s*invoice|invoice/i;
      const elements = [...document.querySelectorAll('*')].map((element) => ({ tag: element.tagName, id: element.id, text: (element.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 250), title: element.getAttribute('title'), onclick: element.getAttribute('onclick'), href: element.getAttribute('href'), display: getComputedStyle(element).display, visibility: getComputedStyle(element).visibility })).filter((item) => terms.test(`${item.id} ${item.text} ${item.title} ${item.onclick} ${item.href}`)).slice(0, 300);
      const inline = [...document.scripts].filter((script) => !script.src).map((script) => script.textContent || '').join('\n');
      const snippets = [];
      for (const match of inline.matchAll(/.{0,240}(?:vendor\s*invoice|invoice\s*vendor|purchase\s*invoice|supplier\s*invoice|openScreen\([^\n;]*invoice)[^\n;]{0,360}/gi)) snippets.push(match[0]);
      const external = [];
      for (const script of [...document.scripts].filter((item) => item.src)) {
        try { const source = await (await fetch(script.src, { credentials: 'include' })).text(); for (const match of source.matchAll(/.{0,200}(?:vendor\s*invoice|invoice\s*vendor|purchase\s*invoice|supplier\s*invoice|openScreen\([^\n;]*invoice)[^\n;]{0,320}/gi)) external.push({ src: script.src, snippet: match[0] }); } catch { /* unavailable source */ }
      }
      return { url: location.href, elements, snippets, external: external.slice(0, 100) };
    });
    if (result.elements.length || result.snippets.length || result.external.length) results.push(result);
  }
  console.log(JSON.stringify({ page: page.url(), frames: page.frames().map((frame) => frame.url()), results }, null, 2));
} finally { await browser.close(); }
