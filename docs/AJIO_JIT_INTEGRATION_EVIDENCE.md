# AJIO JIT Integration Replication Evidence

Authoritative source inspected: `AJIO JIT INTEGRATION – Vinculum Product Guide.pdf` (7 pages). All pages were text-extracted, rendered, and visually inspected before implementation. The earlier `AJIO PROCESS WORKFLOW – Vinculum Product Guide.pdf` supplies the downstream fulfillment detail where it does not conflict. No AJIO JIT videos were supplied with this request; video-only behavior is therefore not claimed as verified.

## 1. Modules replicated

| Module | Evidence-aligned surface | Persistent relationship |
|---|---|---|
| Manage Channels | Sales > Manage Channels, Add New marketplace selector, AJIO B2C/Business/JIT variants, existing AJIO row entry | shared `channels` |
| Channel Maintenance | Channel Detail, Orders, Channel SKU, Inventory accordions and Save/Refresh actions | `ajio_config` synchronized to `channels` |
| Channel Configure | Username, password, Is B2B, Enable E-Invoicing and conditional e-invoice credentials | credential-presence flags only; raw secrets excluded |
| SKU and inventory | Pull/Moderate configuration, `ChannelSKUCode`, `ChannelProductId`, SKU mapping, inventory sync and daily reconciliation | `ajio_sku_mappings`, shared `skus`, `inventory` |
| Order pull/create | Backorder inventory pull, reservation, AJIO PO release and sales-order creation | `ajio_backorders`, `ajio_orders`, shared `sale_orders`, `fulfillment_orders` |
| PrePack/picking | Picklist creation, Prefetch Shipment Label, LPN picking, box closure and Delivery Split | shared `picklists`, `ajio_deliveries` |
| Pack/shipment | Invoice/label generation, ReadyToShip at Pack or Manifest, manifest and handover | `ajio_invoices`, `ajio_manifests`, `ajio_deliveries` |

The dedicated route is `/app/fulfillment/ajio`; it remains linked from WMS > Order Processing and now also opens from the documented Sales > Manage Channels flow.

## 2. Workflows replicated

1. Open Sales > Manage Channels, choose Add New, view all five documented AJIO choices, and select AJIO JIT to open Channel Maintenance.
2. Maintain Channel Code, Channel Name, status, fulfillment warehouse, SLA, customer, tax type and auto-range setting.
3. Configure order synchronization dates, shipping/invoice ownership, Bill To Party, PrePack, ReadyToShip timing, per-line quantity behavior, return synchronization, marketplace documents and report names.
4. Open Configuring Interface; require Username and Password, lock Is B2B to Yes, default E-Invoicing to No, and conditionally require its username/password when enabled.
5. Enforce `SKU Sync = Pull` and `SKU Create = Moderate`; map AJIO SKU code to `ChannelSKUCode` and `ProductId~VariantId` to `ChannelProductId`.
6. Synchronize inventory for mapped SKUs and run reconciliation no more than once daily when enabled.
7. When Order Sync is disabled, block order pull and the downstream invoice, shipping-label and manifest path.
8. With PrePack enabled, mark new picklist deliveries Pending Prefetch and allow Prefetch Shipment Label while the delivery is pending.
9. Complete the evidence-backed AJIO lifecycle: reserve order pendency, create order, generate picklist, pick into closed LPN boxes, pack, generate invoice/AWBs, manifest, and hand over as Shipped.
10. Synchronize a successful Channel Maintenance save back to the shared Manage Channels name, warehouse, status and configured indicator.

## 3. Documentation-to-video discrepancy matrix

| Topic | Guide evidence | Video evidence | Replica decision |
|---|---|---|---|
| Workflow videos | Request refers to three videos | No videos supplied for AJIO JIT | PDF and non-conflicting earlier AJIO process guide are authoritative; no video-fidelity claim |
| Integration capability numbering | Page 2 numbering joins items 5 and 6 while listing nine capabilities | None | Preserve all named capabilities, independent of the numbering typo |
| Inventory direction | Overview names Inventory Push; feature table and mapping instructions require Pull with Moderate creation | None | Use the more explicit JIT configuration: Pull/Moderate; record the conflict rather than expose unsupported Push |
| PrePack label | Feature table says “Flipkart shipment label” in an AJIO guide | None | Treat as a copied marketplace-name error; implement AJIO marketplace label prefetch |
| Invoice ownership | Earlier process guide says invoice comes from AJIO; Channel Maintenance screenshot permits `Invoice No By = Self` and marketplace invoice selection | None | Preserve both configuration fields; current seeded evidence combination is Self plus Use Marketplace Invoice, with locally emulated response |
| Cancellation | Overview lists cancellation push; earlier process guide prohibits cancellation after packing/invoice | None | Permit the pre-pack cancellation path and block post-pack cancellation |
| E-Invoicing approval | Defaults No and may be enabled after client/AJIO Account Manager confirmation; source contains anomalous wording | None | Default No, require explicit enablement and credentials; external approval cannot be programmatically verified |
| Return handling | Return pull creates a Confirmed return and user performs inbound | None | Configuration and conditional date validation implemented; a new return-inbound UI was not invented without screen/field evidence |
| Add New selector | Screenshot shows AJIO marketplace tiles before Channel Maintenance | None | Added the documented AJIO B2C, Business, Business UAT, JIT and JIT UAT choices; AJIO JIT opens the dedicated maintenance screen |

## 4. APIs, database, and data mappings

- `GET /api/ajio?entity={config|mappings|backorders|orders|deliveries|invoices|manifests}` reads each AJIO stage.
- `PUT /api/ajio` with `save-config` validates and saves Channel Maintenance, strips secrets, and synchronizes the shared `channels` record.
- `PUT /api/ajio` with `map-sku` stores `ChannelSKUCode`, `ChannelProductId`, Vin SKU and mapped/sync state.
- `POST /api/ajio` supports `inventory-sync`, `inventory-reconciliation`, `prefetch-label`, `pull-backorders`, `release-po`, `generate-picklist`, `scan`, `close-box`, `delivery-split`, `pack`, `cancel`, `request-manifest`, and `handover`.

Exact mapping:

| AJIO value | Vin eRetail field |
|---|---|
| AJIO SKU code | `ChannelSKUCode` / `channel_sku_code` |
| `ProductId~VariantId` | `ChannelProductId` / `channel_product_id` |
| AJIO article mapping | Vin SKU / `sku_code` |
| Channel Maintenance ABR | shared `channels.channel_code` |
| Fulfillment warehouse | shared channel `location`; inventory warehouse for reservation |
| AJIO PO | AJIO order plus shared sale-order and fulfillment-line records |
| Picklist delivery | LPN boxes, invoice, child/master AWBs and manifest |

MongoDB is used when `MONGODB_URI` is configured; the same collection relationships operate against the seeded in-memory persistence otherwise.

## 5. Validations and business rules implemented

- Channel Name and Order Fulfillment WH are mandatory.
- Order Sync From Date is mandatory when Order Sync is Yes; Return Sync From Date is mandatory when Return Order Sync is Yes.
- Username must be an alphanumeric Seller ID beginning `DV`; Password is mandatory for first configuration and never persisted or returned.
- Is B2B must be Yes for AJIO JIT.
- E-Invoicing defaults No; username and password are mandatory when enabled, and raw credentials are never persisted.
- SKU Pull and Moderate creation are mandatory; `ChannelSKUCode` cannot be blank and `ChannelProductId` must match `ProductId~VariantId`.
- Inventory sync accepts the JIT Pull mode; reconciliation must be enabled, configured Once Daily, and cannot repeat on the same date.
- Disabling Order Sync blocks order pull, invoice/label generation dependencies and manifest generation.
- PrePack must be enabled before Prefetch Shipment Label; prefetch is limited to Pending/Processing deliveries.
- Mapped SKU and sufficient positive inventory are required before reservation; pendency pull and PO release are idempotency-protected.
- Only Allocated orders generate picklists. LPN reuse, scan quantities, closed-box immutability, Delivery Split, complete picking, packing, AWB assignment, cancellation, and full-manifest rules remain enforced end to end.
- ReadyToShip becomes true at Pack or Manifest according to configuration.

## 6. Permissions and roles implemented

The route remains protected by the application's authenticated `ProtectedRoute`. AJIO configuration preserves the earlier documented mandatory LPN controls and revoked Un-Packing access. The guide names client/AJIO Account Manager approval for enabling E-Invoicing but supplies no application role IDs, permission matrix, or authorization endpoint, so no undocumented role was invented. Master SKU permissions and behavior were not changed.

## 7. Test cases executed

- `npm run typecheck`: passed.
- `npm run build`: passed (1,822 modules transformed). Existing warnings remain for Node 20.14 versus Vite's preferred 20.19+ and a main bundle above 500 kB.
- Targeted ESLint over AJIO UI/API/seed/routing/menu and both API tests: passed.
- Repository-wide `npm run lint`: 243 errors and 4 warnings remain in unrelated pre-existing files; no AJIO-targeted lint error remains.
- AJIO JIT API suite: 21 checks passed, including Manage Channels synchronization, no secret persistence, all conditional configuration failures, exact mappings, once-daily reconciliation, Order Sync dependency blocking, prefetch and ReadyToShip-at-Pack.
- AJIO full lifecycle regression: 25 checks passed from credentials through Shipped, including eight negative paths.
- AJIO JIT browser suite: passed Manage Channels entry, marketplace choices, AJIO row/direct JIT navigation, full field groups, credential modal, mapping/reconciliation and prefetch controls.
- Seven-stage AJIO browser regression: passed Channel Maintenance, Product & Inventory, Backorder Pull, PO & Order Creation, Manage Picking, Order Packing and Order Shipment.
- Visual comparison performed at 2560×1440 for Channel Maintenance, Configure Interface, channel mapping, Manage Picking, Order Packing and Order Shipment captures.

## 8. Remaining mismatches or uncertainties

- No AJIO JIT videos were provided, so exact click timing, hover/focus behavior, animations, network latency, transient notifications and video-specific responsive states remain unverified.
- The supplied guide does not expose AJIO's real API schemas, authentication protocol, retry/time-out rules, webhook signatures or failure payloads. External AJIO calls are represented by deterministic local endpoints and persistence.
- Return inbound screens and fields, the actual AJIO-produced invoice payload, proprietary `ShippingLabel_AJIO` BIRT geometry, and remote manifest/3PL acknowledgement cannot be verified without additional evidence or access.
- Non-JIT AJIO tiles use the existing generic Add Channel form because the guide documents their names, not their maintenance fields or workflows.
- The guide does not specify a distinct application permission matrix for AJIO JIT or a machine-checkable E-Invoicing approval record.
- Pixel matching is limited to documented screenshots; no video frames or responsive breakpoints were supplied.

## 9. Exact files/components changed

- `api/ajio.js` — JIT configuration validation, secret handling, exact mapping, inventory reconciliation, PrePack prefetch, sync dependencies and shared-channel synchronization.
- `api/seed.js` — AJIO JIT Channel Maintenance defaults, interface flags, mapping identifiers and inventory settings.
- `server.js` — dedicated `/api/ajio` registration.
- `src/eretail/modules/AJIOWorkflow.tsx` — Channel Maintenance accordions/modal plus the complete fulfillment workflow UI.
- `src/eretail/ManageChannels.tsx` — AJIO row navigation and documented Add New marketplace selector.
- `src/App.tsx` — protected AJIO route.
- `src/eretail/menuData.ts` — WMS AJIO workflow navigation.
- `scripts/verify-ajio-jit-api.mjs` — repeatable 21-check JIT integration suite.
- `scripts/verify-ajio-jit-browser.py` — repeatable JIT navigation/configuration browser suite.
- `scripts/verify-ajio-api.mjs` — repeatable 25-check fulfillment lifecycle regression.
- `scripts/verify-ajio-browser.py` — updated seven-stage browser regression for Channel Maintenance.
- `docs/AJIO_REPLICATION_EVIDENCE.md` — earlier AJIO process evidence.
- `docs/AJIO_JIT_INTEGRATION_EVIDENCE.md` — this JIT evidence and discrepancy report.

Master SKU, Tally, ARS, and unrelated generic modules were not modified.
