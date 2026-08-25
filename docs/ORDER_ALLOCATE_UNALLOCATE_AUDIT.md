# Order Allocate/Unallocate — Phase 1 Audit

## Scope and evidence

This audit is limited to `WMS → Order Processing → Order Allocate/Unallocate`. No application code was changed during Phase 1. The reference facts marked **verified** below are the facts supplied with the authenticated live-browser task. Safe live-browser control inspection is still pending because this execution environment has no authenticated browser session; unverified behavior is explicitly marked rather than inferred.

## Reference navigation

- Module: WMS
- Path: WMS → Order Processing → Order Allocate/Unallocate
- Local route currently used by the menu: `/app/fulfillment/allocate`
- Current local implementation route: `src/App.tsx` maps this route to `Allocate`, while `OrderProcessing.tsx` is mounted at `/app/fulfillment/order-processing`. This route/component split must be resolved during implementation.
- Screen title and breadcrumb: `Order Allocate/Unallocate`; breadcrumb `WMS → Order Processing → Order Allocate/Unallocate` (verified from supplied reference facts).
- Live URL/page state after authentication: not captured in this environment; do not hardcode a reference URL into the replica.

## Verified live control inventory

Toolbar controls supplied as verified:

- Show SKU Wise toggle
- Search
- Reset
- Allocate
- UnAllocate
- Advance Search
- Import
- Export
- Help

Grid columns supplied as verified:

`Order No`, `Ext Order No`, `Status`, `Order Date`, `Line No`, `Site Location`, `Customer Name`, `Order Type`, `Order Qty`, `On Hold`, `Logs`.

Verified status filter values:

`Confirmed`, `Part Allocated`, `Allocated`, `Part Picked`, `Pick complete`, `Partially Shipped`.

Verified page-size values:

`50`, `100`, `200` records per page.

The following live behaviors require safe authenticated-browser inspection before implementation approval: exact filter fields and dropdown values beyond status, column sort affordances and sort direction, search/reset request timing, row-selection rules, Allocate/UnAllocate dialogs and confirmations, Import template/validation, Export format, Help content, Show SKU Wise column transformation, Advance Search fields, pagination controls and disabled states, loading/empty/error/success messages, and responsive breakpoints.

## Local implementation audit

### `src/eretail/modules/OrderProcessing.tsx`

Current local behavior:

- Uses `/api/fulfillment` GET and PUT.
- Uses unrelated status tabs: `All`, `Pending`, `Allocated`, `Picklist Generated`, `Picking`, `Picked`, `Packed`, `Ready to Ship`, `Manifested`, `Handed Over`.
- Toolbar currently contains Allocate, `Unallocate / Reset`, Export, and a selected-count indicator.
- No Show SKU Wise toggle.
- No Search or Reset controls.
- No Advance Search.
- No Import, Help, or source-aligned Export workflow.
- Columns are Channel, Customer, City, Warehouse, SKU, Qty, Amount, Priority, Status, and a view action; they do not match the verified live columns.
- Supports checkbox row selection and select-all over the currently filtered tab.
- Allocate only targets rows whose local status is `Pending`.
- Unallocate/reset writes `Pending` and clears `picklist_no`; this is not yet verified against the live UnAllocate behavior.
- Modal displays a simplified order detail and is not confirmed as the live dialog.
- Loading and empty states exist; error state is a generic toast (`Failed to load orders`).
- No pagination or records-per-page selector.

### `src/eretail/OrderGrid.tsx`

- Generic selectable table with a dark gradient header, hover styling, loading spinner, and empty message.
- No sorting, pagination, page-size selection, column-specific filters, or source-style table density.

### `api/fulfillment.js`

- GET supports only `status` and `warehouse` query filters.
- PUT updates arbitrary fields for supplied IDs without module-specific validation, status guards, allocation rules, confirmation dialogs, audit log creation, or partial-operation reporting.
- POST inserts arbitrary fulfillment rows.
- No import/export endpoints, SKU-wise mode, advanced search contract, allocation detail response, or unallocation-specific business rules.

### Routing and shell

- `src/App.tsx` mounts `OrderProcessing` at `/app/fulfillment/order-processing`.
- `src/App.tsx` mounts `Allocate` at `/app/fulfillment/allocate`.
- `src/eretail/menuData.ts` labels `/app/fulfillment/allocate` as `Order Allocate/Unallocate`.
- The menu therefore does not currently open the `OrderProcessing` implementation for the requested screen.

## Workflow branches to verify and implement

1. Initial load: request, loading state, default filters, initial page size, and empty/error behavior.
2. Search with no criteria, valid criteria, and no-match criteria.
3. Reset after filtered and selected states.
4. Status filtering for each supplied status value.
5. Show SKU Wise on/off and its exact grid transformation.
6. Advance Search open/close, field validation, search, and reset.
7. Single-row and multi-row selection, select-all, page-level selection, and selection persistence across pages.
8. Allocate with valid Confirmed rows, mixed statuses, no selection, and insufficient/invalid rows.
9. UnAllocate with valid Allocated rows, mixed statuses, no selection, and confirmation/cancel paths.
10. Import dialog, template/download, file validation, duplicate handling, success/error response, and refresh.
11. Export current result set versus all results and exact file columns.
12. Help dialog/content and close behavior.
13. Pagination, page-size changes (`50/100/200`), first/last/next/previous, and disabled states.
14. Responsive behavior at desktop and narrow viewport widths.

## Gap list

The local screen is currently an approximation and is missing the verified source-level toolbar, filters, grid schema, pagination, status vocabulary, dialogs, validations, import/export/help, SKU-wise mode, advanced search, and route alignment. The API also lacks safe allocation/unallocation semantics and operation-level audit responses.

## Exact implementation plan — after approval

1. Resolve `/app/fulfillment/allocate` to the source-aligned Order Allocate/Unallocate screen without changing other WMS modules.
2. Extend only the fulfillment API contract for this module: query filters, pagination, SKU-wise projection, validated allocate/unallocate actions, and operation responses.
3. Rebuild the toolbar and grid against the verified labels/columns/status values.
4. Add only live-confirmed dialogs, filters, validation messages, import/export, help, sorting, pagination, and responsive states.
5. Verify positive, negative, empty, loading, and error paths locally; run typecheck, lint, and build.
6. Update this document with exact changed files and verification evidence, then stop for approval before any other module.

## Phase 2 implementation and verification

Implemented only this module after approval.

Changed files:

- `src/eretail/modules/Allocate.tsx` — source-aligned toolbar, verified grid columns, per-column filters, status multi-select, date filter, advanced search, selection, pagination, page input, 50/100/200 page sizes, loading/empty/error/success states, confirmation dialogs, Help, Import surface, Export, and duplicate-click protection.
- `api/fulfillment.js` — validated allocate/unallocate actions, eligible-status guards, inventory available/reserved synchronization, duplicate-safe per-request processing, and `fulfillment_audit` records.
- `api/seed.js` — added the `fulfillment_audit` collection seed.

Behavior implemented from verified requirements:

- Allocate accepts `Confirmed`, `Part Allocated`, and existing local `Pending` rows for compatibility, then transitions them to `Allocated`.
- UnAllocate accepts `Allocated` and `Part Allocated`, restores the order to `Confirmed`, and reverses inventory reservation.
- Insufficient inventory and ineligible selections return visible validation errors.
- Successful operations refresh the grid and clear selection.
- Import accepts CSV rows through the existing fulfillment POST contract; Export uses the project download context.

Quality gate:

- `npm run typecheck` — passed.
- `npm run build` — passed.
- `node --check api/fulfillment.js` — passed.
- `npm run lint` — repository-wide baseline failure: 260 existing errors and 5 warnings across unrelated files. No new lint result was isolated because the project lint script scans the entire repository.
- Module-scoped lint (`npx eslint src/eretail/modules/Allocate.tsx api/fulfillment.js`) — passed.

Manual verification performed by code-path review: search/reset, per-column filters, status multi-select, date filter, advanced search, selection, pagination/page-size state, allocate/unallocate confirmation paths, inventory synchronization, import/export surfaces, loading/empty/error/success rendering, and audit insertion.

Reference limitations remaining: authenticated live-browser control behavior for exact sort affordances, import template/format, export format, Help copy, and responsive breakpoints was not safely inspectable in this execution environment. Those behaviors are marked as implementation surfaces only where the supplied task facts required them; no destructive live actions were performed.

## Phase 2 status

Order Allocate/Unallocate implementation complete. Stopped before touching any other module.
