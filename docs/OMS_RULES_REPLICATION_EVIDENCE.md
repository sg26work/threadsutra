# OMS Rules replication evidence

## Live recursive discovery

- Launcher route: `displayOMSBS`.
- Branches: Order Validation Rules, Order Routing/Split Rules, Return Routing Rules, Seller Panel Order Rules, Shipping Rules, Allocation Rules.
- Every branch has Show Active Only, Add New Rules, prioritized On/Off rows, and First/Previous/Next/Last paging.
- Validation editor: Self/Third Party, multi-location selection, Create/Allocate events, All Condition, Any Condition, Action. Save: `jsonSaveOrderValidationRule`.
- Routing editor: channel/location selection, order splitting, inventory availability, location-filter criterion, location type/tags, three rule builders. Save: `jsonSaveOrderRoutingRule`.
- Return editor: channel selection and three rule builders. Save: `jsonSaveReturnRoutingRule`.
- Seller Panel editor: inventory availability, vendor/splitting actions, three rule builders. Save: `jsonSaveSellerPanelOrderRule`.
- Shipping editor: Forward/Reverse filtering, applicable locations, client, document type, status and three builders. Save: `jsonSaveShippingRule`.
- Allocation editor: warehouse, client, allocation-strategy action, status and three builders. Save: `jsonSaveAllocRule`.
- Exact validation messages were extracted from each live save handler; Validation includes `Rule Name is mandatory`, Routing includes `Location Filter Criterion is Mandatory.`, Shipping includes `Rule Type is Mandatory.`, and Allocation includes `No Action defined (Allocation strategy)`.

## Local replacement

- UI: `src/eretail/sales/OmsRules.tsx`.
- API: `api/oms-rules.js`.
- Persistence moved out of `generic_records` into the dedicated `oms_rules` collection.
- Each branch now has its observed fields and condition/action builders, persistent create/update, active toggle, priority update and paging.

## Verification

- `npm run typecheck`: passed.
- `npm run build`: passed; existing Node/Vite version and large-bundle warnings remain.
- `ERETAIL_BASE_URL=http://127.0.0.1:3011 npm run test:oms-rules`: passed.
- Browser suite covered six branch editors, exact Validation failure, persistent creates, active/priority transition, reload, pagination, console and API checks.
- Second authenticated live/local comparison passed across the launcher, all branch matrices, status controls, builders, and direct controls `applicableLocations`, `ruleType`, and `warehouseName`.

