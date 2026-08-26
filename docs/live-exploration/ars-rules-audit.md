# ARS Rules live-first audit checkpoint

Date: 2026-08-26

Status: **UNVERIFIED — authenticated LIVE session required**

## Confirmed LIVE shell evidence

- Navigation label: `ARS Rules`
- Shell handler: `openScreen("ARS Rules", "arsRulesDisplay", "fa fa-arrow-circle-right")`
- Expected live action/frame entrypoint: `arsRulesDisplay`
- The adjacent confirmed menu item is `ARS Execution Log` with entrypoint `arsExecLogDisplay`.

No deeper ARS Rules claim is currently valid. When `arsRulesDisplay` was opened after completing ARS SKU-Location Link, the reference session expired and the browser redirected to `eRetailLogin.action?popup=true`. Browser-history alternatives also redirected to login. No credentials were read, printed, stored, or changed.

## Current local implementation requiring LIVE comparison

File: `src/eretail/procurement/ARSWorkflows.tsx`, component `ARSRules`

Treat every item below as a gap until LIVE proves it:

- Enquiry actions: Search, Reset, Add New.
- Enquiry fields: Location and Product Set plus ten grid filters.
- Grid columns and order: Rule ID, Description, Status, ARS Method, Frequency, Last Run Date, Next Run Date, Created By, Updated By, Updated Date.
- Generic endpoint family: `/api/ars?entity=rules` and `/api/ars` for search/create/update/confirm/run/delete.
- Hard-coded location list instead of a confirmed live location master contract.
- Hard-coded ARS Method, Vendor Type, Output Type, status, frequency, and SKU-set type values.
- Editor actions: Run Now, View Log, Save, Confirm, Delete, Add New, Close.
- Editor fields, conditional Min-Max/Sales History sections, dates, status, frequency, and ARS details sidebar.
- `Audit` button has no handler and is presently a confirmed local no-op.
- SKU Set grid uses local select/text controls; all pickers, operands, row actions, and nested workflows are unverified.
- Local execution creates purchase orders and execution logs through guide-derived business logic; this is not authenticated-live evidence.
- Local validation messages and state transitions are invented/guide-derived until traced from LIVE handlers and responses.

## Required next authenticated pass

1. Open `arsRulesDisplay` and capture visible toolbar, fields, grid column model (including hidden columns), pager, defaults, and dropdown ordering.
2. Trace Search and Reset handlers, endpoint, method, payload, response envelope, sort/page behavior, empty/error state, and reload callback.
3. Open Add New and every row action. Record the complete editor/dialog tree and all conditional controls.
4. Open every picker and nested dialog; test search, selection, OK, Close, clear, and dependent behavior.
5. Extract every editor handler, validation branch/message, mutation endpoint/payload/response, close/refresh behavior, and audit workflow.
6. Only after that evidence exists, replace or remove each generic/no-op local behavior and build a dedicated behavior-and-persistence Playwright verifier.

## Verification gate

Do not mark ARS Rules verified until authenticated LIVE UI/workflow/API/validation evidence, local persistence/reload, browser/Playwright, typecheck/build, clean console/API/Vite, and a second LIVE comparison all pass.
