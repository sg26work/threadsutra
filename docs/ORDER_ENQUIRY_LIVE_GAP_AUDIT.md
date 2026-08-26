# Order Enquiry live-gap audit

Status: **in progress, not yet verified**. The four enquiry tabs, Common Import, row dialogs, WMS Order Create/Edit, and Seller Panel Market Order View/Edit now have dedicated local implementations; the explicitly listed nested gaps below remain open.

## Implemented from live evidence

- Distinct All, Failed Orders, Cancelled Picked Orders, and Failed Shipments fields, grids, page sizes, endpoints, action sets, reset behavior, and exact selection/search validation.
- All-tab pending queues and expanded advanced controls, including the observed `999999` external-customer validation.
- Failed-order ForcePull persistence, cancelled-order PutAway persistence, and failed-shipment retry persistence.
- Tab-specific empty-export messages and CSV outputs.
- Common Import child tabs and exact `OrderImport`/35000-row surface. XLSX parsing persists imported orders, import-job results, and batch details; Download and File Detail now perform searches and render the observed grids.
- Live Common Import contracts inspected: `CommonImportExcel`, template path `imports/VIN_REP_OrderImport_USPL.xlsx`, `commonJsonSearch`, and `fetchimportFileDetails`.

## Validation completed

- `npm run typecheck`: pass.
- `npm run build`: pass; existing Node 20.14/Vite 20.19 recommendation and large-bundle warnings remain.
- `ERETAIL_BASE_URL=http://127.0.0.1:3011 npm run test:order-enquiry`: pass.
- Browser verifier covers all tab schemas, advanced fields, exact validations, selection errors, mutation persistence, XLSX import/job/detail persistence, four row dialogs, nested import tabs, paging, and console cleanliness.
- `ERETAIL_BASE_URL=http://127.0.0.1:3011 npm run test:order-maintenance`: pass for the 12-tab WMS child, mutation/reload persistence, and clean console.
- `ERETAIL_BASE_URL=http://127.0.0.1:3011 npm run test:market-order-view`: pass for the dedicated six-tab Seller Panel child, full live option catalogs, two-document KYC validation, nested workflow persistence, reload state, and clean console.
- Second live inspection confirms the four live action sets and distinct secondary grid columns/page sizes against local.

## Implemented recursive children

Live All-tab rows expose these children:

1. Order No opens `orderMaintenanceBS?orderCode=...` for WMS orders or `MarketOrderViewERP?orderNo=...` for Seller Panel orders.
2. Ext Order No opens `opendDialog(...)`.
3. Sub Order ID invokes `multipleSubIdClick(...)`.
4. Pick/Ship Instructions invokes `fetchInstruction(...)`; Payment Details invokes `fetchPaymentDtails(...)`.

The WMS child is now a dedicated `/app/order-maintenance` route with the twelve observed tabs, persisted save/change-type/hold/close/copy/comments/tags/payment/gift-wrap/E-way/attachment workflows, exact observed core validations, and More actions. Quick Ship retains the live verification gate.

The Seller Panel child is now a distinct `/app/market-order-view` route with its six observed tabs (Order Detail, Address, Comment History, Order Tags, KYC, Attachment), exact cancel validation and confirmation, and persisted KYC/comment/copy/cancel behavior. Its Change Address dialog, Close SO, Back To Status, Hold/UnHold, Update Seller `SPMKTODRSLR` picker surface, Raise Return, and attachment deletion now have dedicated persisted implementations. Order Enquiry routes rows by observed `order_source` instead of sending every order to the WMS editor.

The Ext Order activity log, Multiple SubID, Pick/Ship Instructions, and Payment Details row dialogs now use dedicated local dialogs with the observed headers and persisted order data.

## Active recursive gaps

1. WMS E-way Update, Cancel, and Extend use the three observed styled nested dialogs and persist their reason/status/remarks. Print now follows a PDF download transport instead of the former JSON artifact; exact live PDF content and refetch behavior still need final comparison.
2. WMS attachment upload, selection, deletion, and download are implemented; exact live handler messaging and final visual comparison remain open.
3. Seller Panel attachment save/delete/download is functional and deletion uses the observed exact messages. Multipart transport and final visual comparison remain open.
4. WMS CRM Tickets has an observed tab but no ADA17 panel payload; it remains contract-inspected only for that row.

The next work item is finishing WMS E-way PDF/refetch and attachment comparison, then completing the full Order Enquiry second-comparison gate.

No Order Enquiry workflow is marked verified by this audit.
