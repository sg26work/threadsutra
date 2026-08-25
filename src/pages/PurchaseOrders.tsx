import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search as SearchIcon, X } from "lucide-react";
import PageHeader from "../components/PageHeader";
import DataTable, { Col } from "../components/DataTable";
import Modal from "../components/Modal";
import StatusBadge from "../components/StatusBadge";
import { apiGet, apiSend, money } from "../lib/api";

const PO_TYPES = ["CIF", "Outright-Direct Inbound", "Outright", "ARS", "FNV", "Consignment", "Blanket", "SOR", "Aggregate"];
const PO_MODES = ["ARS", "Auto", "BackOrder", "BackOrder/new", "DirectInbound", "Manual", "System"];
const PAGE_SIZES = [20, 50, 100, 200];
const emptyFilters = { poCode: "", poRevisionCode: "", poRevisionDate: "", poDate: "", vendorCode: "", poType: [] as string[], deliveryLocation: "", poReleaseDate: "", createdBy: "", createdDate: "", updatedBy: "", updatedDate: "", fromPORevisionCode: "", toPORevisionCode: "", poMode: "", fromPOCode: "", toPOCode: "", sourceLocation: "" };

type RevisionRow = { id: number; poCode: string; poRevisionCode: string; buyerName: string; poRevisionDate: string; status: string; poDate: string; vendorCode: string; vendorName: string; poType: string; poMode: string; poAmount: number; deliveryLocation: string; sourceLocation: string; poReleaseDate: string; createdBy: string; createdDate: string; modifiedBy: string; modifiedDate: string };
type SearchResponse = { rows: RevisionRow[]; total: number; page: number; records: number };

export default function PurchaseOrders() {
  const [filters, setFilters] = useState(emptyFilters);
  const [rows, setRows] = useState<RevisionRow[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [sourceLocations, setSourceLocations] = useState<string[]>([]);
  const [searched, setSearched] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [vendorPicker, setVendorPicker] = useState(false);
  const [vendorQuery, setVendorQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [records, setRecords] = useState(0);

  useEffect(() => {
    apiGet<any[]>("/api/vendors").then(setVendors).catch(() => setVendors([]));
    apiGet<any[]>("/api/purchase-orders").then((data) => {
      setLocations(Array.from(new Set(data.map((row) => String(row.warehouse || row.delivery_location || "")).filter(Boolean))).sort());
      setSourceLocations(Array.from(new Set(data.map((row) => String(row.source_location || "")).filter(Boolean))).sort());
    }).catch(() => { setLocations([]); setSourceLocations([]); });
  }, []);

  const search = async (nextPage = 1, nextSize = pageSize) => {
    setLoading(true); setError(""); setSearched(true);
    try {
      const result = await apiSend<SearchResponse>("/api/po-revision", "POST", {
        rows: nextSize, page: nextPage, sidx: "id.POCode", sord: "asc", REQ_SEARCH_FLAG: true,
        "id.POCode": filters.poCode, "id.PORevCode": filters.poRevisionCode, poRevisionDate: filters.poRevisionDate,
        podate: filters.poDate, vendorCode: filters.vendorCode, POType: filters.poType, delLocationCode: filters.deliveryLocation,
        POReleasedate: filters.poReleaseDate, createdBy: filters.createdBy, createdDate: filters.createdDate, updatedBy: filters.updatedBy, updatedDate: filters.updatedDate,
        fromPORevisionCode: filters.fromPORevisionCode, toPORevisionCode: filters.toPORevisionCode,
        poMode: filters.poMode, fromPOCode: filters.fromPOCode, toPOCode: filters.toPOCode, sourceLocation: filters.sourceLocation,
      });
      setRows(result.rows); setTotalPages(result.total); setPage(result.page); setRecords(result.records);
    } catch (cause) {
      setRows([]); setTotalPages(0); setRecords(0); setError(cause instanceof Error ? cause.message : "Unable to search PO revisions");
    } finally { setLoading(false); }
  };

  const reset = () => { setFilters(emptyFilters); setRows([]); setSearched(false); setAdvanced(false); setError(""); setPage(1); setPageSize(20); setTotalPages(0); setRecords(0); };
  const set = (key: keyof typeof emptyFilters, value: string | string[]) => setFilters((current) => ({ ...current, [key]: value }));
  const visibleVendors = useMemo(() => vendors.filter((vendor) => `${vendor.vendor_code || vendor.code || ""} ${vendor.vendor_name || vendor.name || ""}`.toLowerCase().includes(vendorQuery.toLowerCase())), [vendors, vendorQuery]);
  const first = records ? (page - 1) * pageSize + 1 : 0;
  const last = Math.min(page * pageSize, records);

  const cols: Col<RevisionRow>[] = [
    { key: "poCode", label: "PO Code", render: (row) => <span className="font-medium text-[#2f7fb6]">{row.poCode}</span> },
    { key: "poRevisionCode", label: "PO Revision Code" }, { key: "buyerName", label: "Buyer Name" },
    { key: "poRevisionDate", label: "PO Revision Date" }, { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> },
    { key: "poDate", label: "PO Date" }, { key: "vendorCode", label: "Vendor Code" }, { key: "vendorName", label: "Vendor Name" },
    { key: "poType", label: "PO Type" }, { key: "poAmount", label: "PO Amount", render: (row) => money(row.poAmount) },
    { key: "deliveryLocation", label: "Delivery Location" }, { key: "poReleaseDate", label: "PO Release Date" },
    { key: "createdBy", label: "Created By" }, { key: "createdDate", label: "Created Date" }, { key: "modifiedBy", label: "Modified By" }, { key: "modifiedDate", label: "Modified Date" },
  ];

  return <div>
    <PageHeader title="PO Revision" breadcrumb="Procurement / PO Revision" actions={null} />
    <section className="mb-4 rounded-lg border border-slate-200 bg-white p-3" aria-label="PO Revision search">
      <div className="grid gap-2 md:grid-cols-4">
        <label className="lbl">PO Code<input id="gs_poCode" className="inp mt-1" value={filters.poCode} onChange={(e) => set("poCode", e.target.value)} /></label>
        <label className="lbl">PO Revision Code<input id="gs_poRevisionCode" className="inp mt-1" value={filters.poRevisionCode} onChange={(e) => set("poRevisionCode", e.target.value)} /></label>
        <label className="lbl">PO Revision Date<input id="gs_poRevisionDate" type="date" className="inp mt-1" value={filters.poRevisionDate} onChange={(e) => set("poRevisionDate", e.target.value)} /></label>
        <label className="lbl">PO Date<input id="gs_poDate" type="date" className="inp mt-1" value={filters.poDate} onChange={(e) => set("poDate", e.target.value)} /></label>
        <label className="lbl">Vendor Code<div className="mt-1 flex"><input id="gs_vendorCode" className="inp rounded-r-none" value={filters.vendorCode} onChange={(e) => set("vendorCode", e.target.value)} /><button type="button" aria-label="Open vendor picker" onClick={() => setVendorPicker(true)} className="rounded-r border border-l-0 border-slate-300 px-2 text-[#2f7fb6]"><SearchIcon size={15}/></button></div></label>
        <label className="lbl">PO Type<select id="gs_poType" multiple className="inp mt-1 h-20" value={filters.poType} onChange={(e) => set("poType", Array.from(e.target.selectedOptions, (option) => option.value))}>{PO_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label>
        <label className="lbl">Delivery Location<select id="gs_deliveryLocation" className="inp mt-1" value={filters.deliveryLocation} onChange={(e) => set("deliveryLocation", e.target.value)}><option value="">--- Select ---</option>{locations.map((location) => <option key={location}>{location}</option>)}</select></label>
        <label className="lbl">PO Release Date<input id="gs_poReleaseDate" type="date" className="inp mt-1" value={filters.poReleaseDate} onChange={(e) => set("poReleaseDate", e.target.value)} /></label>
        <label className="lbl">Created By<input id="gs_createdBy" className="inp mt-1" value={filters.createdBy} onChange={(e) => set("createdBy", e.target.value)} /></label>
        <label className="lbl">Created Date<input id="gs_createdDate" type="date" className="inp mt-1" value={filters.createdDate} onChange={(e) => set("createdDate", e.target.value)} /></label>
        <label className="lbl">Updated By<input id="gs_updatedBy" className="inp mt-1" value={filters.updatedBy} onChange={(e) => set("updatedBy", e.target.value)} /></label>
        <label className="lbl">Updated Date<input id="gs_updatedDate" type="date" className="inp mt-1" value={filters.updatedDate} onChange={(e) => set("updatedDate", e.target.value)} /></label>
      </div>
      {advanced && <div className="mt-3 grid gap-2 border-t border-slate-100 pt-3 md:grid-cols-4">
        <label className="lbl">From PO Revision Code<input className="inp mt-1" value={filters.fromPORevisionCode} onChange={(e) => set("fromPORevisionCode", e.target.value)} /></label>
        <label className="lbl">To PO Revision Code<input className="inp mt-1" value={filters.toPORevisionCode} onChange={(e) => set("toPORevisionCode", e.target.value)} /></label>
        <label className="lbl">PO Mode<select className="inp mt-1" value={filters.poMode} onChange={(e) => set("poMode", e.target.value)}><option value="">--- Select ---</option>{PO_MODES.map((mode) => <option key={mode}>{mode}</option>)}</select></label>
        <label className="lbl">From PO Code<input className="inp mt-1" value={filters.fromPOCode} onChange={(e) => set("fromPOCode", e.target.value)} /></label>
        <label className="lbl">To PO Code<input className="inp mt-1" value={filters.toPOCode} onChange={(e) => set("toPOCode", e.target.value)} /></label>
        <label className="lbl">Source Location<select className="inp mt-1" value={filters.sourceLocation} onChange={(e) => set("sourceLocation", e.target.value)}><option value="">--- Select ---</option>{sourceLocations.map((location) => <option key={location}>{location}</option>)}</select></label>
        <label className="lbl">Vendor Code<div className="mt-1 flex"><input className="inp rounded-r-none" value={filters.vendorCode} onChange={(e) => set("vendorCode", e.target.value)} /><button type="button" aria-label="Open advanced vendor picker" onClick={() => setVendorPicker(true)} className="rounded-r border border-l-0 border-slate-300 px-2 text-[#2f7fb6]">...</button></div></label>
      </div>}
      <div className="mt-3 flex items-center gap-2"><button id="SearchBtn" onClick={() => search(1)} className="rounded bg-amber-500 px-3 py-1.5 text-xs font-medium text-white">Search</button><button onClick={() => setAdvanced((value) => !value)} className="rounded border border-slate-300 px-3 py-1.5 text-xs">Advanced Search</button><button onClick={reset} className="rounded border border-slate-300 px-3 py-1.5 text-xs">Reset</button></div>
    </section>
    {error && <div role="alert" className="mb-3 flex items-center justify-between rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"><span>{error}</span><button onClick={() => setError("")} aria-label="Dismiss error"><X size={15}/></button></div>}
    <DataTable cols={cols} rows={rows} loading={loading} empty={searched ? "No records to view" : "Search to view PO revisions"} />
    <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
      <span>{records ? `View ${first} - ${last} of ${records}` : "No records to view"}</span>
      <div className="flex items-center gap-2"><label>Records per Page <select aria-label="Records per Page" value={pageSize} onChange={(e) => { const size = Number(e.target.value); setPageSize(size); if (searched) void search(1, size); }} className="ml-1 rounded border border-slate-300 px-2 py-1">{PAGE_SIZES.map((size) => <option key={size}>{size}</option>)}</select></label><button aria-label="Previous page" disabled={!searched || loading || page <= 1} onClick={() => search(page - 1)} className="rounded border p-1 disabled:opacity-40"><ChevronLeft size={15}/></button><span>Page {totalPages ? page : 0} of {totalPages}</span><button aria-label="Next page" disabled={!searched || loading || page >= totalPages} onClick={() => search(page + 1)} className="rounded border p-1 disabled:opacity-40"><ChevronRight size={15}/></button></div>
    </div>
    <Modal title="Vendor Picker" open={vendorPicker} onClose={() => setVendorPicker(false)}><input autoFocus aria-label="Search vendors" placeholder="Search vendor code or name" className="inp mb-3" value={vendorQuery} onChange={(e) => setVendorQuery(e.target.value)} /><div className="max-h-80 overflow-auto rounded border">{visibleVendors.length ? visibleVendors.map((vendor) => { const code = vendor.vendor_code || vendor.code || ""; const name = vendor.vendor_name || vendor.name || ""; return <button type="button" key={vendor.id || code} onClick={() => { set("vendorCode", code); setVendorPicker(false); setVendorQuery(""); }} className="block w-full border-b px-3 py-2 text-left text-sm hover:bg-slate-50"><span className="font-medium text-[#2f7fb6]">{code}</span><span className="ml-2 text-slate-600">{name}</span></button>; }) : <p className="p-5 text-center text-sm text-slate-400">No vendors found</p>}</div></Modal>
  </div>;
}
