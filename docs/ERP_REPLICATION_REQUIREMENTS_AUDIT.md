# ERP Replication Requirements Audit

Source: user-supplied enterprise reverse-engineering specification (2026-08-14).

## Governing requirements

The specification requires parity across authentication, dashboard navigation, masters, products, inventory/WMS, procurement, sales/orders, channels, reports, imports/exports, administration, RBAC, notifications, audit history, APIs, persistence, responsive UI, and end-to-end workflows. It requires evidence-based replication rather than generic CRUD or a visual-only mockup.

## Evidence boundary

The supplied specification includes demo credentials, but credentials must not be stored, printed, committed, or placed in application code. No live browser-control connector is available in the current coding session. Therefore live-only facts—exact reference payloads, server messages, hidden controls, permissions, and pixel comparison—remain pending authenticated inspection or supplied recordings. Existing local behavior is not treated as proof of reference parity.

## Local architecture mapping

| Requirement area | Current local implementation | Audit status |
|---|---|---|
| React/TypeScript/Vite UI | Present | Implemented, reference fidelity varies by module |
| Express API | Present in `server.js` and `api/*` | Implemented, endpoint parity pending evidence |
| MongoDB/in-memory fallback | Present | Implemented, production schema parity pending |
| Authentication/protected routes | `ProtectedRoute`, login flow | Local behavior present; live session parity pending |
| Dashboard/menu | `src/eretail/menuData.ts`, `Shell.tsx` | Inventoried in `FULL_DASHBOARD_WORKFLOW_INVENTORY.md` |
| Dedicated workflows | Fulfillment, procurement, inventory, masters, reports | Mixed; each requires separate evidence audit |
| Generic workflows | `GenericRoute`/`GenericModule` for 55 destinations | Approximation; not accepted as exact parity |
| RBAC/field-level security | Not fully evidenced in local route/UI layer | Gap |
| Background jobs/notifications | Partial module-specific behavior | Gap pending source evidence |
| Import/export/report layouts | Module-specific/partial | Gap pending source evidence |
| Audit history/data relationships | Partial APIs and seed collections | Gap pending cross-module verification |

## Protected scope

Master SKU remains unchanged and is excluded from broad refactoring:

- `src/pages/Skus.tsx`
- `/app/skus` route and existing SKU menu links
- Existing SKU API/data contract

Other modules may read SKU data through the existing contract, but must not alter Master SKU UI, schema, route, or persistence without a separate explicit request.

## Delivery method

Implementation will proceed one module at a time. For each module, the audit must capture navigation, controls, fields, defaults, validations, dialogs, statuses, permissions, API/data mappings, persistence, loading/error/success states, responsive behavior, and positive/negative tests. A module is not marked complete based solely on build success.

## Current blocker for exact live parity

The reference URL cannot currently be inspected interactively from this coding session. A manually authenticated browser session exposed through a supported browser connector, or module recordings/screenshots, is required for claims about reference-only behavior. Until then, work can continue against local code, supplied PDFs/videos, and existing audit evidence, with all unverified items clearly marked.

