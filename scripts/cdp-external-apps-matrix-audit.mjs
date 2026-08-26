import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts().flatMap((context) => context.pages())
  .find((candidate) => candidate.url().includes('demo.vineretail.com/eRetailWeb'));
if (!page || !page.url().includes('selCompanyLocationBS.action')) throw new Error('Authenticated shell unavailable');

await page.evaluate(() => window.openScreen('External Apps Create/Edit', 'displayExtAppsEnquiry', 'fa fa-fw fa-list-ol'));
await page.waitForTimeout(1500);
const editorFrames = page.frames().filter((candidate) => candidate.url().includes('displayExtAppsEnquiry'));
const frameEntries = await Promise.all(editorFrames.map(async (candidate) => ({ candidate, visible: await candidate.frameElement().then((element) => element.isVisible()).catch(() => false) })));
const frame = frameEntries.find((entry) => entry.visible)?.candidate;
if (!frame) throw new Error('External Apps editor unavailable');

const requests = [];
page.on('request', (request) => {
  if (request.frame() === frame && ['xhr', 'fetch'].includes(request.resourceType())) {
    requests.push({ method: request.method(), url: request.url().split('?')[0], postData: request.postData() });
  }
});

const typeOptions = await frame.locator('#rewardType option').evaluateAll((options) => options
  .filter((option) => option.value !== '-1').map((option) => ({ text: option.text, value: option.value })));
const matrix = [];
const persist = () => writeFile('docs/live-exploration/external-apps-dependent-controls-audit.json', JSON.stringify({ collectedAt: new Date().toISOString(), matrix, requests }, null, 2));
await persist();

for (const extType of typeOptions) {
  const entry = { ...extType, apps: [], errors: [] };
  matrix.push(entry);
  process.stdout.write(`TYPE ${extType.text}\n`);
  try {
    await frame.locator('#rewardType').selectOption(extType.value);
    await frame.evaluate(() => window.updateTemplateLink('rewardType'));
    await frame.waitForTimeout(450);
  } catch (error) {
    entry.errors.push(String(error));
    await persist();
    continue;
  }
  const apps = await frame.locator('#type option').evaluateAll((options) => options.filter((option) => option.value !== '-1').map((option) => ({ text: option.text, value: option.value })));
  for (const app of apps) {
    try {
      await frame.locator('#type').selectOption(app.value);
      await frame.evaluate(() => window.updateTemplateLink('type'));
      await frame.waitForTimeout(350);
      const controls = await frame.evaluate(() => {
      const visible = (element) => { const rect = element.getBoundingClientRect(); return Boolean(rect.width || rect.height); };
      const sensitive = (element) => element.type === 'password' || /password|secret|token|apikey|credential/i.test(`${element.id} ${element.name}`);
      return [...document.querySelectorAll('input:not([type=hidden]),select,textarea,button')]
        .filter(visible)
        .map((element) => ({
          tag: element.tagName, id: element.id, name: element.getAttribute('name'), type: element.getAttribute('type'),
          label: element.labels?.[0]?.innerText?.replace(/\s+/g, ' ').trim() || element.closest('.form-group,div')?.querySelector('label')?.innerText?.replace(/\s+/g, ' ').trim() || '',
          panel: element.closest('fieldset')?.querySelector(':scope > legend')?.innerText?.replace(/\s+/g, ' ').trim() || '',
          context: (element.closest('tr')?.innerText || element.closest('.form-group')?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 240),
          value: sensitive(element) ? '[REDACTED_SECRET]' : element.value,
          checked: element.checked, disabled: element.disabled, readonly: element.readOnly,
          options: element.tagName === 'SELECT' ? [...element.options].map((option) => ({ text: option.text, value: option.value })) : undefined,
        }));
      });
      const authFields = await frame.evaluate(() => (window.authListCopy || []).map((field) => ({ dbField: field.dbField, displayName: field.displayName, displayOrder: field.displayOrder, fieldType: field.fieldType, isOptional: field.isOptional, isPassword: field.isPassword, maxLength: field.maxLength })));
      const panels = await frame.locator('fieldset').evaluateAll((fieldsets) => fieldsets.filter((fieldset) => { const rect = fieldset.getBoundingClientRect(); return Boolean(rect.width || rect.height); }).map((fieldset) => ({ name: fieldset.querySelector(':scope > legend')?.innerText?.replace(/\s+/g, ' ').trim() || '', text: fieldset.innerText.replace(/\s+/g, ' ').trim() })));
      const instructions = await frame.locator('fieldset').evaluateAll((fieldsets) => fieldsets.flatMap((fieldset) => fieldset.querySelector(':scope > legend')?.innerText?.trim() === 'Instructions' ? [...fieldset.querySelectorAll('li')].map((item) => item.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean) : []));
      entry.apps.push({ ...app, controls, authFields, panels, instructions });
    } catch (error) {
      entry.apps.push({ ...app, controls: [], error: String(error) });
    }
  }
  await persist();
}

const uniqueRequests = [...new Map(requests.map((request) => [`${request.method} ${request.url} ${request.postData}`, request])).values()];
await writeFile('docs/live-exploration/external-apps-dependent-controls-audit.json', JSON.stringify({ collectedAt: new Date().toISOString(), matrix, requests: uniqueRequests }, null, 2));
process.stdout.write(`${JSON.stringify({ types: matrix.length, apps: matrix.reduce((total, type) => total + type.apps.length, 0), requests: uniqueRequests.length, appCounts: matrix.map((type) => ({ type: type.text, count: type.apps.length })) }, null, 2)}\n`);
process.exit(0);
