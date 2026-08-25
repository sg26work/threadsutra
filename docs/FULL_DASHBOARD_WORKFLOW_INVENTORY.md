# Full Dashboard Workflow Inventory

Status: discovery baseline (2026-08-14)

## Scope and source limitations

This inventory covers every dashboard menu item declared in `src/eretail/menuData.ts` and its local route/component mapping. The live demo is not currently exposed through a browser-control connector in this session, so reference-only behaviors (exact dialogs, server messages, permissions, and responsive breakpoints) remain **to be verified** from an authenticated live session or supplied recordings. No credentials are stored or inspected.

## Protected Master SKU scope

The following are explicitly out of scope for edits in this pass:

- `src/pages/Skus.tsx`
- `/app/skus` route in `src/App.tsx`
- SKU Master menu entries in `src/eretail/menuData.ts` (including Sales links that intentionally target `/app/skus`)
- Existing SKU APIs and data contracts, unless a separate workflow demonstrably requires a non-breaking read-only integration

The Master SKU screen is a dependency for ARS, purchase orders, transfers, and SKU-related workflows; those consumers must use its existing contract rather than alter it.

## Menu inventory

The local dashboard declares **141 menu entries** across the Master, Procurement, Sales, WMS, Returns & Transfers, Admin, and Reports rails, plus a separate Dashboard destination. The counts include intentional duplicate labels/links present in the source menu (for example WMS Setup has two `Zone` entries and Sales contains several SKU Master links).

Route classification from the source is **86 direct/dedicated destinations** and **55 generic destinations**. This is a route count, not a claim that every direct destination has been reference-verified.

## Local implementation classes

### Dedicated workflow components

Dedicated routes currently exist for dashboard/control tower, masters, procurement, sales/order enquiry, WMS fulfillment, inventory view/operations, returns/transfers, admin, and reports. The complete mapping is in `src/App.tsx`; representative workflow components include:

- WMS fulfillment: `src/eretail/modules/{Allocate,DeliveryShipping,BulkUpdate,ManagePicklist,ManagePicking,DeliverySplit,ShipmentHandover,AJIOWorkflow,AmazonMFNWorkflow}.tsx`
- Procurement: `src/eretail/procurement/*.tsx`, `src/pages/PurchaseOrders.tsx`
- Inventory: `src/pages/Inventory.tsx`, `src/pages/InventoryOperations.tsx`
- Masters: `src/pages/{Vendors,Customers,Transporters,Clients,Skus}.tsx` and `src/eretail/masters/*.tsx`
- Reports: `src/eretail/ReportRoute.tsx` and `src/eretail/ReportScreen.tsx`

### Generic workflow components

55 menu entries resolve through `/app/m/:key` → `GenericRoute` → `GenericModule`. These screens provide schema-driven list/search/status filtering, add/edit/delete, export, and refresh behavior, but are not evidence of reference-level fidelity for every module. Their fields and downstream notes come from `src/eretail/masterSchemas.ts` and require module-by-module source verification before claiming exact replication.

Generic workflow gaps to verify per module:

- Reference-specific toolbar and action ordering
- Exact field labels, defaults, option sets, required/conditional validation
- Table columns, sorting, pagination, row/bulk actions
- Import/export file format and error reporting
- Confirmation dialogs, status transitions, notifications, and audit effects
- Role/permission behavior and mobile layout

## Current local gap classification

1. **Verified/implemented dedicated workflows:** Order Allocate/Unallocate and its backend persistence/audit path; inventory operation screens and API surfaces; procurement OTB enforcement and ARS flows (subject to the evidence recorded in their existing audit documents).
2. **Implemented but evidence-limited:** most dedicated master, procurement, returns, admin, report, and fulfillment screens. Their local behavior should not be treated as exact until inspected against the live route or documentation.
3. **Generic approximations:** the 55 `/app/m/:key` routes above. These need a sequential evidence audit and replacement only where the reference requires behavior beyond `GenericModule`.
4. **Cross-module dependency risk:** SKU Master is protected. Any workflow that selects SKUs must consume `/api/skus` and must not alter SKU Master UI, route, schema, or persistence.

## Staged implementation plan

1. Inspect each rail and route read-only, recording page title, breadcrumb, controls, table/filter behavior, dialogs, validations, permissions, loading/error/success states, and dependencies.
2. Prioritize high-dependency workflows in this order: WMS fulfillment/inventory, procurement/PO/ARS/OTB, returns/transfers, sales/order enquiry, masters other than SKU Master, admin, then reports.
3. Work one module at a time. Before editing a module, add its evidence checklist to this document; after editing, record changed files and test evidence.
4. Run typecheck/build after each implementation batch. Treat lint, visual comparison, and end-to-end workflow checks as separate acceptance gates.
5. Recheck earlier modules after cross-module API/data changes. Do not begin the next module until the current module's checklist is verified.

## Next module queue

The next unverified module should be selected from the WMS rail, excluding the already audited Order Allocate/Unallocate and preserving the protected Master SKU scope. Live-only facts will be marked as pending until a usable authenticated browser session or recording is available.
