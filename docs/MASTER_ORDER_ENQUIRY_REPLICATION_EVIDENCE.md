# Master Order Enquiry replication evidence

## Live contract

- Launcher: `masterOrderEnquiryBS`.
- Tabs: **Master Order No** and **Order List**.
- Master endpoint: `jsonMasterOrderSearch`; detail endpoint: `jsonMasterOrderDetailSearch`.
- The master-number link switches tabs, copies the parent document/POD context, and invokes detail search.
- Exact date validations: `Parent Doc No. Date range cant be greater than 90 days` and `Order Date range cant be greater than 90 days`.
- Detail search requires the parent document with `Select Parent Document Number .`.
- Master export is `ParentDocumentEnquiryExport` / `MSODR001`; detail export is `ParentDocumentDetailExport` / `MSODR002`; empty grids report `Nothing to export`.
- Order links open `orderMaintenanceBS?orderCode=...&fromPOS=yes&hdnOrderEnquiryId=...`; Taxes expands in place to tax group and two-decimal tax amount.

## Local implementation

- `src/eretail/sales/MasterOrderEnquiry.tsx` implements both tabs, their distinct toolbars/fields/grids, the automatic master-to-detail transition, status list, tax expansion, exact validation, paging, reset, and distinct CSV exports.
- `api/master-orders.js` implements separate master/detail query contracts with date-range and multi-value filtering over persisted sale-order data.
- `scripts/verify-master-order-enquiry.mjs` covers the two API shapes, required-parent error, four live page sizes, both tab surfaces, exact status values, tax expansion, exports, and browser errors.

## Validation

- `npm run typecheck`: pass.
- `npm run build`: pass. Environment warnings remain for Node 20.14 versus Vite's preferred 20.19+ and the existing large bundle.
- `ERETAIL_BASE_URL=http://127.0.0.1:3011 npm run test:master-order-enquiry`: exit 0.
- Second live/local comparison: both tab names matched; active master-tab labels matched for Master Order No, Channel, Order Date, OrderTag, Order Fulfillment Location, and POD ID. Raw text counts differ where the live page retains the hidden second tab in the DOM and the React page mounts only the active tab.

## Evidence boundary

The authenticated live default search exposed no usable master rows during this run. The nested Order Create/Edit URL contract and tax behavior were therefore inspected from live handlers; a row-level live visual comparison of those nested states remains unavailable and is not claimed.
