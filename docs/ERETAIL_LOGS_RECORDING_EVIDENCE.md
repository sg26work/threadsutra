# eRetail Logs module: recording evidence boundary

## Authority

The supplied authenticated eRetail recording is the sole source of truth for this module. It was reviewed across its full 299.5-second duration, including the initial Admin flyout and the subsequent User Management, Imports, Miscellaneous, Manage API, and API Dashboard workflows.

## Verified navigation only

At the Admin flyout, the following Log entries are visible under **Logs**:

```text
Admin > Logs
├── User Audit Logs
├── Accounting Log
├── Tax Integration Log
├── Device Tracking Log
├── External Apps Logs
├── POS Integration Log
└── Repush Log
```

## Not demonstrated

The recording does **not** select any Logs menu entry or display a log page. Therefore the following are not evidenced and must not be implemented as an exact replica from this recording:

- Route/breadcrumb after selecting each category.
- Grid columns, row data, status vocabulary, timestamps, log levels, transaction identifiers, user references, sort order, paging behaviour, and empty/loading states.
- Search, advanced filters, date selection, module/status/user filters, refresh, export, drill-down, trace views, retry controls, or history navigation.
- Dialogs, notifications, validation messages, error responses, role-based visibility, permission rules, or retention behaviour.
- Database entities, indexes, API payloads, immutable-audit semantics, request/response storage, integration retry rules, transactional boundaries, and performance-monitoring behaviour.

## Existing code status

The current destinations for these seven entries are schema-driven generic screens. They are not evidence-based Logs replicas and must not be presented as such. No implementation change was made in this pass, because replacing them with guessed grids, filters, backend contracts, or log data would violate the recording-only constraint.

## Required next evidence

Provide a recording that opens each log category and demonstrates its normal, filtered, empty/error, export, detail, and any retry/drill-down states. A valid follow-up implementation can then produce a requirement-to-evidence map, dedicated UI/API/data model, and test matrix for the observed workflows only.
