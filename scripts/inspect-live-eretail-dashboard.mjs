import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
try {
  const page = browser.contexts().flatMap((context) => context.pages())
    .find((candidate) => candidate.url().includes('selCompanyLocationBS.action'));
  if (!page) throw new Error('Authenticated LIVE shell unavailable');
  const frame = page.frames().find((candidate) => candidate.url().includes('/eRetailDefault'));
  if (!frame) throw new Error('eRetail Dashboard frame unavailable');

  const output = await frame.locator('body').evaluate((root) => {
    const visible = (element) => {
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && box.width > 0 && box.height > 0;
    };
    const info = (element) => {
      const box = element.getBoundingClientRect();
      return {
        tag: element.tagName,
        id: element.id || null,
        name: element.getAttribute('name'),
        type: element.getAttribute('type'),
        role: element.getAttribute('role'),
        text: (element.innerText || element.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 300),
        value: 'value' in element ? element.value : null,
        title: element.getAttribute('title'),
        href: element.getAttribute('href'),
        onclick: element.getAttribute('onclick'),
        disabled: 'disabled' in element ? element.disabled : null,
        x: box.x, y: box.y, width: box.width, height: box.height,
      };
    };
    const bodyBox = root.getBoundingClientRect();
    return {
      viewport: { width: innerWidth, height: innerHeight, devicePixelRatio },
      document: {
        body: { width: bodyBox.width, height: bodyBox.height, scrollWidth: root.scrollWidth, scrollHeight: root.scrollHeight },
        html: { scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight },
      },
      text: (root.innerText || '').replace(/\s+/g, ' ').trim(),
      controls: [...root.querySelectorAll('input,select,textarea,button,a')].filter(visible).map(info),
      regions: [...root.querySelectorAll('header,nav,main,section,article,footer,table,.panel,.card,.box')].filter(visible).map(info),
      headings: [...root.querySelectorAll('h1,h2,h3,h4,h5,h6,legend,.title,.panel-title')].filter(visible).map(info),
      tables: [...root.querySelectorAll('table')].filter(visible).map((table) => ({
        ...info(table),
        headers: [...table.querySelectorAll('th')].map((header) => (header.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean),
        rows: table.querySelectorAll('tbody tr').length,
      })),
      canvases: [...root.querySelectorAll('canvas,svg')].filter(visible).map(info),
      forms: [...root.querySelectorAll('form')].map((form) => ({ id: form.id, name: form.getAttribute('name'), action: form.getAttribute('action'), method: form.getAttribute('method') })),
    };
  });
  console.log(JSON.stringify({ url: frame.url(), ...output }, null, 2));
} finally {
  await browser.close();
}
