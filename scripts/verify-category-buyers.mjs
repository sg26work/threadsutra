import { chromium } from "playwright";
const baseUrl = process.env.ERETAIL_BASE_URL || "http://127.0.0.1:3011";
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
  await page.goto(baseUrl);
  await page.evaluate(() =>
    localStorage.setItem(
      "vin_user",
      JSON.stringify({ username: "category-buyer-verifier" }),
    ),
  );
  await page.goto(`${baseUrl}/app/procurement/category-buyers`, {
    waitUntil: "domcontentloaded",
  });
  const headers = await page.getByRole("columnheader").allTextContents();
  for (const expected of [
    "Buyer Code",
    "Buyer Name",
    "Buyer Description",
    "Phone",
    "Alternate Phone",
    "Email",
    "Status",
    "UDF1",
    "UDF5",
    "Location",
    "Created by",
    "createdDate",
    "updatedBy",
    "updatedDate",
    "Category",
    "Actions",
  ])
    if (!headers.includes(expected))
      throw new Error(`Missing live column ${expected}`);
  const sizes = await page
    .getByRole("combobox", { name: "Records per Page" })
    .locator("option")
    .allTextContents();
  if (sizes.join() !== "20,50,100,200") throw new Error("Page sizes mismatch.");
  await page.locator("#gs_buyerName").fill("Test");
  await page.locator("#gs_displayIsActive").selectOption("1");
  const requestPromise = page.waitForRequest(
    (request) =>
      request.url().endsWith("/api/category-buyers") &&
      request.method() === "POST",
  );
  await page.getByRole("button", { name: "Search", exact: true }).click();
  const payload = (await requestPromise).postDataJSON();
  if (
    payload.rows !== 20 ||
    payload.page !== 1 ||
    payload.sidx !== "" ||
    payload.sord !== "asc" ||
    payload.buyerName !== "Test" ||
    payload.displayIsActive !== "1" ||
    payload.REQ_SEARCH_FLAG !== true
  )
    throw new Error("Search payload mismatch.");
  await page.getByRole("button", { name: "Advanced Search" }).click();
  await page.locator("#gs_udf1").fill("reset");
  await page.getByRole("button", { name: "Reset" }).click();
  if (
    (await page.locator("#gs_buyerName").inputValue()) ||
    (await page.locator("#gs_udf1").count())
  )
    throw new Error("Reset mismatch.");
  await page.getByRole("button", { name: "Add New" }).click();
  await page.locator("#saveButton").click();
  await page.getByText("Buyer Name is required.", { exact: true }).waitFor();
  const suffix = Date.now().toString().slice(-7);
  const name = `Buyer ${suffix}`;
  await page.locator("#buyerName").fill(name);
  await page.locator("#email").fill(`buyer${suffix}@example.com`);
  await page.locator("#phone").fill("9988776655");
  const categories = page.locator("#categorySelect option");
  if (await categories.count())
    await page.locator("#categorySelect").selectOption({ index: 0 });
  await page.locator("#UDF1").fill("buyer-udf");
  const savePromise = page.waitForRequest(
    (request) =>
      request.url().endsWith("/api/category-buyers") &&
      request.method() === "POST" &&
      !request.postDataJSON()?.REQ_SEARCH_FLAG,
  );
  await page.locator("#saveButton").click();
  const saved = await (await (await savePromise).response()).json();
  if (
    !saved.buyer_code ||
    saved.buyer_name !== name ||
    saved.udf[0] !== "buyer-udf"
  )
    throw new Error("Save contract mismatch.");
  await page.locator("#gs_buyerName").fill(name);
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page
    .getByRole("button", { name: saved.buyer_code, exact: true })
    .click();
  if (
    (await page.locator("#buyerCode").inputValue()) !== saved.buyer_code ||
    (await page.locator("#buyerName").inputValue()) !== name
  )
    throw new Error("Reopen persistence mismatch.");
  await page.locator("#buyerDesc").fill("Updated buyer");
  const updatePromise = page.waitForRequest(
    (request) =>
      request.url().endsWith("/api/category-buyers") &&
      request.method() === "PUT",
  );
  await page.locator("#saveButton").click();
  const updated = await (await (await updatePromise).response()).json();
  if (updated.description !== "Updated buyer")
    throw new Error("Update persistence mismatch.");
  if (errors.length)
    throw new Error(`Browser/API errors: ${errors.join(" | ")}`);
  console.log(
    "PASS Category Buyers: dedicated API search, live filters/columns, pagination, reset, validation, create, reopen, and update persistence.",
  );
} finally {
  await browser.close();
}
