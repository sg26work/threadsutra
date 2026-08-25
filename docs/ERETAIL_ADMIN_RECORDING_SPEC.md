# eRetail Admin replica: recording traceability specification

## Authority and confidence

This specification and the implementation at `src/eretail/admin/AdminModule.tsx` are derived from the supplied authenticated 299.5-second screen recording. It is the only product-behaviour authority. The recording was sampled frame-by-frame, with two-second timeline sheets and full-resolution key frames.

`Verified` means a label, state, interaction, or outcome was visibly demonstrated. `Unverified` means the route was opened but its behaviour was not shown; it is not implemented as inferred functionality.

## Navigation map

```text
Admin
├── User Management
│   ├── User Enquiry
│   ├── User Create/Edit
│   └── Role Create/Edit
├── Imports
│   ├── Order Import
│   └── Common Import
├── Miscellaneous
│   ├── Exports
│   ├── Force Order Pull
│   ├── Settings
│   ├── Manage Api
│   └── API Dashboard
└── Logs (visible in navigation only)
    ├── User Audit Logs
    ├── Accounting Log
    ├── Tax Integration Log
    ├── Device Tracking Log
    ├── External Apps Logs
    ├── POS Integration Log
    └── Repush Log
```

The implementation routes the verified screens through `/app/admin/:screen`; each remains inside the Admin rail menu. Log destinations remain on their pre-existing routes because their screens were not shown.

## Shared UI specification

- Dark left icon rail, blue system bar, magenta open-screen tabs, breadcrumb strip, pale lavender table headers/footers, alternating very-light lavender rows, and compact rectangular controls are visible.
- All verified grids default to 20 rows per page and have first/previous/next/last controls and a page-size selector. The implementation presents this same grid rhythm.
- Action colours observed: search/save/import orange; add green; cancel/error red; links and information blue.
- The recording shows top-right dismissible red/pink notification panels for validation and successful work. The replica presents equivalent dismissible notifications.

## Functional specification and field dictionary

| Screen | Verified fields/actions | Verified business rules / visible outcome |
| --- | --- | --- |
| User Enquiry | User Name, First Name, Last Name, Status, Email, User Type; Search, Reset, Advance Search, Import, Export, Add New | Empty result state uses `No records to view`; User Type defaults to `Normal`. Search/filter and CSV export are implemented. Import file format and result workflow are unverified. |
| User Create/Edit | User Name*, First Name*, Middle Name, Last Name*, Title*, Designation, Date Of Birth, Status, User Type*, Purchase Order Limit, MFA checkbox, View/Update UDF; Contact Details; Company, Location, Role Desc; Add/Remove; Audit, Save, Reset Password, Reset MFA, Add New | Required label asterisks and role assignment layout are verified. Save requires User Name, First Name, Last Name, Title. Contact-field contents, password/MFA reset outcomes, audit dialog contents, date constraints, and UDF semantics are unverified. |
| Role Create/Edit | Role Id, Role Type*, Description*, Is Active; Search, Reset, Save, Audit, Add New; Roles and Process Mapping tabs | Role grid columns are Role Id, Role Type, Description, Is Active; seen role types include Enterprise and Company. Role Type and Description are required. Process Mapping body was not shown. |
| Order Import | Import Type default `Normal Order Import`, Upload Template, Download Template, Import Batch No, Import, Reset, Success/Failure tabs | `Max 1000 rows can be imported in an attempt of Import.` Deprecation notice directs the user to Common Import > Order Import. Parser, template structure, status transitions, row-level errors and downstream order creation were not demonstrated. |
| Common Import | Import, Download, File Detail tabs; Import Type; Upload Template; Import and Reset | The long import-type picker is verified, including BulkReturnClose, Create_UpdateMerchHierarchy, POSTSUPDATE, BulkUnkit, Amazon_Order_Import, STOImport, Customer Master Import, PutawayImport, OrderImport and others visible in the recording. Download/File Detail content was not shown. |
| Exports | Pending Report grid: Report ID, Status, Report Request Date, Report Names, Report Complete Date, Download, Error Msg | Only last 20 generated reports can be downloaded; Force Pull is enabled after 300 seconds. Export request creation and a completed report record were not shown. |
| Force Order Pull | Location picker, Add WH/HO checkbox, Order Number, Save, Reset | Location is mandatory. Order Number accepts comma-separated values; maximum 20 order numbers. Valid submission shows `Orders Pulled Successfully`. These rules are enforced by the API. |
| Settings | Navigation/tab opens | No settings controls were visible after loading. No fields, write action or data contract has been invented. |
| Manage Api | API Key, API Owner, Created Date, Expiry Date, Status, edit; Add, Refresh, Register Webhook. Editor: Timezone, Bill to Party, Mask Status, Allowed IPs, isMonitor, API Type, API Name, API Category, API URL, Access Rights, Key For Vin Lister; Save/Cancel; API permission grid | Keys are masked in the grid. Visible permission API names include Create Return, Create Return Cancel, Customer Detail, Order Cancellation, Order Create, Order Line Level Cancellation, Order Status Update and Return Update. Delete prompts for confirmation. Webhook registration, expiry generation and allowed-IP format are unverified. |
| API Dashboard | coloured metric cards, Top APIs by Hits doughnut, Hits By Servers doughnut, Hits By Time line chart, Response Message doughnut | Charts and labels are visible; their source aggregation, filters, refresh interval, chart drill-down, and retention are unverified. |

## Permission matrix

The recording is one authenticated administrator session. It proves that the session can see the Admin navigation and perform visible actions, but it does not prove role restrictions for other roles.

| Capability | Admin session | Other roles |
| --- | --- | --- |
| View Admin navigation and grids | Verified | Unverified |
| Create/edit users and roles | Controls verified | Unverified |
| Upload import file / trigger import | Controls verified | Unverified |
| Force order pull | Verified | Unverified |
| Create/edit/delete API key permissions | Controls and confirmation verified | Unverified |
| Audit views, password reset, MFA reset, webhook registration | Entry controls verified | Unverified |

## Backend architecture and API contract

`api/admin.js` stores Admin entities independently in `admin_records`, with typed documents: `user`, `role`, `import`, `force-pull`, `api-key`, and append-only `audit`. The Mongo/in-memory adapter assigns numeric identifiers. All write actions add an audit record with actor `demo-admin`, timestamp, entity and event. This actor is a local development placeholder; production authentication identity integration is unverified by the recording.

| HTTP endpoint | Request | Response / validation |
| --- | --- | --- |
| `GET /api/admin?type=user\|role\|import\|api-key` | typed collection query | typed records, newest first; API keys are masked |
| `POST /api/admin` | `{type, ...entity}` | 201 on persisted entity; 422 required fields; 409 duplicate user name |
| `PUT /api/admin` | `{id, type, version, ...changes}` | 200 update; stale version returns 409 |
| `DELETE /api/admin` | `{id, type}` | 200 after delete and audit event |
| `POST /api/admin` with `action: force-pull` | `{location, orders, addWhHo}` | 422 `Location is Mandatory`, required orders, or >20 orders; 201 with completed pull record |
| `GET /api/admin?action=dashboard` | none | recorded-style chart summary payload |

### Data model

```text
admin_records
  id: number
  type: user | role | import | force-pull | api-key | audit
  version: number (mutable entities)
  createdAt / updatedAt: ISO timestamp

user 1 --- * role assignment (embedded roles[])
api-key 1 --- * API permission (embedded permissions[])
audit * --- 1 user | role | import | force-pull | api-key
```

The embedded structures preserve atomic records in the supplied single-collection store. Cross-service order synchronization, a relational production database schema, and true transactional order imports are not supported by the recording and remain unverified.

## Workflows and sequence diagrams

### Force Order Pull (verified)

```text
User -> UI: select location; enter one or more orders; optional Add WH/HO
UI -> API: POST action=force-pull
API -> API: reject missing location / missing orders / over 20 orders
API -> Store: persist completed pull + audit event
API -> UI: 201 completed pull
UI -> User: Orders Pulled Successfully notification
```

### User / role lifecycle (partially verified)

```text
Enquiry -> Create/Edit -> required-field validation -> Save -> persisted user/role -> audit event
                       \-> validation notification
```

Edit loading, deactivation semantics, reset outcomes, and role-to-menu authorization propagation were not demonstrated.

## Acceptance criteria and test matrix

| Check | Expected result | Status |
| --- | --- | --- |
| Navigate each verified Admin menu item | Dedicated legacy-style screen opens | Implemented |
| User create with missing required values | Validation message; no persistence | Implemented API validation |
| Duplicate user name | HTTP 409 | Implemented API validation |
| Role save without type/description | HTTP 422 | Implemented API validation |
| Order/Common import without type or file | Validation message | Implemented UI/API validation |
| Import actual spreadsheet parsing | No claim | Unverified |
| Force Pull without location | `Location is Mandatory`, HTTP 422 | API tested |
| Force Pull valid location + two orders | HTTP 201, audit record | API tested |
| Force Pull 21 orders | HTTP 422 | Implemented; not manually exercised |
| Manage API CRUD and confirmation | Persists masking/edit/delete behaviour | Implemented; UI runtime review pending |
| TypeScript | `npm run typecheck` | Passed |
| Production bundle | `npm run build` | Passed; bundle-size warning remains |

## Deployment considerations

- Configure `MONGODB_URI` and `MONGODB_DB` before multi-instance deployment; without them the adapter intentionally uses per-process in-memory data.
- Put API key secrets in a dedicated secret manager and persist only a display mask. The current recording-driven replica masks keys when reading the list but does not claim an enterprise secret-vault contract.
- Connect the authenticated principal to audit actor and enforce server-side permissions before exposing Admin routes beyond this replica.
- Use a durable asynchronous import worker, virus scanning, file-size limits, template versioning, idempotency keys, and row-level result storage only after their expected behaviour is verified; the recording does not establish these contracts.
