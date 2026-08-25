/**
 * Read-only inventory collector for an already authenticated eRetail browser.
 * It never submits, saves, imports, deletes, or confirms a data-changing action.
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const cdpUrl = process.env.ERETAIL_CDP_URL || 'http://127.0.0.1:9222';
const outDir = join(process.cwd(), 'docs', 'live-exploration', 'authenticated');

const clean = (value = '') => value.replace(/\s+/g, ' ').trim();
const slug = (value) => clean(value).replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 90);
const requestedMenu = clean(process.env.ERETAIL_EXPLORATION_MENU || '');
const requestedLimit = Number.parseInt(process.env.ERETAIL_EXPLORATION_LIMIT || '', 10);
const report = { collectedAt: new Date().toISOString(), cdpUrl, requestedMenu, shell: {}, menus: [], screens: [], errors: [] };
const reportSuffix = slug(requestedMenu || 'shell');

async function snapshot(page, name, metadata = {}) {
  const data = await page.evaluate(() => {
    const text = (node) => (node?.innerText || node?.textContent || '').replace(/\s+/g, ' ').trim();
    const shown = (node) => {
      const rect = node.getBoundingClientRect();
      return Boolean(rect.width || rect.height || node.getClientRects().length);
    };
    const elements = (selector, limit = 100) => [...document.querySelectorAll(selector)]
      .filter(shown)
      .slice(0, limit)
      .map((node) => ({
        tag: node.tagName,
        id: node.id || undefined,
        name: node.getAttribute('name') || undefined,
        type: node.getAttribute('type') || undefined,
        text: text(node).slice(0, 240),
        placeholder: node.getAttribute('placeholder') || undefined,
        title: node.getAttribute('title') || undefined,
        onclick: node.getAttribute('onclick') || undefined,
        rect: (() => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; })(),
      }));
    return {
      title: document.title,
      url: location.href,
      body: text(document.body).slice(0, 12000),
      headings: elements('h1,h2,h3,h4,h5,.breadcrumb,.page-title,.moduleTitle'),
      controls: elements('input:not([type=hidden]), select, textarea, button, a'),
      tabs: elements('[role=tab], .nav-tabs a, .nav-tabs li, .tab'),
      tables: [...document.querySelectorAll('table')].filter(shown).slice(0, 20).map((table) => ({
        headers: [...table.querySelectorAll('th')].map(text),
        rows: table.querySelectorAll('tbody tr').length,
      })),
      dialogs: elements('[role=dialog], .modal, .ui-dialog'),
    };
  });
  const file = join(outDir, 'screenshots', `${slug(name)}.png`);
  await page.screenshot({ path: file, fullPage: false });
  const visibleFrames = await page.locator('iframe').evaluateAll((frames) => frames
    .filter((frame) => {
      const rect = frame.getBoundingClientRect();
      return Boolean(rect.width || rect.height);
    })
    .map((frame) => ({ id: frame.id, src: frame.src })));
  const frames = await Promise.all(visibleFrames.map(async (frameMeta) => {
    const frame = page.frames().find((candidate) => candidate.url() === frameMeta.src);
    if (!frame) return frameMeta;
    try {
      return {
        ...frameMeta,
        url: frame.url(),
        body: clean(await frame.locator('body').innerText({ timeout: 5000 })).slice(0, 12000),
        inputs: await frame.locator('input:not([type=hidden]), select, textarea').evaluateAll((nodes) => nodes.slice(0, 150).map((node) => ({
          tag: node.tagName, id: node.id, name: node.getAttribute('name'), type: node.getAttribute('type'),
          value: node.value, placeholder: node.getAttribute('placeholder'), label: node.getAttribute('aria-label'),
        }))),
        buttons: await frame.locator('button, input[type=button], input[type=submit], a.btn').evaluateAll((nodes) => nodes.slice(0, 150).map((node) => ({
          tag: node.tagName, id: node.id, text: (node.innerText || node.value || '').replace(/\s+/g, ' ').trim(), title: node.title,
        }))),
        tables: await frame.locator('table').evaluateAll((tables) => tables.slice(0, 20).map((table) => ({
          headers: [...table.querySelectorAll('th')].map((node) => (node.innerText || '').replace(/\s+/g, ' ').trim()), rows: table.querySelectorAll('tbody tr').length,
        }))),
      };
    } catch (error) {
      return { ...frameMeta, error: String(error) };
    }
  }));
  report.screens.push({ name, ...metadata, ...data, frames, screenshot: file });
  return data;
}

const browser = await chromium.connectOverCDP(cdpUrl);
const pages = browser.contexts().flatMap((context) => context.pages());
const page = pages.find((candidate) => candidate.url().includes('demo.vineretail.com'));
if (!page) throw new Error('No authenticated eRetail tab found at the CDP endpoint.');

await mkdir(join(outDir, 'screenshots'), { recursive: true });

try {
  report.shell = await page.evaluate(() => {
    const text = (node) => (node?.innerText || node?.textContent || '').replace(/\s+/g, ' ').trim();
    const visible = (node) => { const r = node.getBoundingClientRect(); return Boolean(r.width || r.height); };
    const links = [...document.querySelectorAll('a')].map((node) => ({
      label: text(node), title: node.title || '', onclick: node.getAttribute('onclick') || '',
      visible: visible(node), rect: (() => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; })(),
    }));
    return {
      url: location.href,
      title: document.title,
      visibleRail: links.filter((link) => link.rect.x < 60 && link.rect.y >= 50 && link.rect.height > 0),
      allScreenHandlers: links.filter((link) => link.onclick.includes('openScreen')),
      headerSearch: [...document.querySelectorAll('#searchType, #searchValue')].map((node) => ({ id: node.id, tag: node.tagName, value: node.value })),
    };
  });
  await snapshot(page, 'authenticated-shell', { kind: 'shell' });

  for (let index = 0; index < report.shell.visibleRail.length; index += 1) {
    const rail = report.shell.visibleRail[index];
    try {
      // The icon rail has no stable individual IDs. Its fixed, observed 50px
      // geometry is more reliable than matching hidden duplicate menu links.
      await page.mouse.move(25, rail.rect.y + (rail.rect.height / 2));
      await page.mouse.click(25, rail.rect.y + (rail.rect.height / 2));
      await page.waitForTimeout(500);
      const menu = await page.evaluate(() => {
        const text = (node) => (node?.innerText || node?.textContent || '').replace(/\s+/g, ' ').trim();
        const shown = (node) => { const r = node.getBoundingClientRect(); return Boolean(r.width || r.height); };
        return [...document.querySelectorAll('a')]
          .filter((node) => shown(node) && node.getBoundingClientRect().x >= 45 && node.getAttribute('onclick')?.includes('openScreen'))
          .map((node) => {
            const rect = node.getBoundingClientRect();
            return { label: text(node), onclick: node.getAttribute('onclick'), title: node.title || '', rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height } };
          })
          .filter((item) => item.label);
      });
      const entry = { index, rail, items: menu };
      report.menus.push(entry);

      if (!requestedMenu || requestedMenu.toLowerCase() !== rail.label.toLowerCase()) continue;
      for (const item of Number.isFinite(requestedLimit) ? menu.slice(0, requestedLimit) : menu) {
        try {
          await page.mouse.click(item.rect.x + Math.min(12, item.rect.width / 2), item.rect.y + (item.rect.height / 2));
          await page.waitForTimeout(3500);
          await snapshot(page, `${rail.label}-${item.label}`, { kind: 'menu-screen', parentMenu: rail.label, entryPoint: item.label, handler: item.onclick });
          // Restore the parent flyout before visiting its next child.
          await page.mouse.click(25, rail.rect.y + (rail.rect.height / 2));
          await page.waitForTimeout(250);
        } catch (error) {
          report.errors.push({ type: 'screen', parentMenu: rail.label, entryPoint: item.label, message: String(error) });
        }
      }
    } catch (error) {
      report.errors.push({ type: 'menu', index, message: String(error) });
    }
  }
} catch (error) {
  report.errors.push({ type: 'fatal', message: String(error) });
} finally {
  await writeFile(join(outDir, `report-${reportSuffix}.json`), JSON.stringify(report, null, 2));
  await writeFile(join(outDir, `SUMMARY-${reportSuffix}.md`), `# Authenticated reference inventory\n\n- Scope: ${requestedMenu || 'shell'}\n- Collected: ${report.collectedAt}\n- Menu groups: ${report.menus.length}\n- Screen snapshots: ${report.screens.length}\n- Errors: ${report.errors.length}\n`);
  await browser.close();
}

console.log(JSON.stringify({ menus: report.menus.length, screens: report.screens.length, errors: report.errors.length }));
