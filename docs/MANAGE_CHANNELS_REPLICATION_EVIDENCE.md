# Manage Channels replication evidence

## Live discovery

- Route: `displayChannelEnquiryBS`; authenticated inspection was read-only through Chrome CDP.
- Actions: Search, Reset, Reconcile Inv, Synchronize 0 Inv, Import, Export, Detail Export, Add New.
- Filters: Client, Channel Code, Channel Name, Brand Code, Location, Status, Channel Type, Fulfilment Status, Channel Group Code.
- Status options: All, Active, InActive. Fulfilment options: All, Online, Offline.
- Grid: Client, Channel Code, Channel Name, Fulfilment Status, Status, Location, Channel Type, Registration Date, Channel Configured, OrgId, Last Recon Run Date, Reconcile, Error.
- Add New opens `displayChannelMaintenanceBS` and presents three catalogs: Select Marketplace to Integrate, Select Cart to Integrate, and Select International Marketplace to Integrate.
- The inspected Custom Channel editor exposes Save, Add New, Channel Maintenance, User Defined Field, Configure Interface, SLA 48, order/return synchronization controls, invoice/shipping controls, and conditional sync dates.

## Local implementation

- Dedicated page: `src/eretail/ManageChannels.tsx`.
- Persistent search/create API: `api/channels.js`.
- The enquiry uses the live-named actions, exact status/fulfilment values, 20/50/100/200 pagination, and the complete visible grid projection.
- Add New uses the three observed catalogs and routes the selection into the live-shaped Channel Maintenance editor instead of a generic CRUD form.

## Validation

- `npm run typecheck`: passed.
- `npm run build`: passed; environment warnings remain for Node 20.14.0 versus Vite's preferred 20.19+ and the existing large bundle.
- `ERETAIL_BASE_URL=http://127.0.0.1:3011 npm run test:manage-channels`: passed.
- Second authenticated live/local comparison: passed with `failures: []` for actions, headers, catalog groups, and editor controls.

