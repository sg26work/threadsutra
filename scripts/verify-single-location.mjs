import { chromium } from 'playwright';

const baseUrl = process.env.ERETAIL_BASE_URL || 'http://127.0.0.1:5173';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const runtimeErrors = [];
const apiErrors = [];
page.on('pageerror', (error) => runtimeErrors.push(error.message));
page.on('console', (message) => { if (message.type() === 'error') runtimeErrors.push(message.text()); });
page.on('response', (response) => { if (response.url().includes('/api/') && response.status() >= 400) apiErrors.push(`${response.status()} ${response.url()}`); });

try {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.setItem('vin_user', JSON.stringify({ username: 'demo-admin' })));

  const poNo = `PO-CHARGE-${Date.now()}`;
  const inboundSuffix = poNo.slice(-8);
  const inboundNo = `GRN-${inboundSuffix}`;
  const inboundAsn = `ASN-${inboundSuffix}`;
  const inboundInvoice = `INV-${inboundSuffix}`;
  const create = await page.request.post(`${baseUrl}/api/purchase-orders`, { data: {
    po_no: poNo, vendor: 'Apex Apparel Mfg Pvt Ltd', vendor_code: 'VEN001', warehouse: 'Franchise',
    po_date: '2026-08-23', expected_date: '2026-08-30', items: 1, qty: 1, amount: 540,
    buyer_name: 'Test Buyer', recv_validation_code: 'No Excess Receiving', status: 'Pending Confirmation',
    po_method: 'Single Location', delivery_locations: ['Franchise'],
    line_items: [{ sku_code: 'TSHIRT-BLK-M', description: 'Cotton Crew Neck T-Shirt - Black', po_qty: 1, mrp: 1299, unit_cost: 540, unit_base_cost: 540, delivery_date: '2026-08-30', tax: 'GST', additional_charge: 0 }],
    additional_charges: [{ charge_id: 'FRT', charge_line_id: 'FRT-1', charge_type: 'Percentage', charge_name: 'Freight', operand: 10, charge: 999 }],
    udf: ['', '', '', '', '', '', '', '', '', ''],
    terms: '<p>Original purchase terms</p>',
  }});
  if (!create.ok()) throw new Error(`Unable to create Additional Charges fixture: ${create.status()} ${await create.text()}`);
  const purchaseOrder = await create.json();
  const inboundCreate = await page.request.post(`${baseUrl}/api/grn`, { data: {
    grn_no: inboundNo, po_no: poNo, vendor: 'Apex Apparel Mfg Pvt Ltd', warehouse: 'Franchise',
    grn_date: '2026-08-29', received_qty: 1, status: 'Pending Confirmation', asn_no: inboundAsn,
    asn_date: '2026-08-29', asn_type: 'Purchase Order', invoice_no: inboundInvoice,
  }});
  if (!inboundCreate.ok()) throw new Error(`Unable to create PO Inbound fixture: ${inboundCreate.status()} ${await inboundCreate.text()}`);

  await page.goto(`${baseUrl}/app/procurement/po/single?poId=${purchaseOrder.id}`, { waitUntil: 'domcontentloaded' });

  const tab = page.getByRole('button', { name: 'Additional Charges', exact: true });
  await tab.click();
  await page.getByRole('region', { name: 'Additional Charges' }).waitFor();
  for (const heading of ['Charge Name', 'Type', 'Amount', 'Charge']) await page.getByRole('columnheader', { name: heading, exact: true }).waitFor();

  const panel = page.getByRole('region', { name: 'Additional Charges' });
  if (await panel.getByRole('button', { name: /add charge|remove/i }).count()) throw new Error('Additional Charges exposes unobserved Add/Remove controls.');
  const freightRow = panel.getByRole('row').filter({ hasText: 'Freight' });
  await freightRow.click();
  const amount = panel.getByRole('spinbutton', { name: 'Amount for Freight' });
  await amount.fill('25.5');
  await amount.press('Enter');

  const updateRequest = page.waitForRequest((request) => request.url().includes('/api/purchase-orders') && request.method() === 'PUT');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  const request = await updateRequest;
  const payload = request.postDataJSON();
  if (payload.additional_charges?.[0]?.operand !== 25.5) throw new Error('Save did not serialize the edited Additional Charges Amount.');
  await page.getByText('PO saved successfully.', { exact: true }).waitFor();
  await freightRow.getByText('137.70', { exact: true }).waitFor();

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Additional Charges', exact: true }).click();
  await panel.getByRole('row').filter({ hasText: 'Freight' }).getByText('25.50', { exact: true }).waitFor();
  await panel.getByRole('row').filter({ hasText: 'Freight' }).getByText('137.70', { exact: true }).waitFor();
  if (await panel.getByRole('spinbutton').count()) throw new Error('Amount should return to read-only display after reload until its row is selected.');

  await page.getByRole('button', { name: 'User Defined Fields', exact: true }).click();
  const udfPanel = page.getByRole('region', { name: 'User Defined Fields' });
  for (let index = 1; index <= 10; index += 1) {
    const input = udfPanel.getByRole('textbox', { name: `PO UDF${index}`, exact: true });
    await input.waitFor();
    if (await input.getAttribute('maxlength') !== '50') throw new Error(`PO UDF${index} does not enforce the live 50-character limit.`);
  }
  await udfPanel.getByRole('textbox', { name: 'PO UDF1', exact: true }).fill('  Alpha  ');
  await udfPanel.getByRole('textbox', { name: 'PO UDF10', exact: true }).fill('Omega');
  const udfRequest = page.waitForRequest((request) => request.url().includes('/api/purchase-orders') && request.method() === 'PUT' && request.postDataJSON()?.udf);
  await udfPanel.getByRole('button', { name: 'Save UDF', exact: true }).click();
  const udfPayload = (await udfRequest).postDataJSON();
  if (udfPayload.udf.length !== 10 || udfPayload.udf[0] !== 'Alpha' || udfPayload.udf[9] !== 'Omega') throw new Error('Save UDF did not serialize and trim all ten fields.');
  await page.getByText('UDF fields Updated successfully', { exact: true }).waitFor();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'User Defined Fields', exact: true }).click();
  if (await page.getByRole('textbox', { name: 'PO UDF1', exact: true }).inputValue() !== 'Alpha') throw new Error('PO UDF1 did not persist after reload.');
  if (await page.getByRole('textbox', { name: 'PO UDF10', exact: true }).inputValue() !== 'Omega') throw new Error('PO UDF10 did not persist after reload.');

  await page.getByRole('button', { name: 'Terms and Conditions', exact: true }).click();
  const termsPanel = page.getByRole('region', { name: 'Terms and Conditions' });
  await termsPanel.getByRole('application', { name: 'Rich Text Editor, poTerms' }).waitFor();
  for (const control of ['Source', 'Save', 'New Page', 'Preview', 'Print', 'Undo', 'Redo', 'Select All', 'Bold', 'Italic', 'Underline', 'Strike Through', 'Subscript', 'Superscript', 'Remove Format', 'Insert/Remove Numbered List', 'Insert/Remove Bulleted List', 'Decrease Indent', 'Increase Indent', 'Block Quote', 'Align Left', 'Center', 'Align Right', 'Justify', 'Link', 'Unlink', 'Image', 'Table', 'Insert Horizontal Line', 'Insert Special Character', 'Insert Page Break for Printing', 'Show Blocks', 'About CKEditor 4']) {
    await termsPanel.getByRole('button', { name: control, exact: true }).waitFor();
  }
  const expectedFormats = ['Normal', 'Heading 1', 'Heading 2', 'Heading 3', 'Heading 4', 'Heading 5', 'Heading 6', 'Formatted', 'Address', 'Normal (DIV)'];
  const expectedFonts = ['Arial', 'Comic Sans MS', 'Courier New', 'Georgia', 'Lucida Sans Unicode', 'Tahoma', 'Times New Roman', 'Trebuchet MS', 'Verdana'];
  const expectedSizes = ['8', '9', '10', '11', '12', '14', '16', '18', '20', '22', '24', '26', '28', '36', '48', '72'];
  for (const [label, expected] of [['Paragraph Format', expectedFormats], ['Font Name', expectedFonts], ['Font Size', expectedSizes]]) {
    const options = await termsPanel.getByRole('combobox', { name: label, exact: true }).locator('option').allTextContents();
    for (const option of expected) if (!options.includes(option)) throw new Error(`${label} is missing live option ${option}.`);
  }
  await termsPanel.getByRole('button', { name: 'Source', exact: true }).click();
  const source = termsPanel.getByRole('textbox', { name: 'Terms and Conditions HTML source', exact: true });
  await source.fill('  <p><strong>Payment within 30 days.</strong></p>  ');
  await termsPanel.getByRole('button', { name: 'Preview', exact: true }).click();
  await page.getByRole('article', { name: 'Terms and Conditions preview' }).getByText('Payment within 30 days.', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  const termsRequest = page.waitForRequest((request) => request.url().includes('/api/purchase-orders') && request.method() === 'PUT' && request.postDataJSON()?.terms);
  await termsPanel.getByRole('button', { name: 'Save', exact: true }).click();
  const termsPayload = (await termsRequest).postDataJSON();
  if (termsPayload.terms !== '  <p><strong>Payment within 30 days.</strong></p>  ') throw new Error('Terms Save did not serialize the editor HTML through the main PO request.');
  await page.getByText('PO saved successfully.', { exact: true }).waitFor();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Terms and Conditions', exact: true }).click();
  await page.getByRole('region', { name: 'Terms and Conditions' }).getByRole('button', { name: 'Source', exact: true }).click();
  if (await page.getByRole('textbox', { name: 'Terms and Conditions HTML source', exact: true }).inputValue() !== termsPayload.terms) throw new Error('Terms HTML did not persist after reload.');

  await page.getByRole('button', { name: 'Comment History', exact: true }).click();
  const commentsPanel = page.getByRole('region', { name: 'Comment History' });
  const commentInput = commentsPanel.getByRole('textbox', { name: 'Add Purchase Order Comments', exact: true });
  await commentInput.waitFor();
  await commentsPanel.getByText('No Comments to View', { exact: true }).waitFor();
  if (await commentsPanel.getByRole('button', { name: /edit|delete|search|refresh/i }).count()) throw new Error('Comment History exposes actions not observed live.');
  await commentsPanel.getByRole('button', { name: 'Submit Comments', exact: true }).click();
  await page.getByText('Please Enter Some Comments', { exact: true }).waitFor();
  await commentInput.fill('  Comment history persistence  ');
  const commentRequest = page.waitForRequest(request => request.url().includes('/api/purchase-order-comments') && request.method() === 'POST');
  await commentsPanel.getByRole('button', { name: 'Submit Comments', exact: true }).click();
  const commentPayload = (await commentRequest).postDataJSON();
  if (commentPayload.commentDet !== '  Comment history persistence  ') throw new Error('Comment History unexpectedly trimmed the live payload.');
  await commentsPanel.getByText('Comment history persistence', { exact: true }).waitFor();
  await page.waitForFunction(() => document.querySelector('#comments')?.value === '');
  if (await commentInput.inputValue() !== '') throw new Error('Comment field was not cleared after Submit Comments.');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Comment History', exact: true }).click();
  await page.getByRole('region', { name: 'Comment History' }).getByText('Comment history persistence', { exact: true }).waitFor();
  for (const field of ['commentDate', 'commentAddedBy', 'commentStatus', 'viewComments']) {
    if (!await page.locator(`input[type="hidden"][name="${field}"]`).count()) throw new Error(`Comment History is missing live hidden field ${field}.`);
  }

  await page.getByRole('button', { name: 'PO Tags', exact: true }).click();
  const tagsPanel = page.getByRole('region', { name: 'PO Tags' });
  const tagSelect = tagsPanel.getByRole('listbox', { name: 'PO Tags', exact: true });
  const expectedTags = ['gty', 'Perishable Goods', 'air', 'TESTING', 'Fragile Items', 'PO Tag2', 'PO Tag3', 'PO Tag4', 'PO Tag5', 'po', 'PO Tag6', 'po tag7', 'hgjkhl', 'CCM'];
  await page.waitForFunction(() => document.querySelectorAll('#poTag_select option').length === 14);
  if (JSON.stringify(await tagSelect.locator('option').allTextContents()) !== JSON.stringify(expectedTags)) throw new Error('PO Tags options do not match live ordering.');
  for (const action of ['Add Tags', 'Save Tags', 'Remove Tags']) await tagsPanel.getByRole('button', { name: action, exact: true }).waitFor();
  for (const heading of ['PO Tag', 'PO Status When Tagged', 'Tag Date', 'Tagged By']) await tagsPanel.getByRole('columnheader', { name: heading, exact: true }).waitFor();
  await tagsPanel.getByRole('button', { name: 'Add Tags', exact: true }).click();
  await page.getByText('PO Tags is mandatory.', { exact: true }).waitFor();
  await tagsPanel.getByRole('button', { name: 'Remove Tags', exact: true }).click();
  await page.getByText('Please select row(s) to delete.', { exact: true }).waitFor();
  await tagSelect.selectOption('1');
  await tagsPanel.getByRole('button', { name: 'Add Tags', exact: true }).click();
  await tagsPanel.getByRole('row').filter({ hasText: 'Fragile Items' }).waitFor();
  const tagRequest = page.waitForRequest((request) => request.url().includes('/api/purchase-order-tags') && request.method() === 'POST');
  await tagsPanel.getByRole('button', { name: 'Save Tags', exact: true }).click();
  const tagPayload = (await tagRequest).postDataJSON();
  if (tagPayload.poCode !== poNo || tagPayload.gridData !== `1\u0015A\u0015`) throw new Error('Save Tags did not serialize the observed add payload.');
  await page.getByText('PO Tags Saved Successfully.', { exact: true }).waitFor();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'PO Tags', exact: true }).click();
  const persistedTag = page.getByRole('region', { name: 'PO Tags' }).getByRole('row').filter({ hasText: 'Fragile Items' });
  await persistedTag.waitFor();
  await persistedTag.getByRole('checkbox', { name: 'Select Fragile Items', exact: true }).check();
  await page.getByRole('region', { name: 'PO Tags' }).getByRole('button', { name: 'Remove Tags', exact: true }).click();
  const deleteRequest = page.waitForRequest((request) => request.url().includes('/api/purchase-order-tags') && request.method() === 'POST');
  await page.getByRole('region', { name: 'PO Tags' }).getByRole('button', { name: 'Save Tags', exact: true }).click();
  if ((await deleteRequest).postDataJSON().gridData !== `1\u0015D\u0015AT`) throw new Error('Save Tags did not serialize the observed delete payload.');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'PO Tags', exact: true }).click();
  if (await page.getByRole('region', { name: 'PO Tags' }).getByRole('row').filter({ hasText: 'Fragile Items' }).count()) throw new Error('Removed PO Tag persisted after reload.');

  await page.getByRole('button', { name: 'Import', exact: true }).click();
  const importPanel = page.getByRole('region', { name: 'Import' });
  await importPanel.getByText('The screen will be deprecated on 25th Nov 2025. Please use Admin > Common Import > PO Import', { exact: true }).waitFor();
  for (const heading of ['Seq No','PO Code','Import File Name','SKU','Remarks']) await importPanel.getByRole('columnheader', { name: heading, exact: true }).waitFor();
  for (const action of ['Download Template','Import','Reset']) await importPanel.getByRole(action === 'Download Template' ? 'link' : 'button', { name: action, exact: true }).waitFor();
  if (await importPanel.getByRole('button', { name: 'Import', exact: true }).count() !== 1) throw new Error('Import control is missing.');
  await importPanel.getByRole('button', { name: 'Import', exact: true }).click();
  await page.getByText('No file chosen to import.', { exact: true }).waitFor();
  await importPanel.getByRole('button', { name: 'Reset', exact: true }).click();

  await page.getByRole('button', { name: 'Attached Document', exact: true }).click();
  const documentPanel = page.getByRole('region', { name: 'Attached Document' });
  await documentPanel.getByText('Document Attached', { exact: true }).waitFor();
  if (await documentPanel.getByLabel('Document file 1', { exact: true }).count() !== 1) throw new Error('Attached Document does not start with the live blank file row.');
  await documentPanel.getByRole('button', { name: 'Add New Row', exact: true }).first().click();
  if (await documentPanel.getByLabel(/Document file/).count() !== 2) throw new Error('Add New Row did not clone the document file row.');
  await documentPanel.getByRole('button', { name: 'Delete Row', exact: true }).first().click();
  if (await documentPanel.getByLabel(/Document file/).count() !== 1) throw new Error('Delete Row did not remove the selected document row.');
  await documentPanel.getByRole('button', { name: 'Delete Row', exact: true }).click();
  if (await documentPanel.getByLabel(/Document file/).count() !== 1) throw new Error('Deleting the last document row did not reset it blank.');

  const asnRequest = page.waitForRequest((request) => request.url().includes('/api/purchase-order-asn') && request.method() === 'GET');
  await page.getByRole('button', { name: 'ASN', exact: true }).click();
  const asnUrl = new URL((await asnRequest).url());
  if (asnUrl.searchParams.get('poCode') !== poNo || asnUrl.searchParams.get('rows') !== '20' || asnUrl.searchParams.get('page') !== '1' || asnUrl.searchParams.get('sord') !== 'asc') throw new Error('ASN load request does not match the observed PO-scoped paging request.');
  const asnPanel = page.getByRole('region', { name: 'ASN' });
  for (const heading of ['ASN No.','ASN date','InvoiceNo','Transporter','Status']) await asnPanel.getByRole('columnheader', { name: heading, exact: true }).waitFor();
  await asnPanel.getByRole('row').filter({ hasText: inboundAsn }).waitFor();
  await asnPanel.getByText(inboundInvoice, { exact: true }).waitFor();
  for (const size of ['20','50','100','200']) if (!await asnPanel.getByRole('option', { name: size, exact: true }).count()) throw new Error(`ASN page size ${size} is missing.`);
  if (await asnPanel.getByRole('button').count() !== 1) throw new Error('ASN exposes controls beyond the observed ASN number link and pager.');
  await asnPanel.getByRole('button', { name: inboundAsn, exact: true }).click();
  if (!page.url().includes(`/app/grn?asnNo=${encodeURIComponent(inboundAsn)}`)) throw new Error('ASN No did not open the existing ASN workflow with the observed ASN parameter.');
  await page.goto(`${baseUrl}/app/procurement/po/single?poId=${purchaseOrder.id}`, { waitUntil: 'domcontentloaded' });

  const inboundRequest = page.waitForRequest((request) => request.url().includes('/api/purchase-order-inbound') && request.method() === 'GET');
  await page.getByRole('button', { name: 'PO Inbound', exact: true }).click();
  const inboundUrl = new URL((await inboundRequest).url());
  if (inboundUrl.searchParams.get('poCode') !== poNo || inboundUrl.searchParams.get('rows') !== '20' || inboundUrl.searchParams.get('page') !== '1' || inboundUrl.searchParams.get('sidx') !== 'GRNdate' || inboundUrl.searchParams.get('sord') !== 'desc') throw new Error('PO Inbound load request does not match live paging and sorting parameters.');
  const inboundPanel = page.getByRole('region', { name: 'PO Inbound' });
  await inboundPanel.getByText(poNo, { exact: true }).waitFor();
  for (const heading of ['Inbound No', 'Inbound Date', 'GRN No', 'ASN No', 'GRN Date', 'Invoice No', 'Status']) await inboundPanel.getByRole('columnheader', { name: heading, exact: true }).waitFor();
  if (await inboundPanel.getByRole('columnheader', { name: 'PO Code', exact: true }).count()) throw new Error('PO Inbound incorrectly exposes PO Code as a grid column.');
  await inboundPanel.getByRole('row').filter({ hasText: inboundNo }).waitFor();
  await inboundPanel.getByText(inboundAsn, { exact: true }).waitFor();
  await inboundPanel.getByText(inboundInvoice, { exact: true }).waitFor();
  if (await inboundPanel.locator('input,select,textarea').count()) throw new Error('PO Inbound exposes filter or pagination controls not observed live.');
  if (await inboundPanel.getByRole('button').count() !== 1) throw new Error('PO Inbound exposes controls beyond the observed Inbound No link.');
  await inboundPanel.getByRole('button', { name: inboundNo, exact: true }).click();
  if (!page.url().includes(`/app/grn?inboundNumber=${encodeURIComponent(inboundNo)}&receiveType=PO`)) throw new Error('Inbound No did not open the existing Inbound Create/Edit workflow with observed parameters.');
  await page.getByText('Inbound Create/Edit', { exact: true }).first().waitFor();
  if (await page.locator('vite-error-overlay').count()) throw new Error('Vite overlay is present.');
  if (runtimeErrors.length) throw new Error(`Runtime/console errors: ${runtimeErrors.join(' | ')}`);
  if (apiErrors.length) throw new Error(`API errors: ${apiErrors.join(' | ')}`);
  console.log('PASS Single Location: Additional Charges, UDF, Terms, Comment History, PO Tags, PO Inbound, and ASN live-observed read-only workflows.');
} finally {
  await browser.close();
}
