# ARS (Procurement) Replication Evidence

Authoritative source inspected: `Vin eRetail _ ARS (procurement) – Vinculum Product Guide.pdf` (7 pages). All pages were text-extracted and visually reviewed before implementation. No ARS workflow videos were supplied with this request, so nothing below is claimed as video-verified.

## 1. Modules replicated

| Module | Route | Implemented surface |
|---|---|---|
| ARS SKU-Location Link | `/app/procurement/ars/sku-location` | enquiry, filters, advanced SKU search, category picker, add/edit, download, CSV bulk import, bulk update, reset, status display |
| ARS Rules | `/app/procurement/ars/rules` | enquiry, filters, rule grid, create/edit, conditional Min-Max/Sales History fields, SKU sets, save, confirm, delete guard, Run Now, View Log |
| ARS Execution Log | `/app/procurement/ars/logs` | searchable execution history, evaluation/order counts and generated-PO detail |
| B2B ARS/ROS Settings | `/app/procurement/ars/settings` | Enable ARS, ROS Calculation Hour, standard periods and three custom periods |

## 2. Workflows replicated

1. Create or edit a SKU-location link, resolving SKU name/category/brand from SKU Master and validating SKU existence.
2. Search/filter links, open the hierarchy picker, reset, export, import CSV, or bulk-update matching links.
3. Create a rule with required metadata and one or more typed/operand SKU-set conditions.
4. Switch ARS Method between Min-Max and Sales History and apply the corresponding quantity/ROS fields.
5. Save a Pending rule, confirm it to Active, and prevent invalid confirmation/deletion/run transitions.
6. Run an active, in-date rule only while ARS is enabled; evaluate active SKU-location links and inventory; create downstream Purchase Orders; update last/next run; persist an execution log.
7. Open execution-log details and trace generated Purchase Order numbers.
8. Configure ARS and ROS periods used by Sales History rule creation.

## 3. Documentation-to-video discrepancy matrix

| Evidence item | Documentation | Video evidence | Resolution |
|---|---|---|---|
| Workflow recordings | Guide describes ARS screens and behavior | No ARS videos were supplied | Guide treated as sole authority; no video-level fidelity claim |
| Output Type count | Says three types are available | Only `Confirmed` and `Pending` are listed | Implemented only the two named values; no third value invented |
| Fulfilment terminology | Uses `Fulfilment`, `Fullfillment`, and `fulfilment warehouse` variants | None | UI uses `Fulfilment`, matching the clearest labels/screenshots |
| Rules navigation | Narrative says Procurement > ARS; screenshots/breadcrumb context show Setup > ARS Rules | None | Menu remains under Procurement > Setup > ARS while editor breadcrumb preserves Setup wording |
| Frequency | Described as execution interval; screenshot examples show values such as 2 Hours/6 Hours | None | Stored as hours with Never, Hourly, Every 2 Hours, Daily and Weekly labels |
| Execution Log | Named as an ARS section | No fields or layout documented | Implemented only an evidence-supported audit grid; exact layout remains unverified |
| Bulk Import | Button/screenshot is shown | File schema is not documented | Implemented CSV with visible supported headers and 2,000-row safety limit; schema is an implementation necessity |

## 4. APIs, database, and data mappings

| API/data | Relationship |
|---|---|
| `GET/POST/PUT/DELETE /api/ars?entity=links` | `ars_sku_links`; validates against `skus`; carries SKU, location, vendor, fulfilment, lead-time, cover and ARS status |
| `GET/POST/PUT/DELETE /api/ars?entity=rules` | `ars_rules`; persists method, thresholds/ROS period, vendor/output type, date/status/frequency and SKU sets |
| `GET /api/ars?entity=logs` | `ars_execution_logs`; relates `rule_id` to generated PO codes |
| `GET/PUT /api/ars?entity=settings` | `ars_settings`; provides Enable ARS and selectable ROS periods |
| Shared `skus`, `inventory`, `vendors` | Rule execution resolves product, current stock, cost and the configured primary vendor |
| Shared `purchase_orders` | ARS execution creates normal PO records with `po_type: ARS`, `ars_rule_id`, line items, warehouse, status and expected date |

The development server uses the repository's existing in-memory fallback when `MONGODB_URI` is absent; the same handlers use MongoDB when configured.

## 5. Validations and business rules implemented

- SKU, Location and ARS Flag are mandatory; SKU must exist; duplicate SKU-location pairs are rejected.
- Lead time and stock-cover days must be non-negative.
- Rule Description, Method, Vendor Type, Output Type, Location, Start Date, Status, Frequency and at least one SKU Set are mandatory.
- End Date cannot precede Start Date; Min-Max maximum must exceed minimum; Sales History requires an enabled ROS period.
- Only Pending rules can be confirmed or deleted. Only Active, in-date rules can run.
- Global Enable ARS blocks execution when off.
- Min-Max replenishes to Maximum Quantity when stock is at/below Minimum Quantity.
- Output Type maps to PO status `Confirmed` or `Pending Confirmation`; fulfilment lead time maps to expected date.
- Run updates last/next-run dates and writes a PO-linked execution record. `Never` leaves Next Run blank.

## 6. Permissions and roles implemented

All ARS routes use the application's existing authenticated `ProtectedRoute`. The guide identifies a logged-in user but provides no role/action permission matrix, so no undocumented fine-grained roles were invented. Created/updated audit fields retain the signed-in demo/admin convention already used by the replica.

## 7. Test cases executed

- `npm run typecheck`: passed.
- `npm run build`: passed (Vite warns that Node 20.14 is below its preferred 20.19 and that the main bundle exceeds 500 kB).
- Targeted ESLint on the ARS/API/routing files: passed after replacing the pre-existing untyped menu icon with `LucideIcon`.
- Repository-wide `npm run lint`: did not pass because the existing codebase has 248 errors and 4 warnings outside this ARS change (primarily pre-existing `any`, effect-state and refresh-export findings); the targeted ARS set is clean.
- API verification: 11 assertions passed, including create link/rule, duplicate rejection, invalid Min-Max rejection, blocked Pending run, Pending-to-Active confirmation, generated confirmed PO quantity 10, active-delete rejection, disabled-ARS rejection and log-to-PO linkage.
- Browser verification at 2560×1440: all four routes and their required labels passed; Add SKU-Location, Bulk Update, conditional Min-Max fields, Add SKU Set and settings were exercised.
- Visual screenshots inspected: `/tmp/ars-browser-sku-location-editor.png`, `/tmp/ars-browser-rule-editor.png`, `/tmp/ars-browser-settings.png`.

## 8. Remaining mismatches or uncertainties

- No workflow videos accompanied this ARS request; click timing, hover/focus behavior and video-only messages cannot be compared.
- The guide does not expose the Execution Log layout, import file format, permission matrix, pagination thresholds or complete error wording.
- Sales History uses the available stock-cover data as a conservative replenishment calculation. The source's historical sales dataset/ROS formula is not supplied.
- `Min Cost` and `Min Lead Time` are preserved rule values, but exact vendor selection cannot be reproduced without SKU-vendor price/lead-time alternatives from the source. Execution uses the SKU-location Primary Vendor.
- Frequency and next-run state are persisted, but no always-on background scheduler was introduced; Run Now is fully operational.
- Audit metadata is stored and displayed, but the guide does not document a full audit-history modal.

## 9. Exact files/components changed

- `api/ars.js` — dedicated ARS CRUD, lifecycle, execution and downstream PO API.
- `api/seed.js` — ARS links, rules, execution-log and settings seed relationships.
- `server.js` — `/api/ars` registration.
- `src/eretail/procurement/ARSWorkflows.tsx` — four dedicated ARS screens.
- `src/App.tsx` — dedicated ARS routes.
- `src/eretail/menuData.ts` — dedicated ARS navigation and typed menu icons.
- `scripts/verify-ars-api.mjs` — repeatable API/business-rule verification.
- `scripts/verify-ars-browser.py` — repeatable browser/UI verification.
- `docs/ARS_REPLICATION_EVIDENCE.md` — this evidence, discrepancy and completion report.
- `docs/PROCUREMENT_REPLICATION_EVIDENCE.md` — prior procurement inventory updated to point at the dedicated implementation.

Existing Master SKU and Tally components, routes and APIs were not modified.
