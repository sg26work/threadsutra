import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
try {
  const page = browser.contexts().flatMap((context) => context.pages()).find((candidate) => candidate.url().includes('selCompanyLocationBS.action'));
  if (!page) throw new Error('Authenticated LIVE shell unavailable');
  const candidates = await Promise.all(page.frames().filter((candidate) => candidate.url().includes('customerMaintenanceDisplayBS')).map(async (frame) => ({
    frame,
    visible: await frame.frameElement().then((element) => element.isVisible()).catch(() => false),
    size: (await frame.locator('body').innerText().catch(() => '')).length,
  })));
  const frame = candidates.filter((candidate) => candidate.visible).sort((a, b) => b.size - a.size)[0]?.frame;
  if (!frame) throw new Error('Active Customer editor unavailable');
  const checkbox = frame.locator('input[type="checkbox"]').filter({ has: undefined });
  const target = frame.locator('label').filter({ hasText: 'Is TCS Applicable' }).locator('input[type="checkbox"]').first();
  const fallback = frame.locator('input[type="checkbox"]').filter({ has: frame.locator('xpath=following::*[contains(normalize-space(.), "Is TCS Applicable")]') }).first();
  const control = await target.count() ? target : fallback;
  if (!await control.count()) throw new Error(`TCS checkbox unavailable among ${await checkbox.count()} checkboxes`);
  if (!await control.isChecked()) await control.click();
  await frame.waitForTimeout(150);
  const observed = await frame.locator('input:not([type=hidden]),select').evaluateAll((elements) => elements.map((element) => {
    const rect = element.getBoundingClientRect();
    const label = element.closest('label')?.innerText?.trim() || element.parentElement?.parentElement?.innerText?.trim() || '';
    return {
      id: element.id,
      name: element.getAttribute('name'),
      tag: element.tagName,
      type: element.getAttribute('type'),
      label: label.slice(0, 100),
      value: element.value,
      visible: rect.width > 0 && rect.height > 0,
      options: element.tagName === 'SELECT' ? [...element.options].map((option) => ({ value: option.value, text: option.text })) : undefined,
    };
  })).then((items) => items.filter((item) => /tcs|percent/i.test(`${item.id} ${item.name} ${item.label}`)));
  console.log(JSON.stringify(observed, null, 2));
} finally {
  await browser.close();
}
