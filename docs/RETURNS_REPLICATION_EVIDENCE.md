# Return Management replication evidence

Authoritative source: <https://docs.vineretail.com/vin-eretail-return-management/> (reviewed 2026-08-10) and its four embedded recordings: `return-1.webm`, `Ven-ret.webm`, `cust-ret.webm`, and `return-cust.webm`.

The subsequently supplied `r1.webm`–`r4.webm` files were byte-for-byte identical to those four recordings (SHA-1: `e28852351b12269b3c3f6fe1386b862b0259f3c3`, `94c8f43f21dda9d145d1bbe3523fd8b9b18577db`, `daf1158eba2a05ff92099b36757820eb6864db3e`, and `a5a1e5040759b3419eadaa09351d911f4f5f3225`). They introduce no conflicting workflow evidence.

## Screen and workflow inventory

| Source screen | Implemented route | Observed / implemented behaviour |
| --- | --- | --- |
| RTV Enquiry | `/app/returns/rtv-enquiry` | Enquiry columns, working Search/Reset/Advance Search (site/SKU), real persistent export/detail-export controls, empty pagination and Add New. RTV number/date/type/PO/vendor/status/quantity/amount/on-hold are persisted. |
| Vendor Return Create/Edit | `/app/returns/vendor-return` | With PO / Without PO, PO Pick List, vendor selection, Damage Return/Intercompany Move/Normal Return, site/vendor/remarks fields, SKU grid, UDF 1-5, shipping/activity tabs, Import textarea in `SKU,Qty` format, maximum 200 lines, save validation. |
| Customer Return Enquiry | `/app/returns/customer-enquiry` | Recorded enquiry columns, working Search/Reset/Advance Search, real persistent export/detail-export controls, and route to create/edit on record open. |
| Customer Return Create/Edit | `/app/returns/customer-return` | Request/Request & Inbound, order/delivery pick list, return type, category, delivery type, transporter, reference, remarks, line grid, customer/UDF/comment tabs and creation validation. |

## Business rules implemented

- Vendor return requires site location, vendor, return type and 1–200 positive-quantity lines. A With PO return also requires a PO.
- Vendor return begins `Created`; it may become `Confirmed`; allocation-only quick ship, hold, and cancellation are enforced server-side.
- Customer return requires an order, delivery location, return type and 1–200 positive-quantity lines. The exact observed missing-order message is `Please select orderNo first`.
- `Request & Inbound` permits `Delivered Return` only. A delivered return requires a category and delivery type. A non-delivered return clears category and fixes delivery type to `Delivery`.
- Customer return begins `Pending Confirmation`; confirmation gives `Confirmed` (or `Closed` for Request & Inbound), inbound closes a confirmed record, and a closed record can save refund remarks/date.
- Activity/comments and UDF values are held on each return record. Return records use the existing `returns` collection so reports retain access to legacy-compatible `rma_no`, `order_no`, `sku_code`, `qty`, `reason`, `return_date`, and `status` values.

## Documentation-to-recording discrepancies

| Topic | Documentation | Recording | Resolution |
| --- | --- | --- | --- |
| Workflow count | User request refers to three recordings | Guide embeds four distinct Return Management recordings | All four were reviewed; no workflow was omitted. |
| Customer menu labels | Guide uses Customer Returns terminology | Recording menu shows `Customer Return Enquiry` and `Customer Return Create/Edit` | Recorded labels are used in the Returns flyout. |
| Import label | Guide says Import SKU/Qty | Vendor recording modal labels its input `PO Code *` while showing SKU,Qty instructions | SKU,Qty input semantics and displayed import notes are preserved; no misleading PO dependency was introduced. |

## Verification performed

- `npm run typecheck` passed.
- `npm run build` passed (Vite reports an existing Node 20.14 vs recommended 20.19+ warning and bundle-size warning).
- `BASE_URL=http://127.0.0.1:3011 node scripts/verify-returns-api.mjs` passed: lookup availability, missing-order validation, vendor creation/confirmation/invalid quick-ship, customer creation/confirmation/inbound/refund persistence.

## Remaining verification limitation

The source UI was inspected frame-by-frame. A browser automation endpoint was not available in this workspace, so no pixel-comparison screenshot or click replay was run against the local build. The API and compile evidence above does not substitute for that visual pass.
