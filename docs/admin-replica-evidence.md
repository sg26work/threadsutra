# Vin eRetail Admin replica evidence matrix

## Source inventory

| Source | Coverage | Observed duration/pages |
|---|---|---|
| `Vin eRetail _ Admin – Vinculum Product Guide.pdf` | Admin overview, User Management, User Enquiry, User Create/Edit, Audit Log, Manage API, Order Imports | 9 pages |
| `new1.webm` | Admin flyout, User Enquiry landing, Search, results grid | 12.767 seconds, 152 encoded frames |
| `new2.webm` | Admin flyout, Audit Logs landing, Search, results grid, vertical scrolling | 22.612 seconds, 237 encoded frames |
| `new3.webm` | Admin flyout, Manage API list, activate, settings, access rights, Link To Store, save | 30.304 seconds, 485 encoded frames |

## Website inventory supported by supplied evidence

- Header: location `USPL Warehouse`, order-type selector `Web Order No`, order search, favorite/task/fullscreen/download/profile icons.
- Left icon rail and Admin flyout.
- Admin flyout groups:
  - User Management: User Enquiry, User Create/Edit, Role Create/Edit.
  - Imports: Order.
  - Miscellaneous: Exports, Screen Notifications, Customer Feedback Setting, Force Order Pull, Settings, Audit Logs, Manage Api, API Dashboard.
- User Enquiry fields: User Name, First Name, Last Name, Status, Email, User Type. Advanced Search adds Role, Company, Location.
- User Enquiry actions: Advance Search, Search, Reset, Export. Result rows use clickable blue user names, alternating row colors, vertical scrolling, and 20/50/100/200 page sizes.
- User Create/Edit documented groups:
  - User details: User Name, First Name, Last Name, Title, Date of Birth, Status, User Type, Purchase Order Limit.
  - Contact details: Address 1, Address 2, Address 3, Country, State, City, PinCode, Phone, Alternate Phone, Email, Alternate Email.
- Audit Logs fields/columns: Date, Process Group, Key Value1, Key Value2, Key Value3, Action, User, Attribute, Old Value, New Value.
- Audit values: Vendor Maintenance and SKU Maintenance; INSERT, UPDATE, DELETE; Created and Confirmed status values appear as old/new values.
- Manage API list: API Key, API Owner, Created Date, Expiry Date, Status, Settings, Add action.
- Manage API detail: API Owner/API Key summary; API Name, Access Rights, Allowed Locations; Save, Cancel, Add.
- Location popup: `Link To Store`; Unlinked Location and Linked Location lists; select-all and row checkboxes; forward/back controls; OK and Close.
- Order Imports documentation: download template, populate it, upload it, and expose success/failure records.
- Loading behavior: dimmed grid area, centered animated blue spinner and centered eRETAIL mark.
- Notifications observed: `Successfully Activated!` and `Successfully saved!` in dismissible pale-red notices at upper right.
- Persistence relationships: User records and API keys live in `admin_records`; API permissions are nested under an API key; mapped locations are nested under each permission; mutations increment a record version and append an audit record.

## Workflow traces

### Video 1 — User Enquiry

1. Start on dashboard.
2. Open Admin rail flyout.
3. Select User Enquiry.
4. Route shows an empty grid with default User Type `Normal` and page `0 of 0`.
5. Click Search without additional criteria.
6. A loading state appears.
7. Results populate, sorted by User Name, with `Page 1 of 10`, page size 20, and `View 1 - 19 of 197`.

### Video 2 — Audit Logs

1. Start on dashboard and open Admin.
2. Select Audit Logs.
3. Route shows empty filter/grid state.
4. Click Search without criteria.
5. A loading state appears.
6. Results populate with `Page 1 of 20`, page size 20, and `View 1 - 20 of 390`.
7. Scroll within the results while the page header and grid headings remain in place.

### Video 3 — Manage API

1. Start on dashboard and open Admin.
2. Select Manage Api.
3. Wait for the six-row API list.
4. Activate the inactive `sa` API; its status changes to Active and `Successfully Activated!` appears.
5. Open that API using the Settings gear.
6. Toggle API access-right checkboxes.
7. Open an Allowed Locations pencil action.
8. In `Link To Store`, select `1mg`, move it from Unlinked to Linked, and confirm with OK.
9. Save the API settings.
10. Return to the list with the updated API and show `Successfully saved!`.

## Documentation-to-video discrepancy matrix

| Area | Documentation | Video evidence | Resolution |
|---|---|---|---|
| User Enquiry action order | Lists Advance Search, Search, Reset, Export | Shows Advance Search, Search, Reset, Export | Video order used. |
| User Enquiry initial state | Search without criteria populates all users | Landing is empty until Search | Video behavior used. |
| User status spelling | Generic `status` wording | Rows show both `Active` and `InActive` | Exact observed casing retained. |
| User result count | Not specified | 197 total; 19 visible on first page despite size 20 | Video count and visible range retained. |
| Audit date filter | Preset/custom range up to 90 days | Compact lookup input is shown; picker is not opened | Input reproduced; undocumented picker internals remain unverified. |
| Audit process groups | Vendor Maintenance and SKU Maintenance | Both appear in results and filter context | Both retained. |
| Audit result count | Not specified | 390 total, 20 pages | Video totals retained. |
| Manage API activation | Can activate/deactivate | Video demonstrates activation only | Activation is verified; deactivation remains documentation-supported but not video-traced. |
| Manage API settings | Access rights and mapped/unmapped locations | Shows permission rows and dual-list location modal | Video layout and interaction take priority. |
| API status message | Not specified | `Successfully Activated!` | Exact video message retained. |
| API save message | Not specified | `Successfully saved!` | Exact video message retained. |
| Order Imports | Template download/upload and success/failure display | No supplied video demonstrates it | Existing documentation-backed implementation retained; visual and end-to-end fidelity remain unverified. |
| Authentication/login | Admin access is assumed | All videos begin after authentication | Existing project login retained; reference login visuals and session exchange are not evidenced. |

## Verification status

- Passed: `npm run typecheck`.
- Passed: `npm run build` (with Node 20.14/Vite engine warning and bundle-size warning).
- Passed by local HTTP API checks: user/audit/API seed retrieval; inactive-to-active API mutation; optimistic version increment; nested permission/location persistence after refresh.
- Not available in the current toolchain: automated browser click replay and pixel-diff comparison.
- Not complete: reference login flow, permission-denied variants, User Create/Edit visual fidelity, Order Import template contents/parser, undocumented dropdown option sets, negative cases not shown in the recordings, responsive behavior at widths other than 2560×1440.

