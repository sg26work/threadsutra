# SKU Channel Listing replication evidence

## Live discovery and contracts

- Route: `displaySkuChannelLinkBS`.
- Tabs: SKU/Link Search Channel, SKU/Channel Link Import, Unmapped SKU.
- Search actions: Add new, Search, Advance Search, Reset, Export.
- Search endpoint observed in `skuChannelLinkSearchOnClick`: `skuChannelLinkGridSearchJSONData` with SKU, description, channel SKU, channel, product ID, client, channel type, and `doFetchCount=false`.
- Save endpoint observed in `saveSkuCompanyLocData`: `jsonSaveUpdateSkuCompanyLoc`.
- Exact validations: `Channel is Mandatory.`, `ERetail Sku is Mandatory.`, `channelSkuCode is Mandatory.`, `Status is Mandatory.`
- Exact success: `Record Saved Successfully`.
- Editor fields: Channel, eRetail SKU, SKU Description, Channel SKU, Channel Product Id, Back Order Qty, Channel Price, Status, Picking Instructions, Maximum SKU Qty.
- Status values: Active and InActive; reset restores Active and client 0.
- Main visible grid: Client, Channel Image, Channel, Eretail SKU, SKU Description, Channel SKU, Channel Product Id, Channel Price, Picking Instructions, Status, Back Order Inventory, Upd Date, Upd Button.

## Local implementation and verification

- Dedicated implementation: `src/eretail/SkuChannelListing.tsx`.
- Persistent APIs: `api/sku-channel-links.js` and the existing `api/sku-moderation.js` for Unmapped SKU.
- Import is a first-class tab with preview, row results, and persistent commit rather than an unrelated toolbar modal.
- Playwright exercised search payloads, all three tabs, exact validation, create, close, reload, persisted search, import preview, Unmapped SKU request, pagination, console, and API errors.
- `npm run typecheck`: passed.
- `npm run build`: passed; Node/Vite version and large-bundle warnings remain environmental/non-blocking.
- `ERETAIL_BASE_URL=http://127.0.0.1:3011 npm run test:sku-channel-listing`: passed.
- Second authenticated live/local comparison: passed after resetting the reused live iframe, with zero tab/action/column/option/editor-field differences.

