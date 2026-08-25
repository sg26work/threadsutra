# Admin replication evidence

## Source inventory

- `Vin eRetail _ Admin – Vinculum Product Guide.pdf` (9 pages) was inspected page by page.
- `new1.webm` (12.767 s), `new2.webm` (22.612 s), and `new3.webm` (30.304 s) were reviewed as time-sequenced frame sets, including every observed state transition.
- `new1` records Admin navigation and **User Enquiry**: initial empty grid, default `Normal` user type, Search, and the `View 1 - 19 of 197` result state.
- `new2` records **Audit Logs**: initial empty grid, Search, the Vendor/SKU maintenance records, and the filter controls.
- `new3` records **Manage Api**: inactive `sa` activation, `Successfully Activated!`, Settings, two access-right changes, Link To Store, `1mg` transfer to Linked Location, Save, and `Successfully saved!`.

## Admin inventory implemented

| Area | Evidence-backed implementation |
| --- | --- |
| User Management | User Enquiry filters, Advanced Search controls, Search/Reset/CSV Export, the initial empty state, recorded seed rows and pagination presentation; User Create/Edit and Role Create/Edit forms persist through `/api/admin`. |
| Audit Logs | Date, process group, key value, action, user, attribute filter row; Search/Reset; recorded columns and seed rows; CSV export. |
| Manage Api | API-key grid, activation, settings/right checkboxes, per-right allowed-location editor, Link To Store transfer controls, save/cancel, loading mask, success notifications, optimistic version conflict protection. |
| Import / utilities | Order Import, Common Import, Exports, Force Order Pull, Settings placeholder, and API Dashboard route are retained from the existing Admin module. |

## Documentation-to-video discrepancy matrix

| Item | Guide | Recording | Replica decision |
| --- | --- | --- | --- |
| User Enquiry first load | Guide says Search can populate users when blank. | `new1` begins empty and only populates after Search. | Recording wins: initial grid stays empty. |
| User count/page row count | No fixed count in guide. | `new1` shows `View 1 - 19 of 197`, page 1 of 10. | Recording presentation is preserved using the seeded visible rows and recorded count. |
| Audit date range | Guide describes preset/custom ranges up to 90 days. | `new2` only shows a Date filter cell, not a date-range UI. | Existing text Date filter is retained; no unsupported preset/range behavior is claimed. |
| API activation | Guide describes activation/deactivation generally. | `new3` activates inactive owner `sa` and displays `Successfully Activated!`. | Exact observed activation/toast behavior implemented. |
| API permissions | Guide describes rights and mapped locations. | `new3` demonstrates two rights, Link To Store, and `1mg` movement. | Recording workflow and seeded rights/location list implemented. |

## Data/API mapping

- `admin_records` stores typed documents: `user`, `role`, `import`, `force-pull`, `api-key`, and `audit`.
- `GET /api/admin?type=…` lists typed records.
- `POST /api/admin` creates users, roles, imports, API keys, or a Force Order Pull (`action=force-pull`).
- `PUT /api/admin` persists API status, permission, and location changes with a `version` conflict check.
- `GET /api/admin?action=dashboard` supplies dashboard aggregates.
- Admin mutations append a typed Admin audit record.

## Implemented validations and states

- User creation: Username, First Name, Last Name, and Title required; username unique.
- Role creation: Role Type and Description required.
- Import: Import Type and template filename required.
- API key creation: API Key, API Owner, and Expiry Date required; API key unique.
- Force Order Pull: Location and order number required; a maximum of 20 comma-separated order numbers.
- API key activation changes `Inactive` to `Active`; settings changes persist permission access and linked locations.

## Verification record

- `npm run typecheck` — passed.
- `npm run build` — passed. Vite warns that Node 20.14.0 is below its recommended 20.19.0 and reports the pre-existing large bundle warning.
- `node scripts/verify-admin-api.mjs` — passed 12 assertions against the updated local API server.
- Targeted ESLint still reports the pre-existing `react-hooks/set-state-in-effect` warning/error in `RecordedManageApi`'s original load effect. It is not caused by the Admin patch.
- Browser replay automation was not runnable because no Chrome DevTools debug session was available on port 9222. The page source and recorded workflows were inspected, but browser replay is deliberately not claimed as executed.

## Scope boundary

Master SKU and every unrelated module remain outside this Admin change set and were not edited.
