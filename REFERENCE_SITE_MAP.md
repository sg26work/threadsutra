# Reference Site Map

Status: discovery baseline — local route/menu map captured 2026-08-14.

This file is the working source of truth for sequential reference inspection. The canonical dashboard menu is `src/eretail/menuData.ts`; this map records its local route coverage and marks reference-only observations as pending until an authenticated browser page can be inspected through a supported connector. No credentials, cookies, or session tokens are recorded.

## Discovery status

- [x] Existing project architecture and route map audited
- [x] Primary rails and nested menu groups captured
- [x] Master SKU protected from changes
- [ ] Every live reference page inspected
- [ ] Every live table/form/modal/filter state inspected
- [ ] Desktop/tablet/mobile comparison completed
- [ ] Page-by-page local comparison completed

## Primary navigation

Dashboard (`/app/dashboard`), Master, Procurement, Sales, WMS, Returns & Transfers, Admin, and Reports are represented by the `RAIL` entries in `src/eretail/menuData.ts`. The separate Control Tower (`/app/control-tower`), Downloads (`/app/downloads`), and Vin Lister (`/app/vin-lister`) routes are also present locally.

## Route inventory

### Master

Dedicated: `/app/vendors`, `/app/customers`, `/app/transporters`, `/app/clients`, `/app/customer-groups`, `/app/promotions`, `/app/coupons`, `/app/tax-categories`, `/app/tax-code`, `/app/tax-groups`, `/app/tax-zones`, `/app/tax-application`, `/app/skus`, `/app/sku-enquiry`, `/app/sku-import`, `/app/sku-barcode`, `/app/tally-configuration`, `/app/pricing-events`.

Generic: `/app/m/voucher-condition`, `/app/m/vouchers`, `/app/m/org-hierarchy`, `/app/m/location`, `/app/m/store-group`, `/app/m/sku-company-link`, `/app/m/sku-group`, `/app/m/merch-hierarchy`, `/app/m/manage-attribute`, `/app/m/other-masters`, `/app/m/price-zone`, `/app/m/order-refund`, `/app/m/sales-rep`.

### Procurement

`/app/procurement/po/single`, `/app/procurement/po/multiple`, `/app/procurement/po/back-orders`, `/app/procurement/po-enquiry`, `/app/purchase-orders`, `/app/grn`, `/app/procurement/vendor-invoices`, `/app/procurement/otb`, `/app/procurement/category-buyers`, `/app/procurement/ars/sku-location`, `/app/procurement/ars/rules`, `/app/procurement/ars/logs`, plus generic `/app/m/vendor-promotions` and `/app/m/purchase-charge`.

### Sales

`/app/channels`, `/app/sale-orders`, plus `/app/m/oms-rules`, `/app/m/kitting-order`, and `/app/m/cod-recon`. Several menu labels intentionally target `/app/sale-orders` or protected `/app/skus`.

### WMS

Fulfillment routes: `/app/fulfillment/ajio`, `/app/fulfillment/amazon-mfn`, `/app/fulfillment/allocate`, `/app/fulfillment/shipment-handover`, `/app/fulfillment/delivery-shipping`, `/app/fulfillment/bulk-update`, `/app/fulfillment/manage-picklist`, `/app/fulfillment/manage-picking`, `/app/fulfillment/delivery-split`.

Inbound/inventory dedicated routes: `/app/grn`, `/app/inventory`.

Generic WMS routes: `/app/m/wms-zone`, `/app/m/picker-zone-pref`, `/app/m/bin-enquiry`, `/app/m/bin-create-edit`, `/app/m/lottable-validation`, `/app/m/receipt-validation`, `/app/m/sku-label-print`, `/app/m/manage-awb`, `/app/m/transporter-pref`, `/app/m/service-pin-code`, `/app/m/inbound-gate-pass`, `/app/m/inbound-enquiry`, `/app/m/inbound-realtime`, `/app/m/inbound-qc`, `/app/m/inv-move-history`, `/app/m/inv-move`, `/app/m/inv-move-scan`, `/app/m/cycle-count`, `/app/m/bin-audit`, `/app/m/bulk-lottables`, `/app/m/putaway-enquiry`, `/app/m/dispatch-checkpoint`, `/app/m/sku-grading`, `/app/m/discrepancy-enquiry`, `/app/m/bulk-upload`, `/app/m/mr-inventory-log`.

### Returns & Transfers

Dedicated: `/app/returns/rtv-enquiry`, `/app/returns/vendor-return`, `/app/returns/customer-enquiry`, `/app/returns/customer-return`, `/app/transfers`.

Generic: `/app/m/return-otc`, `/app/m/return-otc-new`, `/app/m/return-wo-order`.

### Admin

`/app/admin/user-enquiry`, `/app/admin/user-create-edit`, `/app/admin/role-create-edit`, `/app/admin/order-import`, `/app/admin/common-import`, `/app/admin/exports`, `/app/admin/force-order-pull`, `/app/admin/settings`, `/app/admin/audit-logs`, `/app/admin/manage-api`, `/app/admin/api-dashboard`, plus generic admin log routes `/app/m/user-audit-logs`, `/app/m/accounting-log`, `/app/m/tax-integration-log`, `/app/m/device-tracking-log`, `/app/m/external-apps-logs`, `/app/m/pos-integration-log`, `/app/m/repush-log`.

### Reports

All report routes use `/app/r/:key`: `gr-register`, `po-report`, `inbound-qc-report`, `fin-inv-sku`, `fin-inv-sku-bin`, `inventory-ageing`, `inventory-ledger`, `sales-register`, `purchase-register`, `sales-return-register`, `sales-report`, `sku-wise-sales`, `order-life-cycle`, `shipping-label`, `invoice-report`, `manifest-report`, `dispatch-report`, `mis-report`, `pick-pack-report`, `order-unallocation`, and `mis-report-2`.

## Per-route inspection checklist

For each route above, record: live URL/page state; parent and child navigation; title/breadcrumb; visible layout; toolbar; fields/defaults/options; table columns; filters/search/sort; pagination; row/bulk actions; tabs; modals/drawers; validation; loading/empty/error/success states; permissions; API/data dependencies; and responsive behavior. Then replay every safe workflow locally and mark the route complete only after comparison.

## Protected Master SKU boundary

Do not modify `src/pages/Skus.tsx`, the `/app/skus` route, SKU Master menu links, or the existing SKU API/data contract. Other modules may read SKU data through the existing API. This protection includes Sales links labelled SKU Channel Listing/SKU Moderation that intentionally route to `/app/skus`.

## Module completion log

| Module | Discovery | Implementation | Local test | Reference comparison |
|---|---|---|---|---|
| Dashboard / platform filter | Local baseline | Existing | Typecheck/build passed | Live pending |
| WMS Order Allocate/Unallocate | Existing audit | Implemented | Existing audit tests | Live pending |
| WMS inventory operations | Existing local audit | Implemented | Existing build/typecheck | Live pending |
| Master SKU | Protected | Existing implementation | Not changed | Not in this scope |
| Remaining modules | Not complete | Pending sequential audit | Pending | Pending |

