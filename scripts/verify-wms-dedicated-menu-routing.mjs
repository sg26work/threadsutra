import { chromium } from "playwright";

const baseUrl = process.env.ERETAIL_BASE_URL || "http://127.0.0.1:3011";
const targets = [
  ["WMS", "Manage Inbound Gate Pass", "/app/r/inbound-gate-pass"],
  ["WMS", "Inbound Enquiry", "/app/r/inbound-enquiry"],
  ["WMS", "Inbound RealTime", "/app/r/inbound-realtime"],
  ["WMS", "Inbound QC", "/app/r/inbound-qc"],
  ["WMS", "Inventory Move History", "/app/r/inv-move-history"],
  ["WMS", "Inventory Move", "/app/r/inv-move"],
  ["WMS", "Inventory Move By Scan", "/app/r/inv-move-scan"],
  ["WMS", "Cycle Count", "/app/r/cycle-count"],
  ["WMS", "BIN Audit", "/app/r/bin-audit"],
  ["WMS", "Bulk update Lottables", "/app/r/bulk-lottables"],
  ["WMS", "PutAway Enquiry", "/app/r/putaway-enquiry"],
  ["WMS", "Dispatch Checkpoint Enquiry", "/app/r/dispatch-checkpoint"],
  ["WMS", "Sku Grading", "/app/r/sku-grading"],
  ["WMS", "Discrepancy Enquiry", "/app/r/discrepancy-enquiry"],
  ["WMS", "Bulk Upload", "/app/r/bulk-upload"],
  ["WMS", "MP Inventory Log", "/app/r/mr-inventory-log"],
  ["WMS", "LPN Enquiry", "/app/r/lpn-enquiry"],
  ["WMS", "Transhipment Old", "/app/r/transhipment-old"],
  ["WMS", "Transhipment", "/app/r/transhipment"],
  ["WMS", "QC Params Mapping", "/app/r/qc-params-mapping"],
  ["Master", "Location Create/Edit", "/app/m/location-create"],
];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
page.on("response", (response) => {
  if (response.url().includes("/api/") && response.status() >= 500)
    errors.push(`${response.status()} ${response.url()}`);
});

try {
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.evaluate(() =>
    localStorage.setItem(
      "vin_user",
      JSON.stringify({ username: "wms-menu-verifier" }),
    ),
  );

  for (const [rail, label, path] of targets) {
    await page.goto(`${baseUrl}/app/dashboard`, {
      waitUntil: "domcontentloaded",
    });
    await page.getByTitle(rail).hover();
    await page.getByRole("button", { name: label, exact: true }).click();
    await page.waitForURL((url) => url.pathname === path);
    if (new URL(page.url()).pathname !== path)
      throw new Error(`${label} routed to ${page.url()} instead of ${path}`);
  }

  if (errors.length)
    throw new Error(`Browser/API errors: ${errors.join(" | ")}`);
  console.log(
    "PASS dedicated navigation: all mapped WMS workflows and Location Create/Edit bypass incorrect fallback routes.",
  );
} finally {
  await browser.close();
}
