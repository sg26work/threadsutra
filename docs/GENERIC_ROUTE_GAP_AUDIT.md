# Generic route and API gap audit

Audit date: 2026-08-26

This inventory is a local-code audit, not proof of LIVE behavior. Every item
below remains unverified until its authenticated LIVE module is recursively
inspected and the resulting UI, workflow, API, validation, state, and
persistence contract is implemented and second-compared.

## Corrected dedicated-route bypasses

The following menu items had dedicated components and routes but still pointed
to an older or generic route. Their navigation now targets the dedicated route:

- Manage Inbound Gate Pass
- Inbound Enquiry
- Inbound RealTime
- Inbound QC
- Inventory Move History
- Inventory Move
- Inventory Move By Scan
- Cycle Count
- BIN Audit
- Bulk update Lottables
- Location Create/Edit
- PutAway Enquiry
- Dispatch Checkpoint Enquiry
- Sku Grading
- Discrepancy Enquiry
- Bulk Upload
- MP Inventory Log
- LPN Enquiry
- Transhipment Old
- Transhipment
- QC Params Mapping

`npm run test:wms-dedicated-menu-routing` clicks each flyout item in a real
browser and asserts its final path. The dedicated workflow verifiers for all ten
WMS modules also pass independently.

## Menu items still resolved by `GenericRoute`

These are confirmed local implementation gaps. No claim is made that their
generic CRUD behavior matches LIVE:

### Master

- Manage Voucher Condition (`/app/m/voucher-condition`)
- Sales Representative (`/app/m/sales-rep`)

### Admin logs

- User Audit Logs (`/app/m/user-audit-logs`)
- Accounting Log (`/app/m/accounting-log`)
- Tax Integration Log (`/app/m/tax-integration-log`)
- Device Tracking Log (`/app/m/device-tracking-log`)
- External Apps Logs (`/app/m/external-apps-logs`)
- POS Integration Log (`/app/m/pos-integration-log`)
- Repush Log (`/app/m/repush-log`)

## Dedicated-looking screens still backed by `/api/generic`

These screens require contract-level LIVE reinspection even though they do not
render `GenericModule` directly:

- SKU Import workflow in `src/pages/Skus.tsx`
- Generate Vouchers
- Attribute Set
- Vendor SKU Catalog
- Vendor SKU Location Catalog
- Other Masters
- Promotion Enquiry / Promotion Management

## Gate

Do not remove a generic implementation by guessing. For each item, first obtain
authenticated LIVE evidence for all reachable controls and nested workflows,
then replace the fallback with a dedicated component/API and run browser,
Playwright, typecheck, build, console/API/Vite, persistence, and second-LIVE
comparison gates.
