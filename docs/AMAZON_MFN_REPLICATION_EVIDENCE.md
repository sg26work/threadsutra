# Amazon MFN Integration Replication Evidence

Authoritative source inspected: `AMAZON MFN Integration – Vinculum Product Guide.pdf` (16 pages). Every page was text-extracted and rendered for visual inspection before implementation. No Amazon MFN workflow videos were supplied with the request, so no interaction is described as video-verified.

## 1. Modules replicated

| Module | Evidence-aligned surface | Persistent data/dependency |
|---|---|---|
| Manage Channels | Sales > Manage Channels, documented Amazon marketplace selector inventory, Amazon India entry | shared `channels` |
| Channel Maintenance | Channel Detail, Orders, Channel SKU, Inventory, Save, region configuration and connection status | `amazon_mfn_config`, synchronized shared channel |
| Seller credentials | India, UAE, and US/other-country forms; MWS credentials, developer, Easy Ship and OTP state | configuration-presence flags only; raw secrets excluded |
| Channel mappings | Merchant SKU, ASIN, ChannelSKUCode, ChannelProductId, Vin SKU, mapping state | `amazon_mfn_mappings`, shared `skus` |
| MP Inventory Log | asynchronous Submitted → Success/Failed feed records, reconciliation | `amazon_mfn_inventory_logs`, shared `inventory` |
| Order pull/create | Pending reservation without buyer detail; Un-Shipped allocation with buyer and shared sales order | `amazon_mfn_orders`, shared `sale_orders`, `fulfillment_orders`, `inventory` |
| Order Pack | dimensions, prefetch, scheduled label processing, invoice, shipping label and tracking number | `amazon_mfn_orders`, `amazon_mfn_label_calls` |
| Shipment and returns | transporter/tracking/status push and Confirmed return pull | `amazon_mfn_shipments`, `amazon_mfn_returns` |

Dedicated route: `/app/fulfillment/amazon-mfn`. It is available from Sales > Manage Channels and WMS > Order Processing.

## 2. Workflows replicated

1. Open Sales > Manage Channels > Add New; view the Amazon variants shown in the guide and choose Amazon India to open Channel Maintenance.
2. Maintain one MFN Order Fulfillment warehouse, SLA, order and return synchronization dates, inventory settings, PrePack and ReadyToShip timing.
3. Select one of the three regional interface forms. Save India credentials with Seller ID, MWS details, Panel User ID/Password, developer information, Sunday slot setting, Need Invoice, and Easy Ship.
4. When India Easy Ship is No, require an Amazon Seller Central 6-digit OTP through Channel Connection Status.
5. Map Amazon Merchant SKU to ChannelSKUCode and ASIN to ChannelProductId; map to a Vin SKU before pulling inventory/order activity.
6. Submit inventory feeds to the MP Inventory Log, process to Success, reject duplicate in-flight entries and mark missing Amazon listings Failed.
7. Pull Pending and Un-Shipped Amazon orders. Pending reserves stock without customer data; Un-Shipped creates the Allocated order with customer details and shared sales/fulfillment records.
8. Confirm a pulled Pending Amazon order to Un-Shipped/Allocated, then prefetch or schedule packing with positive weight and dimensions.
9. Process the simulated asynchronous label feed, generate seller invoice, shipping label and tracking; Easy Ship moves a packed order to Waiting for Pick-Up.
10. Push transporter, tracking number and Shipped status to Amazon. Pull return orders as Confirmed with Pending Inbound.

## 3. Documentation-to-video discrepancy matrix

| Topic | Documentation | Video evidence | Replica decision |
|---|---|---|---|
| Workflow videos | Request refers to three videos | No Amazon videos supplied | PDF is authoritative; no video-fidelity claim |
| Multi-warehouse | MFN is single-warehouse; use Flex or separate accounts for multiple warehouses | None | Single warehouse enforced in configuration/API |
| Inventory direction | Feature list says inventory sync and push; Channel Maintenance table says automatically pull/update; later page explicitly describes feed submission/push | None | Expose Push/Pull setting; default/verified asynchronous implementation is Feed Push because that is the detailed lifecycle |
| Confidential credentials | Guide says Merchant ID, token and IDs are confidential | None | Store configured state only; raw MWS/panel credentials are removed from all persisted/returned responses |
| MWS versus current Amazon APIs | Guide is based on MWS credentials/endpoints | None | Preserve guide terminology and fields; do not claim a live Amazon MWS/SP-API connection |
| Easy Ship invoice | Need Invoice pulls an Amazon invoice, while later detail says seller-generated invoice/label is used | None | Preserve Need Invoice configuration and create the evidence-supported local seller invoice/label response; real source payload remains unverified |
| Label timing | Guide states scheduled every six minutes and 6–10 minutes asynchronous processing | None | Deterministic Submitted/Processing/Process Scheduled Pack controls model the states without a real six-minute background timer |
| Regional details | Three forms shown; only India field semantics are described in prose | None | India fields/validations are exact; UAE and US/other form fields follow the screenshots, with undocumented regional behavior left unclaimed |
| Return inbound | Return Pull feature is named; only guide-level return mechanics are supplied | None | Pull creates Confirmed/Pending Inbound; no undocumented inbound editor was invented |

## 4. APIs, database, and data mappings

- `GET /api/amazon-mfn?entity={config|mappings|orders|inventoryLogs|returns|shipments}` retrieves each persisted workflow stage.
- `PUT /api/amazon-mfn` supports `save-config` and `map-sku`.
- `POST /api/amazon-mfn` supports `verify-otp`, `submit-inventory`, `process-feed`, `reconcile-inventory`, `pull-orders`, `confirm-order`, `prefetch-label`, `pack-order`, `process-label`, `ship-order`, `cancel-order`, and `pull-returns`.

| Amazon MFN source value | Vin e-Retail mapping |
|---|---|
| Merchant SKU | `ChannelSKUCode` / `merchant_sku` |
| ASIN | `ChannelProductId` / `asin` |
| Available inventory minus Safety Stock | submitted MP inventory-feed quantity |
| Pending Amazon order | reserved inventory plus `Pending`, no buyer data |
| Un-Shipped Amazon order | `Allocated` Amazon order, shared sales-order header and fulfillment lines |
| Successful label feed | invoice, shipping label, tracking, pack status |
| Transporter/tracking at shipment | Amazon shipment record and shared sales order `Shipped` |
| Return Pull | `Confirmed` Amazon return with `Pending Inbound` |

The persistence layer uses MongoDB when `MONGODB_URI` is configured; otherwise the same relationships run with seeded in-memory data.

## 5. Validations and business rules implemented

- Channel Name and one Order Fulfillment WH are required; MFN rejects a multi-warehouse configuration.
- Order/return dates are required when their synchronization setting is Yes.
- Seller ID, Marketplace ID, MWS Token, Access Key, Secret Key, numeric Developer ID, and lower-case `vinculum` developer name are validated.
- India requires Panel User ID/Password and Need Invoice = Yes. Easy Ship = No requires a six-digit OTP before configuration reaches Configured.
- Amazon Merchant SKU cannot be blank and ASIN must be a ten-character value beginning with `B`.
- Inventory Sync can be disabled; Submitted feeds cannot duplicate the same in-flight SKU. Listing absence produces the exact documented mapping error. Reconciliation is once daily.
- Order Sync = No blocks order pull, pack, invoice and shipping-label dependencies.
- Pending order pull reserves inventory but does not expose buyer data; only Un-Shipped becomes Allocated with buyer/sales-order data.
- PrePack must be enabled before prefetch. Pack requires Allocated status and positive weight, length, width and height.
- Label calls are rate-limited to 30/hour and report `Feed Submission Results not ready.` while processing.
- Shipment requires a packed invoice/label plus Transporter Name and Tracking No. Cancellation is blocked after packing/shipment.
- Return Pull is idempotent and creates Confirmed status pending inbound processing.

## 6. Permissions and roles implemented

The route uses the existing authenticated `ProtectedRoute`. The guide specifies Account Manager/Support enablement of Tracking No. Pull; the setting is retained as a backend-controlled configuration state and no undocumented user role or self-service permission was added. Existing Master SKU, Tally, ARS and AJIO permissions/behavior were preserved.

## 7. Test cases executed

- All 16 PDF pages text-extracted and visually reviewed before code changes.
- `npm run typecheck`: passed.
- `npm run build`: passed; Vite emits the existing Node 20.14 versus preferred 20.19+ warning and bundle-size warning.
- Targeted ESLint for Amazon UI/API/seed/routing/menu/test files: passed with no warnings.
- `npm run lint`: repository-wide baseline remains 243 errors and 4 warnings in unrelated existing files; Amazon-targeted lint is clean.
- `node scripts/verify-amazon-mfn-api.mjs`: 44 assertions passed, including 18 documented negative/error paths and shared-channel/sales-order synchronization.
- `python3 scripts/verify-amazon-mfn-browser.py`: passed navigation, selector, regional credentials, mapping, MP Inventory Log, order state transition, asynchronous pack, shipment and return workflows.
- Visual screenshots reviewed at 2560×1440: Channel Maintenance, Channel Configure, mappings, Order Pack, and Shipment & Returns.
- AJIO JIT regression: 21 assertions plus browser workflow passed after the shared marketplace-selector update.
- Full AJIO lifecycle regression: 25 assertions passed from credentials through Shipped status.

## 8. Remaining mismatches or uncertainties

- No Amazon videos were supplied. Click timing, precise focus/hover behavior, responsive breakpoints, transient reference notifications, and loading-duration fidelity are unverified.
- No live Seller Central/MWS/SP-API credentials, feed schemas, signed requests, webhooks, retries, or throttling response headers were supplied. The integration is a deterministic local replica, not a live Amazon connection.
- The documentation’s old MWS model and current marketplace API behavior may differ; current external Amazon behavior was intentionally not inferred.
- The real six-minute scheduler and 6–10 minute Amazon completion latency are represented as visible asynchronous states with a manual processing action.
- Exact BIRT/PDF geometry of Amazon invoice and label documents, real marketplace invoice ownership, and actual return inbound pages are not documented sufficiently to verify exactly.
- Regional marketplace IDs/endpoints are seeded from the guide’s tables; no external validation has been performed.

## 9. Exact files/components changed

- `api/amazon-mfn.js` — dedicated Amazon MFN API, state machine, validations, secret handling, downstream synchronization, and documented errors.
- `api/seed.js` — Amazon MFN configuration, mappings, orders, returns, logs, shipment data, and AMF channel seed.
- `server.js` — `/api/amazon-mfn` registration.
- `src/eretail/modules/AmazonMFNWorkflow.tsx` — dedicated Channel Maintenance, configuration modal, mapping, inventory feed, order, pack, shipment, return, loading and error UI.
- `src/eretail/ManageChannels.tsx` — Amazon documented selector tiles and Amazon channel navigation, preserving AJIO behavior.
- `src/App.tsx` — protected Amazon MFN route.
- `src/eretail/menuData.ts` — WMS Amazon MFN menu entry.
- `scripts/verify-amazon-mfn-api.mjs` — repeatable 44-check API test.
- `scripts/verify-amazon-mfn-browser.py` — repeatable interactive browser workflow test.
- `docs/AMAZON_MFN_REPLICATION_EVIDENCE.md` — this evidence/discrepancy report.

Master SKU, Tally, ARS, AJIO workflows, and unrelated modules were not modified beyond the shared marketplace selector/navigation needed to expose Amazon MFN.
