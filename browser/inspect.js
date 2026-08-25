import { chromium } from "playwright";

const browser = await chromium.launchPersistentContext("./browser-profile", {
  headless: false,
  viewport: null,
  // Keep a local CDP endpoint available for read-only reconnect/inspection.
  args: ["--remote-debugging-address=127.0.0.1", "--remote-debugging-port=9222"],
});

const pages = browser.pages();
let page = pages.find((candidate) => candidate.url() !== 'about:blank') || pages[0] || await browser.newPage();
for (const candidate of browser.pages()) {
  if (candidate !== page && candidate.url() === 'about:blank') await candidate.close();
}

page.on('console', (message) => console.log(`[browser console:${message.type()}] ${message.text()}`));
page.on('pageerror', (error) => console.log(`[browser pageerror] ${error.message}`));
page.on('requestfailed', (request) => console.log(`[request failed] ${request.method()} ${request.url()} ${request.failure()?.errorText || ''}`));
page.on('dialog', async (dialog) => {
  const message = dialog.message();
  if (dialog.type() === 'confirm' && message.includes('end previous session') && message.includes('start new Login session')) {
    console.log('[browser dialog] Accepting previous-session login confirmation.');
    await dialog.accept();
    return;
  }
  console.log(`[browser dialog:${dialog.type()}] ${message}`);
  await dialog.dismiss();
});
page.on('framenavigated', (frame) => {
  if (frame === page.mainFrame()) console.log(`[navigation] ${frame.url()}`);
});

await page.goto(
  "https://demo.vineretail.com/eRetailWeb/eRetailLogin.action?popup=true",
  { waitUntil: 'domcontentloaded' },
);
await page.bringToFront();

console.log("Browser opened.");
console.log("Log into the website manually.");
console.log("Your authenticated session will be stored in ./browser-profile");
console.log("CDP endpoint: http://127.0.0.1:9222");
console.log("Keep this process running while you test login; close it only after diagnosis.");

await new Promise(() => {});
