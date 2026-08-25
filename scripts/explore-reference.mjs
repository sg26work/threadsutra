/**
 * Systematic exploration of the authorized Vinculum/eRetail demo.
 * Credentials via env only — never hard-coded.
 *
 * Usage:
 *   ERETAIL_DEMO_USER=... ERETAIL_DEMO_PASSWORD=... node scripts/explore-reference.mjs
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE = 'https://demo.vineretail.com/eRetailWeb';
const LOGIN_URL = `${BASE}/eRetailLogin.action?popup=true`;
const OUT_DIR = join(process.cwd(), 'docs', 'live-exploration');
const USER = process.env.ERETAIL_DEMO_USER;
const PASS = process.env.ERETAIL_DEMO_PASSWORD;

if (!USER || !PASS) {
  console.error('Set ERETAIL_DEMO_USER and ERETAIL_DEMO_PASSWORD environment variables.');
  process.exit(2);
}

await mkdir(OUT_DIR, { recursive: true });
await mkdir(join(OUT_DIR, 'screenshots'), { recursive: true });

const report = {
  exploredAt: new Date().toISOString(),
  loginUrl: LOGIN_URL,
  pages: [],
  navigation: { sidebarItems: [], headerControls: [], megaMenus: [] },
  errors: [],
};

function slug(s) {
  return s.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 80);
}

async function takeScreenshot(page, name) {
  const file = join(OUT_DIR, 'screenshots', `${slug(name)}.png`);
  await page.screenshot({ path: file, fullPage: false }).catch(() => {});
  return file;
}

async function pageSnapshot(page) {
  return page.evaluate(() => {
    const text = (el) => (el?.innerText || el?.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 200);
    const pick = (sel) => [...document.querySelectorAll(sel)].slice(0, 30).map((el) => ({
      tag: el.tagName,
      id: el.id || undefined,
      className: (el.className || '').toString().slice(0, 80) || undefined,
      text: text(el),
      href: el.href || undefined,
      type: el.type || undefined,
      name: el.name || undefined,
    }));
    return {
      title: document.title,
      url: location.href,
      bodyText: (document.body?.innerText || '').slice(0, 1500),
      headings: pick('h1,h2,h3,h4,h5,.page-title,.breadcrumb,.breadCrumb,.moduleTitle'),
      inputs: pick('input:not([type=hidden]),select,textarea'),
      buttons: pick('button,input[type=submit],input[type=button],a.btn,.btn'),
      tables: [...document.querySelectorAll('table')].slice(0, 5).map((t) => ({
        headers: [...t.querySelectorAll('th')].map((th) => text(th)),
        rowCount: t.querySelectorAll('tbody tr').length,
      })),
      tabs: pick('.nav-tabs li, .tab, [role=tab], .ui-tabs-nav li'),
      iframes: [...document.querySelectorAll('iframe')].map((f) => ({ id: f.id, src: f.src?.slice(0, 120) })),
    };
  });
}

async function login(page) {
  page.on('dialog', async (d) => {
    report.errors.push({ type: 'dialog', message: d.message().slice(0, 300) });
    await d.accept();
  });

  await page.goto(LOGIN_URL, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForFunction(() => typeof window.doLoginJS === 'function', { timeout: 20000 }).catch(() => {});

  await page.locator('#userName').click();
  await page.locator('#userName').fill(USER);
  await page.locator('#password').click();
  await page.locator('#password').fill(PASS);
  await page.locator('input[type="submit"][value="Login"]').click();

  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(4000);

  const url = page.url();
  if (url.includes('eRetailLogin')) {
    throw new Error('Login failed — still on login page');
  }
  await takeScreenshot(page, '01-post-login');
}

async function discoverSidebar(page) {
  const items = await page.evaluate(() => {
    const results = [];
    const selectors = [
      '#leftMenu a', '#leftMenu li', '.left-menu a', '.sidebar a',
      '[class*="sidebar"] a', '[class*="leftMenu"] a', 'nav.left a',
      '.main-sidebar a', '#menuBar a', '.menuBar a',
    ];
    for (const sel of selectors) {
      document.querySelectorAll(sel).forEach((el, i) => {
        const label = (el.getAttribute('title') || el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ');
        if (!label || label.length > 80) return;
        results.push({ selector: sel, index: i, label, href: el.href || el.getAttribute('onclick')?.slice(0, 120) });
      });
    }
    // icon rail — often title on parent li
    document.querySelectorAll('li[title], a[title], [data-original-title]').forEach((el) => {
      const label = el.getAttribute('title') || el.getAttribute('data-original-title') || '';
      if (label) results.push({ label, href: el.href, tag: el.tagName });
    });
    return results;
  });
  report.navigation.sidebarItems = items;
  return items;
}

async function discoverHeader(page) {
  report.navigation.headerControls = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('header input, header select, header button, .navbar input, .top-bar input, .searchBar input, .header input').forEach((el) => {
      out.push({
        tag: el.tagName,
        type: el.type,
        placeholder: el.placeholder,
        name: el.name,
        text: (el.innerText || el.value || '').slice(0, 60),
      });
    });
    // location label
    const loc = document.body.innerText.match(/JX Karawaci|[A-Z][a-z]+ [A-Za-z]+/)?.[0];
    return { controls: out, locationHint: loc };
  });
}

async function clickSidebarByIndex(page, index) {
  const clicked = await page.evaluate((idx) => {
    const candidates = [
      ...document.querySelectorAll('#leftMenu li, .left-menu li, [class*="sidebar"] li, .main-sidebar li'),
    ].filter((li) => li.offsetParent !== null);
    if (idx >= candidates.length) return null;
    const li = candidates[idx];
    const link = li.querySelector('a') || li;
    const label = (li.getAttribute('title') || link.innerText || link.textContent || '').trim();
    link.click();
    return { label, count: candidates.length };
  }, index);
  return clicked;
}

async function discoverFlyoutLinks(page) {
  return page.evaluate(() => {
    const links = [];
    const containers = document.querySelectorAll(
      '.flyout, .mega-menu, .dropdown-menu, [class*="submenu"], [class*="subMenu"], .menuContent, #menuContent, .nav-second-level, ul.dropdown-menu',
    );
    containers.forEach((c) => {
      if (c.offsetParent === null && getComputedStyle(c).display === 'none') return;
      c.querySelectorAll('a, button, li[onclick]').forEach((el) => {
        const label = (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ');
        if (!label || label.length > 100) return;
        links.push({ label, href: el.href, onclick: el.getAttribute('onclick')?.slice(0, 100) });
      });
    });
    return links;
  });
}

async function recordPage(page, meta) {
  const dom = await pageSnapshot(page);
  const shot = await takeScreenshot(page, meta.label || dom.title || 'page');
  const entry = { ...meta, ...dom, screenshot: shot };
  report.pages.push(entry);
  return entry;
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

try {
  await login(page);
  await recordPage(page, { phase: 'landing', label: 'post-login-landing', parentMenu: null });

  await discoverSidebar(page);
  await discoverHeader(page);

  // Try hovering/clicking each sidebar icon to reveal mega menus
  const sidebarCount = await page.evaluate(() =>
    document.querySelectorAll('#leftMenu li, .left-menu li, [class*="sidebar"] li, .main-sidebar li').length,
  );

  const visited = new Set();
  const maxSidebar = Math.min(sidebarCount || 12, 12);

  for (let i = 0; i < maxSidebar; i += 1) {
    try {
      await clickSidebarByIndex(page, i);
      await page.waitForTimeout(800);
      const flyoutLinks = await discoverFlyoutLinks(page);
      const sidebarMeta = await page.evaluate((idx) => {
        const items = [...document.querySelectorAll('#leftMenu li, .left-menu li, [class*="sidebar"] li')];
        const li = items[idx];
        return li ? { label: li.getAttribute('title') || li.innerText?.trim() } : { label: `sidebar-${idx}` };
      }, i);

      report.navigation.megaMenus.push({ sidebarIndex: i, ...sidebarMeta, linkCount: flyoutLinks.length, links: flyoutLinks.slice(0, 40) });

      // Visit up to 3 links per flyout to avoid timeout explosion
      for (const link of flyoutLinks.slice(0, 3)) {
        const key = `${link.label}|${link.href}`;
        if (visited.has(key)) continue;
        visited.add(key);

        try {
          if (link.href && link.href.startsWith('http')) {
            await page.goto(link.href, { waitUntil: 'domcontentloaded', timeout: 20000 });
          } else {
            await page.evaluate((lbl) => {
              const els = [...document.querySelectorAll('a, button, li')];
              const match = els.find((el) => (el.innerText || el.textContent || '').trim() === lbl);
              match?.click();
            }, link.label);
          }
          await page.waitForTimeout(1500);
          await recordPage(page, {
            phase: 'menu-page',
            label: link.label,
            parentMenu: sidebarMeta.label,
            entryPoint: 'flyout',
          });
        } catch (err) {
          report.errors.push({ type: 'nav', label: link.label, message: String(err.message || err).slice(0, 200) });
        }
      }
    } catch (err) {
      report.errors.push({ type: 'sidebar', index: i, message: String(err.message || err).slice(0, 200) });
    }
  }

  // Capture computed styles for shell chrome
  report.shellStyles = await page.evaluate(() => {
    const pick = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const s = getComputedStyle(el);
      return {
        selector: sel,
        width: el.offsetWidth,
        height: el.offsetHeight,
        backgroundColor: s.backgroundColor,
        color: s.color,
        fontSize: s.fontSize,
        fontFamily: s.fontFamily,
      };
    };
    return {
      header: pick('header, .navbar, .top-bar, .header'),
      sidebar: pick('#leftMenu, .left-menu, .main-sidebar, [class*="sidebar"]'),
      main: pick('#mainContent, .main-content, #content, .content-area'),
    };
  });

  // Logout probe — record only, don't fully logout until end
  const logoutLink = await page.evaluate(() => {
    const el = [...document.querySelectorAll('a, button')].find((n) =>
      /logout|sign out|log out/i.test(n.innerText || n.textContent || n.title || ''),
    );
    return el ? { text: (el.innerText || el.textContent || '').trim(), href: el.href } : null;
  });
  report.navigation.logout = logoutLink;

} catch (err) {
  report.errors.push({ type: 'fatal', message: String(err.message || err) });
  await takeScreenshot(page, 'error-state').catch(() => {});
} finally {
  await writeFile(join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 2));
  await writeFile(
    join(OUT_DIR, 'SUMMARY.md'),
    `# Live Demo Exploration Summary\n\nGenerated: ${report.exploredAt}\n\n` +
      `- Pages captured: ${report.pages.length}\n` +
      `- Sidebar items found: ${report.navigation.sidebarItems?.length || 0}\n` +
      `- Mega menu groups: ${report.navigation.megaMenus?.length || 0}\n` +
      `- Errors: ${report.errors.length}\n\n` +
      `See \`report.json\` for full inventory.\n`,
  );
  await browser.close();
}

console.log(JSON.stringify({
  pages: report.pages.length,
  sidebarItems: report.navigation.sidebarItems?.length || 0,
  megaMenus: report.navigation.megaMenus?.length || 0,
  errors: report.errors.length,
  outDir: OUT_DIR,
}, null, 2));
