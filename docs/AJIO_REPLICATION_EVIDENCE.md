# AJIO Process Workflow Replication Evidence

Authoritative source inspected: `AJIO PROCESS WORKFLOW – Vinculum Product Guide.pdf` (6 pages). Every page was text-extracted and visually reviewed before implementation. No AJIO workflow videos were supplied with this request, so no behavior is described as video-verified.

The later AJIO JIT Channel Maintenance evidence and verification results are recorded in `docs/AJIO_JIT_INTEGRATION_EVIDENCE.md`.

## 1. Modules replicated

| Stage | UI surface | Persistent data |
|---|---|---|
| Seller registration/API credentials | Seller ID, password-configured state, invoice series, Pull/Moderate configuration and mandatory pick/pack controls | `ajio_config` |
| Product and inventory | AJIO article-to-SKU mapping and mapped inventory synchronization | `ajio_sku_mappings`, shared `skus`, `inventory` |
| Backorder inventory pull | order pendency enquiry, pull and inventory reservation | `ajio_backorders`, shared `inventory` |
| PO release/order creation | reserved AJIO PO to sales-order conversion and allocation | `ajio_orders`, shared `sale_orders`, `fulfillment_orders` |
| Picklist/manage picking | multi-PO picklist, one initial delivery per PO, LPN/Box scanning, pending quantities, box closure and Delivery Split | shared `picklists`, `ajio_deliveries` |
| Order packing | invoice response, child/master AWBs and `ShippingLabel_AJIO` export | `ajio_invoices`, `ajio_deliveries` |
| Order shipment | complete-shipment selection, Request Manifest, consolidated manifest download and handover | `ajio_manifests`, `ajio_deliveries` |

All stages are available at `/app/fulfillment/ajio` under WMS > Order Processing.

## 2. Workflows replicated

1. Configure AJIO JIT with an alphanumeric Seller ID beginning `DV`, mark API-password availability without retaining the raw secret, and maintain matching B2B invoice series.
2. Preserve `SKU Sync = Pull` and `SKU Create = Moderate`; map un-mapped AJIO articles and publish available inventory for mapped SKUs.
3. Pull AJIO order pendency, require mapped SKUs and positive inventory, and move quantity from available to reserved inventory once.
4. Convert a reserved AJIO PO into one AJIO sales order, shared sales-order header, shared fulfillment lines and Allocated status.
5. Generate one picklist for multiple AJIO POs while creating one initial delivery per PO.
6. Scan a Box ID/LPN before items, reject cross-shipment LPN reuse, scan quantities, show pending quantities, close and lock boxes, and move all unpicked quantities to a new delivery through Delivery Split.
7. Require fully picked quantities and closed boxes before Order Pack; create an AJIO JIT invoice, one child AWB per box and use the first child AWB as master.
8. Block unpacking/closed-box mutation and block cancellation after invoice generation.
9. Request one consolidated manifest for selected fully packed deliveries, block partial shipments, download the document and hand it over; deliveries become Shipped.

## 3. Documentation-to-video discrepancy matrix

| Topic | Documentation | Video evidence | Implementation decision |
|---|---|---|---|
| Workflow videos | Request refers to three videos | No AJIO videos supplied | Guide is the only authority; no video-fidelity claim |
| Delivery cardinality | Says exactly one package/shipment/delivery per PO | Later requires Delivery Split to move pending quantities into another delivery | One initial delivery per PO; the explicit Delivery Split creates a traceable `-S2` delivery for the same PO |
| Credentials | Requires Seller ID and Password for API calls | None | Seller ID and password-configured state persist; raw passwords never persist or return |
| Invoice source | AJIO JIT invoice comes from AJIO | No external AJIO API/credentials supplied | Local API emulates the AJIO response and preserves configured invoice series; external call remains unverified |
| Product creation | Article Creation Template is on AJIO VMS | None | No local article-creation form invented; only pull/mapping state is represented |
| Reconciliation | Must be done by Account Manager/Support | None | No self-service reconciliation action provided |
| Picklist actions | Screenshot shows Short Pick, Pick All, Print Packing Slip, Delivery Split | Only Delivery Split behavior is explained | Pick All, packing-slip export and Delivery Split implemented; Short Pick omitted because its AJIO rule is undocumented |
| Shipping label | Client-specific BIRT report `ShippingLabel_AJIO` | Only report name supplied | Evidence-aligned structured label export implemented; exact BIRT pagination/print format remains external |
| Automatic timing | Backorder pull every 15–30 minutes and PO normally within 24 hours | None | Manual deterministic controls implemented; always-on marketplace scheduler not invented without an API contract |

## 4. APIs, database, and data mappings

`GET /api/ajio?entity={config|mappings|backorders|orders|deliveries|invoices|manifests}` returns each persisted stage.

`PUT /api/ajio` handles `save-config` and `map-sku`. `POST /api/ajio` handles `inventory-sync`, `pull-backorders`, `release-po`, `generate-picklist`, `scan`, `close-box`, `delivery-split`, `pack`, `cancel`, `request-manifest`, and `handover`.

Key downstream mappings:

- AJIO article → Vin SKU → inventory availability.
- AJIO order pendency → inventory reservation.
- AJIO PO → `ajio_orders` → shared `sale_orders` and line-level `fulfillment_orders`.
- Multiple AJIO orders → shared picklist → one initial `ajio_deliveries` record per PO.
- Delivery → LPN boxes → invoice → child AWBs/master AWB.
- Fully packed deliveries → consolidated AJIO manifest → shipped state.

The existing persistence layer uses MongoDB when configured and the seeded in-memory store otherwise.

## 5. Validations and business rules implemented

- Seller ID must be alphanumeric, begin `DV`, and cannot be an email address.
- B2B Invoice Series is required; raw passwords are excluded from stored payloads.
- `Scan LPN on Picking` and `LPN reuse after ship` must remain on; Un-Packing access must remain off.
- Unmapped articles and insufficient inventory block reservation/picklist processing.
- Pendencies cannot reserve twice and POs cannot release twice.
- Only Allocated orders can generate a picklist; each normal PO receives its own delivery.
- Box ID, SKU and positive whole quantity are required; over-scans, wrong-SKU scans and cross-shipment Box IDs are rejected.
- Closed boxes cannot change. Delivery Split is available only after partial picking and moves every remaining quantity.
- Packing requires every assigned quantity picked and every box closed.
- First child AWB is master; invoice number uses the configured B2B series.
- Cancellation is rejected after packing/invoice generation.
- Request Manifest accepts only fully packed/invoiced deliveries; partial shipment selection is rejected.

## 6. Permissions and roles implemented

The route uses the application's existing authenticated `ProtectedRoute`. AJIO users cannot enable Un-Packing through this workflow, matching the guide's revoked-access requirement. No additional role names or permission matrix were supplied, so no undocumented roles were invented.

## 7. Test cases executed

- `npm run typecheck`: passed.
- `npm run build`: passed; Vite reports the existing Node 20.14 versus preferred 20.19 warning and a bundle-size warning.
- Targeted ESLint for every AJIO/API/routing file: passed.
- Repository-wide lint: fails on 243 errors and 4 warnings in pre-existing unrelated files; AJIO-targeted lint is clean.
- API verification: 25 assertions passed from credentials through Shipped status.
- Negative API cases passed: email Seller ID, mandatory LPN settings off, repeated pendency pull, repeated PO release, cross-shipment LPN, closed-box mutation, post-pack cancellation and partial manifest.
- Data synchronization verified: inventory reservation, shared sales order, shared fulfillment lines, shared picklist, deliveries, split delivery, invoice, two child AWBs/master AWB, manifest and Shipped status.
- Browser verification at 2560×1440: all seven stages and documented controls passed.
- Visual screenshots inspected: `/tmp/ajio-browser-configuration.png`, `/tmp/ajio-browser-manage-picking.png`, `/tmp/ajio-browser-order-packing.png`, `/tmp/ajio-browser-order-shipment.png`.

## 8. Remaining mismatches or uncertainties

- No AJIO videos were supplied; video-only sequences, messages, latency, hover/focus behavior and precise responsive behavior are unverified.
- Actual AJIO VMS/API calls, periodic scheduling, remote article template, AJIO-produced invoice payload, marketplace label refetch and 3PL handover cannot be verified without external credentials/contracts.
- `ShippingLabel_AJIO` output uses the replica's structured download system, not the proprietary/client-specific BIRT deployment or its multi-page print geometry.
- The guide supplies only screenshots for Pick Pack Configuration, Manage Picking and Delivery Shipping. Other stage layouts are evidence-supported integrations, not claimed screenshot replicas.
- Exact Short Pick behavior, permission matrix, error wording, timeouts/retries and marketplace failure payloads are undocumented.

## 9. Exact files/components changed

- `api/ajio.js` — dedicated AJIO state machine and downstream integration.
- `api/seed.js` — AJIO configuration, mapping, pendency, order, delivery, invoice and manifest collections.
- `server.js` — `/api/ajio` registration.
- `src/eretail/modules/AJIOWorkflow.tsx` — seven-stage AJIO UI.
- `src/App.tsx` — protected AJIO route.
- `src/eretail/menuData.ts` — WMS > Order Processing menu entry.
- `scripts/verify-ajio-api.mjs` — repeatable 25-case API lifecycle test.
- `scripts/verify-ajio-browser.py` — repeatable seven-stage browser verification.
- `docs/AJIO_REPLICATION_EVIDENCE.md` — this report.

Master SKU, Tally, ARS and existing generic fulfillment modules were not modified.
