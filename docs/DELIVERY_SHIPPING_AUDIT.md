# Delivery Shipping — Phase 1 Audit

## Scope and evidence

Module: `WMS → Order Processing → Delivery Shipping`.

This is a discovery-only audit. No application code was changed. The supplied task requires the authenticated Live Browser to be the source of truth, but live browser control is not available through the current coding session. Accordingly, reference-only controls, messages, exact field options, and responsive behavior are marked **pending live inspection** rather than guessed.

## Order Allocate/Unallocate prerequisite

`docs/ORDER_ALLOCATE_UNALLOCATE_AUDIT.md` records Order Allocate/Unallocate as implemented after approval. Its documented quality gate passed `npm run typecheck`, `npm run build`, `node --check api/fulfillment.js`, and module-scoped ESLint. Repository-wide lint retains unrelated baseline failures. Live-only sort/import/export/help/responsive behavior remains explicitly pending there, so “fully implemented” means the approved local implementation is complete while reference verification is still limited.

## Navigation and local route

- Reference path: WMS → Order Processing → Delivery Shipping
- Local menu route: `/app/fulfillment/delivery-shipping`
- Local component: `src/eretail/modules/DeliveryShipping.tsx`
- Local API: `/api/fulfillment` in `api/fulfillment.js`
- Local shell breadcrumb: `WMS > Delivery Shipping`

Exact reference URL/page state after authentication: pending live inspection.

## Live control inventory — pending verification

Inspect safely, without submitting or changing data:

- Page title, breadcrumb, open-screen tab, and header toolbar
- Eligible-delivery search entry point and all basic/advanced filters
- Ecommerce platform/channel, order, customer, location/site, date, status, and hold filters if present
- Grid columns, per-column filters, sort icons/directions, row details, and log links
- Select-all, row selection, selection persistence, and bulk action enablement
- Courier/carrier lookup and shipping-method choices
- AWB/tracking fields, package count, weight, dimensions, invoice/shipping-label controls
- Shipping/confirm/partial-shipping actions
- Import, Export, Help, refresh, reset, and any print/download actions
- Dialogs, drawers, confirmation prompts, disabled states, tooltips, and keyboard behavior
- Pagination, page input, records-per-page choices, and first/previous/next/last states

No destructive actions, submit actions, uploads, imports, or data-changing confirmations should be performed in the reference system.

## Workflow branches to trace

1. Initial load: default eligible status set, loading indicator, default date/platform filters, empty state, and initial page size.
2. Search: no criteria, valid criteria, no matches, reset, and refresh.
3. Filter combinations: ecommerce platform/channel, order/customer/location, status, date range, hold, courier, and shipping method where available.
4. Sorting and pagination: every supported column, direction, page-size choices, page input, selection across pages, and disabled controls.
5. Delivery detail: open a row, inspect package/line details, invoice and label surfaces, and close behavior.
6. Courier/shipping method: lookup, option values, required fields, validation, and cancel path.
7. AWB/tracking: manual versus generated entry, format/duplicate validation, package count, weight, dimensions, and disabled/read-only states.
8. Full shipping: eligible selection → confirmation → loading → success → status transition → refresh.
9. Partial shipping: line/package selection, quantity limits, confirmation, resulting split/status behavior, and downstream effects.
10. Failed shipping/retry: server validation, carrier failure, timeout/error message, retry enablement, and idempotency.
11. Bulk shipping: mixed eligible/ineligible selections, partial success reporting, and selection clearing.
12. Import/export/help: inspect surfaces only; record template, file constraints, column order, validation response, download format, and help content without executing data changes.
13. Responsive layout: desktop, tablet, and mobile arrangement of filters, grid, dialogs, and action controls.

## Local implementation inventory

`DeliveryShipping.tsx` currently:

- Loads all `/api/fulfillment` rows and filters locally to `Packed` or `Ready to Ship`.
- Loads active transporters from `/api/transporters` and selects the first courier by default.
- Supports row selection and select-all over the filtered rows.
- Provides `Assign Courier & Generate Label`, `Print Labels`, and `Refresh` toolbar buttons.
- Opens an `Assign Courier` modal with a courier dropdown and confirmation/cancel controls.
- Generates a random AWB client-side and PUTs each selected row to status `Ready to Ship`.
- Shows a success toast and refreshes after the loop completes.
- Renders columns: Order No, Customer, City, Warehouse, Qty, Amount, Courier, AWB, Status.
- Has loading/empty/error-to-toast states.

`OrderGrid.tsx` provides a selectable table and loading/empty states, but no sorting, pagination, page-size selector, column filters, detail drawer, or error row.

`api/fulfillment.js` currently supports GET status/warehouse filters, generic PUT updates, allocate/unallocate action semantics, and generic POST insertion. It has no delivery-specific validation, carrier contract, AWB uniqueness/format checks, package/dimension persistence, partial-shipping transaction, retry/idempotency response, label/invoice generation, or delivery audit record.

## Local-code gap analysis

- Reference toolbar and filter inventory is unknown; current toolbar is only three controls.
- Current eligible statuses are guessed from local data (`Packed`, `Ready to Ship`) and require live confirmation.
- No search, advanced search, ecommerce-platform filter, date/status/customer/location filters, sorting, or pagination.
- Current columns do not include the reference-required delivery/package fields unless live inspection confirms they are absent.
- Courier selection defaults silently and AWBs are randomly generated; this must not be treated as reference behavior.
- No AWB/tracking input or validation, shipping method, package count, weight, dimensions, invoice, or label workflow.
- No partial shipping, failed-shipping retry, mixed bulk result, or operation-level audit behavior.
- Print Labels currently emits a toast rather than a verified document/print workflow.
- Error handling is generic and does not distinguish validation, carrier, timeout, or persistence failures.
- No responsive-specific behavior has been verified.

## Exact implementation plan — after approval

1. Reinspect the live Delivery Shipping screen read-only and replace every pending item above with observed labels, fields, statuses, messages, and control behavior.
2. Extend only the delivery-specific fulfillment API/data contract: query/filter/pagination, validated shipping actions, package/tracking persistence, idempotency, downstream status updates, and audit records.
3. Update only `DeliveryShipping.tsx` and directly required delivery components/styles; preserve Master SKU and unrelated modules.
4. Add verified search, filters, sorting, pagination, selection, dialogs, shipping/partial/retry branches, import/export/help, and responsive states.
5. Test positive, negative, empty, loading, error, duplicate-click, mixed-selection, and refresh/persistence paths locally.
6. Run `npm run typecheck`, `npm run lint`, `npm run build`, and module-scoped checks; record baseline lint failures separately.
7. Update this audit with changed files, test evidence, live discrepancies, and remaining uncertainties. Stop before another module.

## Phase 2 status

Implemented only this module after approval.

### Changed files

- `src/eretail/modules/DeliveryShipping.tsx` — rebuilt the local delivery-shipping screen around the verified local delivery path: eligible Packed-order search/reset, selection, active Courier Partner selection, confirmation, loading/disabled states, success/error feedback, refresh, and printable generated-label surface.
- `api/fulfillment.js` — added the `generate-shipping-label` action. It validates selection, active courier availability, and Packed status; generates a unique AWB server-side; persists courier/AWB/label status; moves the order to `Ready to Ship`; and writes a delivery shipping audit record.
- `api/seed.js` — added the `delivery_shipping_audit` collection for in-memory and MongoDB seeding.

### Implemented behavior

- Only Packed orders are eligible in the local Delivery Shipping grid.
- Search covers order number, customer, ecommerce platform, city, warehouse, courier, and AWB; Reset clears local search/selection/modal state.
- Selection and page-level select-all are functional for the displayed eligible rows.
- Generate Label requires at least one selected row and an active Courier Partner. The confirmation action is disabled while the request runs, preventing duplicate clicks.
- The backend rejects missing courier values, inactive/nonexistent carriers, stale/missing rows, and rows not in Packed status.
- A successful request persists the courier, unique server-generated AWB, label status/timestamp, status transition to `Ready to Ship`, and an audit event; the UI clears selection and reloads.
- Print Labels opens a document only for orders with generated AWBs; it reports an actionable error otherwise.

### Test results

- `node --check api/fulfillment.js` — passed.
- `npm run typecheck` — passed.
- Module-scoped lint: `npx eslint src/eretail/modules/DeliveryShipping.tsx api/fulfillment.js` — passed.
- `npm run build` — passed. Vite reported the existing Node recommendation (20.19+), but completed under 20.14.0.
- `npm run lint` — repository-wide baseline failure: 248 errors and 5 warnings in unrelated existing files. The Delivery Shipping file/API have no scoped lint errors.
- Isolated local API test on port 3002 — passed: missing courier returned 400; valid packed order generated AWB and transitioned to Ready to Ship; repeat action on the resulting Ready to Ship order returned 409.
- UI code-path review — passed for initial load, no-result state, search/reset, select/select-all, no-selection and no-label validation, confirm/cancel, busy state, success reload, and printable label content.

### Live-reference behavior not implemented

The following were not safely verified in an authenticated Live Browser and were deliberately not invented: source-specific advanced filters, per-column sorting, pagination/page-size selection, shipping-method options, manual tracking/AWB entry, package count/weight/dimensions, invoice actions, partial shipping, carrier-failure retry UI, Import/Export/Help, and exact responsive breakpoints. These remain open reference-discovery items rather than claims of parity.

### Phase 2 status

Delivery Shipping implementation complete within the evidence available. No other module was changed.
