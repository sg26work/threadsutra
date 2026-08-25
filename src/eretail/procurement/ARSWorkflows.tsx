/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Download,
  FileUp,
  History,
  Play,
  Plus,
  RotateCcw,
  Search,
  Settings,
  Trash2,
  X,
} from "lucide-react";
import Shell from "../Shell";
import Modal from "../../components/Modal";
import { Btn, Toast } from "../parts";
import { apiGet, apiSend } from "../../lib/api";
import { useDownload } from "../../context/DownloadContext";

type Notice = { msg: string; type: "ok" | "err" } | null;
const LOCATIONS = [
  "Delhi NCR",
  "Mumbai WH",
  "Bengaluru WH",
  "Kolkata WH",
  "UPSL Warehouse",
];
const LOCATION_TYPES = ["Franchise", "Store", "Warehouse"];
const FULFILMENT = ["Direct Store Purchase", "Distribution Centre"];
const ARS_STATUS = ["Pending", "Active", "Inactive", "Discontinued"];
const RULE_METHODS = ["Min-Max", "Sales History"];
const VENDOR_TYPES = ["Min Cost", "Min Lead Time", "Primary"];
const OUTPUT_TYPES = ["Confirmed", "Pending", "Report"];
const SKU_SET_TYPES = ["Brand", "Group", "Hierarchy", "SKU", "Vendor"];
const FREQUENCIES = [
  { v: "0", l: "Never" },
  { v: "1", l: "Hourly" },
  { v: "2", l: "Every 2 Hours" },
  { v: "24", l: "Daily" },
  { v: "168", l: "Weekly" },
  { v: "720", l: "Monthly" },
];
const cls =
  "w-full rounded-sm border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-600 outline-none focus:border-cyan-500";
const statusCls = (s: string) =>
  s === "Active" || s === "Completed" || s === "Confirmed"
    ? "bg-emerald-500"
    : s === "Pending"
      ? "bg-amber-500"
      : s === "Failed"
        ? "bg-rose-500"
        : "bg-slate-500";
const Status = ({ value }: { value: string }) => (
  <span
    className={`inline-block min-w-20 rounded-sm px-2 py-1 text-center text-[11px] font-semibold text-white ${statusCls(value)}`}
  >
    {value}
  </span>
);
const Th = ({ children }: { children?: React.ReactNode }) => (
  <th className="border-r border-slate-300 bg-[#e9edf1] px-2 py-2 text-left text-[11px] font-semibold text-slate-600">
    {children}
  </th>
);
const Td = ({ children }: { children?: React.ReactNode }) => (
  <td className="border-r border-t border-slate-200 px-2 py-2 align-top text-xs text-slate-600">
    {children}
  </td>
);
const Field = ({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) => (
  <label className="grid grid-cols-[135px_minmax(0,1fr)] items-center gap-2 text-xs text-slate-500">
    <span className="text-right">
      {label}
      {required && <b className="text-rose-500"> *</b>}
    </span>
    {children}
  </label>
);
const Bar = ({ children }: { children: React.ReactNode }) => (
  <div className="mb-2 flex flex-wrap justify-end gap-2">{children}</div>
);

function HierarchyPicker({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (v: string) => void;
}) {
  const nodes = [
    "Apparel",
    "Beauty",
    "Books",
    "Electronics",
    "Footwear",
    "Healthcare",
    "Home & Living",
    "media",
    "Sports",
    "Watches",
  ];
  const [value, setValue] = useState("");
  return (
    <Modal
      title="Merchandising Hierarchy Pick List"
      open={open}
      onClose={onClose}
    >
      <div className="max-h-72 overflow-auto border p-3">
        {nodes.map((n) => (
          <label key={n} className="block py-1 text-sm">
            <input
              type="radio"
              name="hierarchy"
              checked={value === n}
              onChange={() => setValue(n)}
            />{" "}
            ⊞ {n}
          </label>
        ))}
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Btn
          onClick={() => {
            if (value) onPick(value);
            onClose();
          }}
        >
          OK
        </Btn>
        <Btn variant="ghost" onClick={onClose}>
          Close
        </Btn>
      </div>
    </Modal>
  );
}

function LocationPicker({
  open,
  onClose,
  selected,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  selected: string[];
  onPick: (v: string[]) => void;
}) {
  const [values, setValues] = useState<string[]>(selected);
  useEffect(() => {
    if (open) setValues(selected);
  }, [open, selected]);
  const toggle = (location: string) =>
    setValues((current) =>
      current.includes(location)
        ? current.filter((x) => x !== location)
        : [...current, location],
    );
  return (
    <Modal title="Location Pick List" open={open} onClose={onClose} wide>
      <div className="grid grid-cols-2 gap-4 text-xs">
        <section className="border">
          <b className="block border-b bg-slate-100 p-2">
            Available Location ({LOCATIONS.length})
          </b>
          <div className="max-h-64 overflow-auto p-2">
            {LOCATIONS.map((location) => (
              <label key={location} className="block border-b py-2">
                <input
                  type="checkbox"
                  checked={values.includes(location)}
                  onChange={() => toggle(location)}
                />{" "}
                {location}
              </label>
            ))}
          </div>
        </section>
        <section className="border">
          <b className="block border-b bg-slate-100 p-2">
            Selected Location ({values.length})
          </b>
          <div className="max-h-64 overflow-auto p-2">
            {values.length ? (
              values.map((location) => (
                <div key={location} className="border-b py-2">
                  {location}
                </div>
              ))
            ) : (
              <p className="p-2 text-slate-400">No location selected.</p>
            )}
          </div>
        </section>
      </div>
      <p className="mt-2 text-right text-xs text-slate-500">
        Total selected: {values.length}
      </p>
      <div className="mt-3 flex justify-end gap-2">
        <Btn
          onClick={() => {
            onPick(values);
            onClose();
          }}
        >
          OK
        </Btn>
        <Btn variant="ghost" onClick={onClose}>
          Close
        </Btn>
      </div>
    </Modal>
  );
}

export function ARSSkuLocation() {
  const { requestDownload } = useDownload();
  const [rows, setRows] = useState<any[]>([]);
  const [skus, setSkus] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [records, setRecords] = useState(0);
  const [total, setTotal] = useState(0);
  const [searched, setSearched] = useState(false);
  const [show, setShow] = useState(false);
  const [bulk, setBulk] = useState(false);
  const [importing, setImporting] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [hierarchy, setHierarchy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [edit, setEdit] = useState<any>(null);
  const empty = {
    sku_code: "",
    location: "",
    location_type: "Warehouse",
    fulfilment_method: "Direct Store Purchase",
    fulfilment_wh: "",
    wh_lead_time: "",
    primary_vendor: "",
    stock_cover_days: "",
    ars_flag: "Active",
  };
  const [form, setForm] = useState(empty);
  const [filters, setFilters] = useState({
    location: "",
    location_type: "",
    sku_code: "",
    category: "",
    brand: "",
    primary_vendor: "",
    fulfilment_method: "",
    fulfilment_wh: "",
    wh_lead_time: "",
    stock_cover_days: "",
    ars_flag: "",
    sku_name: "",
    sku_location_tag: "",
    udf1: "",
    udf2: "",
  });
  const [bulkForm, setBulkForm] = useState({
    location_type: "",
    location: "",
    category: "",
    sku_group: "",
    primary_vendor: "",
    brand: "",
    sku_code: "",
    ars_flag: "",
    stock_cover_days: "",
    fulfilment_method: "",
    fulfilment_wh: "",
    wh_lead_time: "",
  });
  const loadMasters = () => {
    Promise.all([apiGet<any[]>("/api/skus"), apiGet<any[]>("/api/vendors")])
      .then(([skuRows, vendorRows]) => {
        setSkus(skuRows);
        setVendors(vendorRows);
      })
      .catch((e) => setNotice({ msg: e.message, type: "err" }))
  };
  useEffect(() => {
    void loadMasters();
  }, []);
  const search = async (nextPage = 1, nextSize = pageSize) => {
    setLoading(true); setNotice(null);
    try {
      const result = await apiSend<any>("/api/ars", "POST", { entity: "links", rows: nextSize, page: nextPage, sidx: "", sord: "asc", clientId: "0", location: filters.location, locationTypeId: filters.location_type, skuCode: filters.sku_code, skuName: filters.sku_name, category: filters.category, brand: filters.brand, primaryVendor: filters.primary_vendor, fullFillmentMethod: filters.fulfilment_method, fullFillmentWH: filters.fulfilment_wh, whLeadTime: filters.wh_lead_time, stockCoverDays: filters.stock_cover_days, arsFlag: filters.ars_flag, skuLocationTag: filters.sku_location_tag, udf1: filters.udf1, udf2: filters.udf2, REQ_SEARCH_FLAG: true });
      setRows(result.gridModel || result.rows || []); setPage(result.page); setTotal(result.total); setRecords(result.records); setPageSize(nextSize); setSearched(true);
    } catch (error: any) { setRows([]); setNotice({ msg: error.message, type: "err" }); }
    finally { setLoading(false); }
  };
  const reset = () => {
    setFilters({
      location: "",
      location_type: "",
      sku_code: "",
      category: "",
      brand: "",
      primary_vendor: "",
      fulfilment_method: "",
      fulfilment_wh: "",
      wh_lead_time: "",
      stock_cover_days: "",
      ars_flag: "",
      sku_name: "",
      sku_location_tag: "",
      udf1: "",
      udf2: "",
    });
    setRows([]); setPage(1); setPageSize(20); setRecords(0); setTotal(0); setSearched(false); setAdvanced(false); setNotice(null);
  };
  const openNew = () => {
    setEdit(null);
    setForm(empty);
    setShow(true);
  };
  const save = async () => {
    try {
      if (edit)
        await apiSend("/api/ars", "PUT", {
          entity: "links",
          id: edit.id,
          ...form,
        });
      else
        await apiSend("/api/ars?entity=links", "POST", {
          entity: "links",
          ...form,
        });
      setNotice({
        msg: "ARS SKU-Location Link saved successfully.",
        type: "ok",
      });
      setShow(false);
      if (searched) void search(1); else setRows([]);
    } catch (e: any) {
      setNotice({ msg: e.message, type: "err" });
    }
  };
  const bulkUpdate = async () => {
    const match: any = {};
    const fields: any = {};
    [
      "location_type",
      "location",
      "category",
      "sku_group",
      "primary_vendor",
      "brand",
      "sku_code",
    ].forEach((k) => {
      if ((bulkForm as any)[k]) match[k] = (bulkForm as any)[k];
    });
    [
      "ars_flag",
      "stock_cover_days",
      "fulfilment_method",
      "fulfilment_wh",
      "wh_lead_time",
    ].forEach((k) => {
      if ((bulkForm as any)[k] !== "") fields[k] = (bulkForm as any)[k];
    });
    try {
      const changed: any[] = await apiSend("/api/ars", "PUT", {
        entity: "links",
        action: "bulk-update",
        filters: match,
        fields,
      });
      setNotice({
        msg: `${changed.length} ARS SKU-Location Link(s) updated.`,
        type: "ok",
      });
      setBulk(false);
      if (searched) void search(1); else setRows([]);
    } catch (e: any) {
      setNotice({ msg: e.message, type: "err" });
    }
  };
  const parseImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const lines = String(reader.result || "")
          .trim()
          .split(/\r?\n/);
        const headers =
          lines
            .shift()
            ?.split(",")
            .map((x) => x.trim()) || [];
        const data = lines.map((line) =>
          Object.fromEntries(
            line.split(",").map((v, i) => [headers[i], v.trim()]),
          ),
        );
        await apiSend("/api/ars?entity=links", "POST", {
          entity: "links",
          action: "import",
          rows: data,
        });
        setNotice({
          msg: `${data.length} link(s) imported successfully.`,
          type: "ok",
        });
        setImporting(false);
        if (searched) void search(1); else setRows([]);
      } catch (e: any) {
        setNotice({ msg: e.message, type: "err" });
      }
    };
    reader.readAsText(file);
  };
  const exportRows = () =>
    requestDownload({
      title: "ARS SKU-Location Link",
      module: "ars-sku-location",
      baseName: "ars-sku-location",
      data: {
        columns: [
          "Location",
          "Location Type",
          "SKU",
          "SKU Name",
          "Category",
          "Brand",
          "Primary Vendor",
          "Fulfilment Method",
          "Fulfilment WH",
          "WH Lead Time",
          "Stock Cover",
          "ARS Flag",
        ],
        rows: rows.map((r) => [
          r.location,
          r.location_type,
          r.sku_code,
          r.sku_name,
          r.category,
          r.brand,
          r.primary_vendor,
          r.fulfilment_method,
          r.fulfilment_wh,
          r.wh_lead_time,
          r.stock_cover_days,
          r.ars_flag,
        ]),
      },
    });
  return (
    <Shell
      active="procurement"
      breadcrumb="Procurement > ARS > ARS SKU-Location Link"
      openScreens={[{ label: "ARS SKU-Location Link", to: "#" }]}
    >
      <Bar>
        <Btn variant="warn" onClick={() => void search(1)}>
          <Search size={13} />
          Search
        </Btn>
        <Btn variant="ghost" onClick={exportRows}>
          <Download size={13} />
          Download
        </Btn>
        <Btn variant="ghost" onClick={() => setImporting(true)}>
          <FileUp size={13} />
          Bulk Import
        </Btn>
        <Btn variant="ghost" onClick={reset}>
          <RotateCcw size={13} />
          Reset
        </Btn>
        <Btn variant="ghost" onClick={() => setAdvanced(!advanced)}>
          Advance Search
        </Btn>
        <Btn variant="ghost" onClick={openNew}>
          <Plus size={13} />
          Add New
        </Btn>
        <Btn variant="ghost" onClick={() => setBulk(true)}>
          Bulk Update
        </Btn>
      </Bar>
      <div className="overflow-auto border border-slate-300 bg-white">
        <table className="min-w-[1500px] w-full">
          <thead>
            <tr>
              {[
                "Location *",
                "Location Type",
                "SKU",
                "SKU Name",
                "Category",
                "Brand",
                "Primary Vendor",
                "Fulfilment Method",
                "Fulfilment WH",
                "WH Lead Time",
                "Stock Cover",
                "ARS Flag",
                "SKU Location Tag",
                "UDF1",
                "UDF2",
                "",
              ].map((x) => (
                <Th key={x}>{x}</Th>
              ))}
            </tr>
            <tr>
              {Object.keys(filters)
                .filter((k) => advanced || k !== "sku_code")
                .map((k) => (
                  <th key={k} className="border-r border-t p-1">
                    {k === "category" ? (
                      <button
                        className={`${cls} text-left`}
                        onClick={() => setHierarchy(true)}
                      >
                        {filters.category || "Select..."}
                      </button>
                    ) : k === "location" ? (
                      <select
                        className={cls}
                        value={filters.location}
                        onChange={(e) =>
                          setFilters({ ...filters, location: e.target.value })
                        }
                      >
                        <option value="">-- Select --</option>
                        {LOCATIONS.map((x) => (
                          <option key={x}>{x}</option>
                        ))}
                      </select>
                    ) : k === "ars_flag" ? (
                      <select
                        className={cls}
                        value={filters.ars_flag}
                        onChange={(e) =>
                          setFilters({ ...filters, ars_flag: e.target.value })
                        }
                      >
                        <option value="">-- Select --</option>
                        <option>Active</option>
                        <option>Inactive</option>
                      </select>
                    ) : (
                      <input
                        className={cls}
                        value={(filters as any)[k]}
                        onChange={(e) =>
                          setFilters({ ...filters, [k]: e.target.value })
                        }
                      />
                    )}
                  </th>
                ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <Td>Loading ARS links…</Td>
              </tr>
            ) : rows.length ? (
              rows.map((r) => (
                <tr key={r.id}>
                  <Td>{r.location}</Td>
                  <Td>{r.location_type}</Td>
                  <Td>
                    <b>{r.sku_code}</b>
                  </Td>
                  <Td>{r.sku_name}</Td>
                  <Td>{r.category}</Td>
                  <Td>{r.brand}</Td>
                  <Td>{r.primary_vendor}</Td>
                  <Td>{r.fulfilment_method}</Td>
                  <Td>{r.fulfilment_wh}</Td>
                  <Td>{r.wh_lead_time}</Td>
                  <Td>{r.stock_cover_days}</Td>
                  <Td>
                    <Status value={r.ars_flag} />
                  </Td>
                  <Td>{r.sku_location_tag}</Td>
                  <Td>{r.udf1}</Td>
                  <Td>{r.udf2}</Td>
                  <Td>
                    <button
                      onClick={() => {
                        setEdit(r);
                        setForm({ ...empty, ...r });
                        setShow(true);
                      }}
                      className="text-amber-500"
                    >
                      ✎
                    </button>
                  </Td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={16} className="p-8 text-center text-xs text-slate-400">No records to view</td></tr>
            )}
          </tbody>
        </table>
        <div className="border-t p-2 text-right text-[11px] text-slate-500">
          <span>Page {records ? page : 0} of {total}</span>{" "}
          <select aria-label="Records per Page" value={pageSize} onChange={(event) => { const size = Number(event.target.value); setPageSize(size); if (searched) void search(1, size); }}>{[20, 50, 100, 200].map((size) => <option key={size}>{size}</option>)}</select>{" "}
          <button aria-label="Previous page" disabled={!searched || page <= 1} onClick={() => void search(page - 1)}>Previous</button>{" "}
          <button aria-label="Next page" disabled={!total || page >= total} onClick={() => void search(page + 1)}>Next</button>{" "}
          {records ? `View ${(page - 1) * pageSize + 1} - ${Math.min(page * pageSize, records)} of ${records}` : "No records to view"}
        </div>
      </div>
      <HierarchyPicker
        open={hierarchy}
        onClose={() => setHierarchy(false)}
        onPick={(v) => setFilters({ ...filters, category: v })}
      />
      <Modal
        title="Create/Update ARS Sku-Location"
        open={show}
        onClose={() => setShow(false)}
      >
        <div className="grid gap-3">
          <Field label="SKU" required>
            <select
              className={cls}
              value={form.sku_code}
              disabled={!!edit}
              onChange={(e) => setForm({ ...form, sku_code: e.target.value })}
            >
              <option value="">-- Select --</option>
              {skus.map((s) => (
                <option key={s.id} value={s.sku_code}>
                  {s.sku_code} — {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="SKU Name">
            <input
              className={`${cls} bg-slate-100`}
              disabled
              value={
                skus.find((s) => s.sku_code === form.sku_code)?.name ||
                edit?.sku_name ||
                ""
              }
            />
          </Field>
          <Field label="Location" required>
            <select
              className={cls}
              value={form.location}
              disabled={!!edit}
              onChange={(e) =>
                setForm({
                  ...form,
                  location: e.target.value,
                  fulfilment_wh: e.target.value,
                })
              }
            >
              <option value="">-- Select --</option>
              {LOCATIONS.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          <Field label="Fulfilment Method">
            <select
              className={cls}
              value={form.fulfilment_method}
              onChange={(e) =>
                setForm({ ...form, fulfilment_method: e.target.value })
              }
            >
              {FULFILMENT.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          <Field label="Fulfilment WH">
            <select
              className={cls}
              value={form.fulfilment_wh}
              onChange={(e) =>
                setForm({ ...form, fulfilment_wh: e.target.value })
              }
            >
              <option value="">-- Select --</option>
              {LOCATIONS.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          <Field label="WH Lead Time(In Days)">
            <input
              type="number"
              min="0"
              className={cls}
              value={form.wh_lead_time}
              onChange={(e) =>
                setForm({ ...form, wh_lead_time: e.target.value })
              }
            />
          </Field>
          <Field label="Primary Vendor">
            <select
              className={cls}
              value={form.primary_vendor}
              onChange={(e) =>
                setForm({ ...form, primary_vendor: e.target.value })
              }
            >
              <option value="">-- Select --</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.vendor_code}>
                  {v.vendor_code} — {v.vendor_name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Stock Cover Days">
            <input
              type="number"
              min="0"
              className={cls}
              value={form.stock_cover_days}
              onChange={(e) =>
                setForm({ ...form, stock_cover_days: e.target.value })
              }
            />
          </Field>
          <Field label="ARS Flag" required>
            <select
              className={cls}
              value={form.ars_flag}
              onChange={(e) => setForm({ ...form, ars_flag: e.target.value })}
            >
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </Field>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Btn onClick={save}>Save</Btn>
          <Btn variant="ghost" onClick={() => setShow(false)}>
            Close
          </Btn>
        </div>
      </Modal>
      <Modal
        title="Bulk Update ARS SKU-Location"
        open={bulk}
        onClose={() => setBulk(false)}
        wide
      >
        <p className="mb-2 text-xs text-slate-500">
          Select matching criteria, then enter only the fields that should
          change.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Location Type">
            <select
              className={cls}
              value={bulkForm.location_type}
              onChange={(e) =>
                setBulkForm({ ...bulkForm, location_type: e.target.value })
              }
            >
              <option value="">All</option>
              {LOCATION_TYPES.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          <Field label="Location">
            <select
              className={cls}
              value={bulkForm.location}
              onChange={(e) =>
                setBulkForm({ ...bulkForm, location: e.target.value })
              }
            >
              <option value="">All</option>
              {LOCATIONS.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          <Field label="Category">
            <input
              className={cls}
              value={bulkForm.category}
              onChange={(e) =>
                setBulkForm({ ...bulkForm, category: e.target.value })
              }
            />
          </Field>
          <Field label="SKU Group">
            <input
              className={cls}
              value={bulkForm.sku_group}
              onChange={(e) =>
                setBulkForm({ ...bulkForm, sku_group: e.target.value })
              }
            />
          </Field>
          <Field label="Vendor">
            <input
              className={cls}
              value={bulkForm.primary_vendor}
              onChange={(e) =>
                setBulkForm({ ...bulkForm, primary_vendor: e.target.value })
              }
            />
          </Field>
          <Field label="Brand">
            <input
              className={cls}
              value={bulkForm.brand}
              onChange={(e) =>
                setBulkForm({ ...bulkForm, brand: e.target.value })
              }
            />
          </Field>
          <Field label="SKU">
            <input
              className={cls}
              value={bulkForm.sku_code}
              onChange={(e) =>
                setBulkForm({ ...bulkForm, sku_code: e.target.value })
              }
            />
          </Field>
          <hr className="col-span-2" />
          <Field label="ARS Flag">
            <select
              className={cls}
              value={bulkForm.ars_flag}
              onChange={(e) =>
                setBulkForm({ ...bulkForm, ars_flag: e.target.value })
              }
            >
              <option value="">No change</option>
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </Field>
          <Field label="Stock Cover Days">
            <input
              className={cls}
              type="number"
              value={bulkForm.stock_cover_days}
              onChange={(e) =>
                setBulkForm({ ...bulkForm, stock_cover_days: e.target.value })
              }
            />
          </Field>
          <Field label="Fulfilment Method">
            <select
              className={cls}
              value={bulkForm.fulfilment_method}
              onChange={(e) =>
                setBulkForm({ ...bulkForm, fulfilment_method: e.target.value })
              }
            >
              <option value="">No change</option>
              {FULFILMENT.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          <Field label="Fulfilment WH">
            <select
              className={cls}
              value={bulkForm.fulfilment_wh}
              onChange={(e) =>
                setBulkForm({ ...bulkForm, fulfilment_wh: e.target.value })
              }
            >
              <option value="">No change</option>
              {LOCATIONS.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          <Field label="WH Lead Time(In Days)">
            <input
              className={cls}
              type="number"
              value={bulkForm.wh_lead_time}
              onChange={(e) =>
                setBulkForm({ ...bulkForm, wh_lead_time: e.target.value })
              }
            />
          </Field>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Btn onClick={bulkUpdate}>Update</Btn>
          <Btn variant="ghost" onClick={() => setBulk(false)}>
            Close
          </Btn>
        </div>
      </Modal>
      <Modal
        title="Bulk Import ARS SKU-Location"
        open={importing}
        onClose={() => setImporting(false)}
      >
        <p className="mb-3 text-xs text-slate-500">
          CSV headers: sku_code, location, location_type, fulfilment_method,
          fulfilment_wh, wh_lead_time, primary_vendor, stock_cover_days,
          ars_flag. Maximum 2000 rows.
        </p>
        <input
          aria-label="ARS CSV file"
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) parseImport(f);
          }}
        />
        <div className="mt-4 flex justify-end">
          <Btn variant="ghost" onClick={() => setImporting(false)}>
            Close
          </Btn>
        </div>
      </Modal>
      {notice && <Toast {...notice} onClose={() => setNotice(null)} />}
    </Shell>
  );
}

export function ARSRules() {
  const nav = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [editing, setEditing] = useState(false);
  const [record, setRecord] = useState<any>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [records, setRecords] = useState(0);
  const [total, setTotal] = useState(0);
  const empty = {
    description: "",
    remarks: "",
    ars_method: "",
    minimum_qty: "",
    maximum_qty: "",
    ros_period: "",
    vendor_type: "",
    output_type: "",
    location: "",
    locations: [] as string[],
    start_date: "",
    end_date: "",
    status: "Pending",
    frequency: "0",
    sku_sets: [] as any[],
  };
  const [form, setForm] = useState(empty);
  const [locationPicker, setLocationPicker] = useState(false);
  const [filters, setFilters] = useState({
    location: "",
    product_set: "",
    rule_id: "",
    description: "",
    status: "",
    status_code: "",
    ars_method: "",
    frequency: "",
    last_run_date: "",
    next_run_date: "",
    updated_date: "",
  });
  const loadDependencies = () =>
    Promise.all([
      apiGet<any[]>("/api/ars?entity=links"),
      apiGet<any[]>("/api/ars?entity=settings"),
    ]).then(([l, s]) => {
      setLinks(l);
      setSettings(s[0] || {});
    });
  useEffect(() => {
    void loadDependencies();
  }, []);
  const search = async (nextPage = 1, nextSize = pageSize) => {
    setLoading(true);
    try {
      const result: any = await apiSend("/api/ars?entity=rules", "POST", {
        entity: "rules",
        REQ_SEARCH_FLAG: true,
        rows: nextSize,
        page: nextPage,
        sidx: "",
        sord: "asc",
        location: filters.location,
        productSet: filters.product_set,
        arsRuleId: filters.rule_id,
        desc: filters.description,
        status: filters.status,
        statusCode: filters.status_code,
        arsMethod: filters.ars_method,
        frequency: filters.frequency,
        lastARSRunDate: filters.last_run_date,
        nextARSRunDate: filters.next_run_date,
        modifiedDateText: filters.updated_date,
        clientId: null,
        client: null,
        frmlastARSRunDate: "",
        tolastARSRunDate: "",
        frmnextARSRunDate: "",
        tonextARSRunDate: "",
      });
      setRows(result.gridModel || result.rows || []);
      setPage(result.page || nextPage);
      setPageSize(nextSize);
      setRecords(result.records || 0);
      setTotal(result.total || 0);
      setSearched(true);
    } catch (error: any) {
      setRows([]);
      setNotice({ msg: error.message, type: "err" });
    } finally {
      setLoading(false);
    }
  };
  const openNew = () => {
    setRecord(null);
    setForm(empty);
    setEditing(true);
  };
  const openEdit = (r: any) => {
    const locations =
      Array.isArray(r.locations) && r.locations.length
        ? r.locations
        : [r.location].filter(Boolean);
    setRecord(r);
    setForm({
      ...empty,
      ...r,
      locations,
      location: locations[0] || "",
      frequency: String(r.frequency),
    });
    setEditing(true);
  };
  const save = async () => {
    setBusy(true);
    try {
      const payload = {
        ...form,
        location: form.locations[0] || "",
        minimum_qty: Number(form.minimum_qty),
        maximum_qty: Number(form.maximum_qty),
        frequency: Number(form.frequency),
      };
      const row: any = record
        ? await apiSend("/api/ars", "PUT", {
            entity: "rules",
            id: record.id,
            ...payload,
          })
        : await apiSend("/api/ars?entity=rules", "POST", {
            entity: "rules",
            ...payload,
          });
      setRecord(row);
      setForm({
        ...form,
        ...row,
        locations: row.locations || [row.location].filter(Boolean),
        frequency: String(row.frequency),
      });
      setNotice({ msg: "ARS Rule saved successfully.", type: "ok" });
      if (searched) void search(page);
      return row;
    } catch (e: any) {
      setNotice({ msg: e.message, type: "err" });
      return null;
    } finally {
      setBusy(false);
    }
  };
  const confirm = async () => {
    const row = record || (await save());
    if (!row) return;
    try {
      const updated: any = await apiSend("/api/ars", "PUT", {
        entity: "rules",
        id: row.id,
        action: "confirm",
      });
      setRecord(updated);
      setForm({ ...form, ...updated, frequency: String(updated.frequency) });
      setNotice({ msg: "ARS Rule confirmed and activated.", type: "ok" });
      if (searched) void search(page);
    } catch (e: any) {
      setNotice({ msg: e.message, type: "err" });
    }
  };
  const run = async () => {
    if (!record) return;
    setBusy(true);
    try {
      const log: any = await apiSend("/api/ars", "PUT", {
        entity: "rules",
        id: record.id,
        action: "run",
      });
      setNotice({ msg: log.message, type: "ok" });
      if (searched) void search(page);
    } catch (e: any) {
      setNotice({ msg: e.message, type: "err" });
    } finally {
      setBusy(false);
    }
  };
  const del = async () => {
    if (!record) return;
    try {
      await apiSend("/api/ars", "DELETE", { entity: "rules", id: record.id });
      setEditing(false);
      setNotice({ msg: "ARS Rule deleted.", type: "ok" });
      if (searched) void search(page);
    } catch (e: any) {
      setNotice({ msg: e.message, type: "err" });
    }
  };
  const periodOptions = [
    settings.ros_lifetime && "Life Time",
    settings.ros_12_weeks && "12 Weeks",
    settings.ros_6_weeks && "6 Weeks",
    settings.ros_1_month && "1 Month",
    settings.ros_2_weeks && "2 Weeks",
    ...(settings.custom_periods || [])
      .filter(Boolean)
      .map((x: string) => `${x} Days`),
  ].filter(Boolean) as string[];
  if (editing)
    return (
      <Shell
        active="procurement"
        breadcrumb="Procurement > Setup > ARS Create/Edit"
        openScreens={[
          { label: "ARS Rules", to: "#" },
          { label: "ARS Create/Edit", to: "#" },
        ]}
      >
        <div className="border border-slate-300 bg-white">
          <Bar>
            <Btn variant="ghost" disabled={!record || busy} onClick={run}>
              <Play size={13} />
              Run Now
            </Btn>
            <Btn
              variant="ghost"
              onClick={() => nav("/app/procurement/ars/logs")}
            >
              <History size={13} />
              View Log
            </Btn>
            <Btn variant="warn" disabled={busy} onClick={save}>
              Save
            </Btn>
            <Btn
              disabled={!record || record.status !== "Pending"}
              onClick={confirm}
            >
              Confirm
            </Btn>
            <Btn variant="ghost" disabled={!record} onClick={del}>
              <Trash2 size={13} />
              Delete
            </Btn>
            <Btn variant="ghost" onClick={openNew}>
              Add New
            </Btn>
            <Btn variant="ghost" onClick={() => setEditing(false)}>
              <X size={13} />
              Close
            </Btn>
          </Bar>
          <div className="grid grid-cols-1 gap-x-8 gap-y-3 border-t p-4 lg:grid-cols-[1fr_1fr_220px]">
            <div className="grid gap-3">
              <Field label="Rule ID">
                <input
                  className={`${cls} bg-slate-100`}
                  disabled
                  value={record?.rule_id || ""}
                />
              </Field>
              <Field label="ARS Method" required>
                <select
                  className={cls}
                  value={form.ars_method}
                  onChange={(e) =>
                    setForm({ ...form, ars_method: e.target.value })
                  }
                >
                  <option value="">-- Select --</option>
                  {RULE_METHODS.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </Field>
              <Field label="Output Type" required>
                <select
                  className={cls}
                  value={form.output_type}
                  onChange={(e) =>
                    setForm({ ...form, output_type: e.target.value })
                  }
                >
                  <option value="">-- Select --</option>
                  {OUTPUT_TYPES.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </Field>
              <Field label="End Date">
                <input
                  type="date"
                  className={cls}
                  value={form.end_date}
                  onChange={(e) =>
                    setForm({ ...form, end_date: e.target.value })
                  }
                />
              </Field>
            </div>
            <div className="grid gap-3">
              <Field label="Rule Description" required>
                <input
                  className={cls}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </Field>
              <Field label="Vendor Type" required>
                <select
                  className={cls}
                  value={form.vendor_type}
                  onChange={(e) =>
                    setForm({ ...form, vendor_type: e.target.value })
                  }
                >
                  <option value="">-- Select --</option>
                  {VENDOR_TYPES.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </Field>
              <Field label="Location" required>
                <select
                  className={cls}
                  value={form.location}
                  onChange={(e) =>
                    setForm({ ...form, location: e.target.value })
                  }
                >
                  <option value="">-- Select --</option>
                  {LOCATIONS.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </Field>
              <Field label="Status" required>
                <select
                  className={cls}
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  {ARS_STATUS.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </Field>
            </div>
            <aside className="row-span-2 border-l pl-3 text-xs text-slate-500">
              <b className="block border-b bg-slate-100 p-2 text-center">
                ARS Details
              </b>
              <p className="p-2">
                Last Run Date
                <br />
                <b>{record?.last_run_date || "—"}</b>
              </p>
              <p className="p-2">
                Next Run Date
                <br />
                <b>{record?.next_run_date || "—"}</b>
              </p>
              <button className="w-full border bg-slate-100 p-2">Audit</button>
            </aside>
            <div className="grid gap-3">
              <Field
                label="Minimum Quantity"
                required={form.ars_method === "Min-Max"}
              >
                <input
                  disabled={form.ars_method !== "Min-Max"}
                  type="number"
                  min="0"
                  className={cls}
                  value={form.minimum_qty}
                  onChange={(e) =>
                    setForm({ ...form, minimum_qty: e.target.value })
                  }
                />
              </Field>
              <Field
                label="Maximum Quantity"
                required={form.ars_method === "Min-Max"}
              >
                <input
                  disabled={form.ars_method !== "Min-Max"}
                  type="number"
                  min="0"
                  className={cls}
                  value={form.maximum_qty}
                  onChange={(e) =>
                    setForm({ ...form, maximum_qty: e.target.value })
                  }
                />
              </Field>
              <Field
                label="ROS Period"
                required={form.ars_method === "Sales History"}
              >
                <select
                  disabled={form.ars_method !== "Sales History"}
                  className={cls}
                  value={form.ros_period}
                  onChange={(e) =>
                    setForm({ ...form, ros_period: e.target.value })
                  }
                >
                  <option value="">-- Select --</option>
                  {periodOptions.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="grid gap-3">
              <Field label="Remarks">
                <textarea
                  className={cls}
                  rows={3}
                  value={form.remarks}
                  onChange={(e) =>
                    setForm({ ...form, remarks: e.target.value })
                  }
                />
              </Field>
              <Field label="Start Date" required>
                <input
                  type="date"
                  className={cls}
                  value={form.start_date}
                  onChange={(e) =>
                    setForm({ ...form, start_date: e.target.value })
                  }
                />
              </Field>
              <Field label="Frequency" required>
                <select
                  className={cls}
                  value={form.frequency}
                  onChange={(e) =>
                    setForm({ ...form, frequency: e.target.value })
                  }
                >
                  {FREQUENCIES.map((x) => (
                    <option key={x.v} value={x.v}>
                      {x.l}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>
          <div className="border-t p-3">
            <button
              onClick={() =>
                setForm({
                  ...form,
                  sku_sets: [
                    ...form.sku_sets,
                    { type: "SKU", operand: "Equals", value: "" },
                  ],
                })
              }
              className="mb-2 bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white"
            >
              ＋ Add SKU Set
            </button>
            <table className="w-full">
              <thead>
                <tr>
                  <Th>Type</Th>
                  <Th>Operand</Th>
                  <Th>Value</Th>
                  <Th>Action</Th>
                </tr>
              </thead>
              <tbody>
                {form.sku_sets.map((s: any, i: number) => (
                  <tr key={i}>
                    <Td>
                      <select
                        className={cls}
                        value={s.type}
                        onChange={(e) => {
                          const a = [...form.sku_sets];
                          a[i] = { ...s, type: e.target.value };
                          setForm({ ...form, sku_sets: a });
                        }}
                      >
                        {SKU_SET_TYPES.map((x) => (
                          <option key={x}>{x}</option>
                        ))}
                      </select>
                    </Td>
                    <Td>
                      <select
                        className={cls}
                        value={s.operand}
                        onChange={(e) => {
                          const a = [...form.sku_sets];
                          a[i] = { ...s, operand: e.target.value };
                          setForm({ ...form, sku_sets: a });
                        }}
                      >
                        <option>Equals</option>
                        <option>Not Equals</option>
                      </select>
                    </Td>
                    <Td>
                      {s.type === "SKU" ? (
                        <select
                          className={cls}
                          value={s.value}
                          onChange={(e) => {
                            const a = [...form.sku_sets];
                            a[i] = { ...s, value: e.target.value };
                            setForm({ ...form, sku_sets: a });
                          }}
                        >
                          <option value="">-- Select --</option>
                          {links.map((l) => (
                            <option key={l.id} value={l.sku_code}>
                              {l.sku_code}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          className={cls}
                          value={s.value}
                          onChange={(e) => {
                            const a = [...form.sku_sets];
                            a[i] = { ...s, value: e.target.value };
                            setForm({ ...form, sku_sets: a });
                          }}
                        />
                      )}
                    </Td>
                    <Td>
                      <button
                        onClick={() =>
                          setForm({
                            ...form,
                            sku_sets: form.sku_sets.filter(
                              (_: any, n: number) => n !== i,
                            ),
                          })
                        }
                        className="text-rose-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {notice && <Toast {...notice} onClose={() => setNotice(null)} />}
      </Shell>
    );
  const reset = () => {
    setFilters({
      location: "",
      product_set: "",
      rule_id: "",
      description: "",
      status: "",
      status_code: "",
      ars_method: "",
      frequency: "",
      last_run_date: "",
      next_run_date: "",
      updated_date: "",
    });
    setRows([]);
    setPage(1);
    setRecords(0);
    setTotal(0);
    setSearched(false);
  };
  return (
    <Shell
      active="procurement"
      breadcrumb="Procurement > Setup > ARS Rules"
      openScreens={[{ label: "ARS Rules", to: "#" }]}
    >
      <Bar>
        <Btn variant="warn" disabled={loading} onClick={() => void search(1)}>
          <Search size={13} />
          Search
        </Btn>
        <Btn variant="ghost" onClick={reset}>
          <RotateCcw size={13} />
          Reset
        </Btn>
        <Btn variant="ghost" onClick={openNew}>
          <Plus size={13} />
          Add New
        </Btn>
      </Bar>
      <div className="grid grid-cols-2 gap-4 border border-slate-300 bg-white p-3">
        <Field label="Location">
          <select
            className={cls}
            value={filters.location}
            onChange={(e) =>
              setFilters({ ...filters, location: e.target.value })
            }
          >
            <option value="">-- Select --</option>
            {LOCATIONS.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </Field>
        <Field label="Product Set">
          <select
            className={cls}
            value={filters.product_set}
            onChange={(e) =>
              setFilters({ ...filters, product_set: e.target.value })
            }
          >
            <option value="">-- Select --</option>
            {SKU_SET_TYPES.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </Field>
      </div>
      <table className="mt-2 w-full border border-slate-300 bg-white">
        <thead>
          <tr>
            {[
              "Rule ID",
              "Description",
              "Status",
              "ARS Method",
              "Frequency",
              "Last Run Date",
              "Next Run Date",
              "Created By",
              "Updated By",
              "Updated Date",
            ].map((x) => (
              <Th key={x}>{x}</Th>
            ))}
          </tr>
          <tr>
            {["rule_id", "description"].map((k) => (
              <th key={k} className="p-1">
                <input
                  className={cls}
                  value={(filters as any)[k]}
                  onChange={(e) =>
                    setFilters({ ...filters, [k]: e.target.value })
                  }
                />
              </th>
            ))}
            <th className="p-1">
              <select className={cls} value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
                <option value="">--- Select ---</option>
                {ARS_STATUS.map((value) => <option key={value}>{value}</option>)}
              </select>
            </th>
            <th className="p-1">
              <select className={cls} value={filters.ars_method} onChange={(e) => setFilters({ ...filters, ars_method: e.target.value })}>
                <option value="">--- Select ---</option>
                {RULE_METHODS.map((value) => <option key={value}>{value}</option>)}
              </select>
            </th>
            <th className="p-1">
              <select className={cls} value={filters.frequency} onChange={(e) => setFilters({ ...filters, frequency: e.target.value })}>
                <option value="">--- Select ---</option>
                {['Never', 'Bimonthly', 'Monthly', 'Biweekly', 'Weekly', 'Daily'].map((value) => <option key={value}>{value}</option>)}
              </select>
            </th>
            {['last_run_date', 'next_run_date'].map((key) => (
              <th key={key} className="p-1"><input className={cls} value={(filters as any)[key]} onChange={(e) => setFilters({ ...filters, [key]: e.target.value })} /></th>
            ))}
            <th /><th />
            <th className="p-1"><input className={cls} value={filters.updated_date} onChange={(e) => setFilters({ ...filters, updated_date: e.target.value })} /></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} onDoubleClick={() => openEdit(r)}>
              <Td>
                <button className="text-sky-600" onClick={() => openEdit(r)}>
                  {r.rule_id}
                </button>
              </Td>
              <Td>{r.description}</Td>
              <Td>
                <Status value={r.status} />
              </Td>
              <Td>{r.ars_method}</Td>
              <Td>
                {FREQUENCIES.find((x) => Number(x.v) === Number(r.frequency))
                  ?.l || `${r.frequency} Hours`}
              </Td>
              <Td>{r.last_run_date || "—"}</Td>
              <Td>{r.next_run_date || "—"}</Td>
              <Td>{r.created_by}</Td>
              <Td>{r.updated_by}</Td>
              <Td>{r.updated_date}</Td>
            </tr>
          ))}
          {!loading && rows.length === 0 && (
            <tr><td colSpan={10} className="p-8 text-center text-xs text-slate-400">No records to view</td></tr>
          )}
          {loading && (
            <tr><td colSpan={10} className="p-8 text-center text-xs text-slate-400">Loading...</td></tr>
          )}
        </tbody>
      </table>
      <div className="flex items-center justify-between border border-t-0 bg-white p-2 text-xs text-slate-500">
        <span>Page {records ? page : 0} of {total}</span>
        <span>
          <button disabled={!records || page <= 1 || loading} onClick={() => void search(page - 1)}>Previous</button>{" "}
          <select aria-label="Records per Page" value={pageSize} onChange={(event) => { const size = Number(event.target.value); setPageSize(size); if (searched) void search(1, size); }}>
            {[20, 50, 100, 200].map((size) => <option key={size}>{size}</option>)}
          </select>{" "}
          <button disabled={!records || page >= total || loading} onClick={() => void search(page + 1)}>Next</button>
        </span>
        <span>{records ? `View ${(page - 1) * pageSize + 1} - ${Math.min(page * pageSize, records)} of ${records}` : "No records to view"}</span>
      </div>
      {notice && <Toast {...notice} onClose={() => setNotice(null)} />}
    </Shell>
  );
}

export function ARSExecutionLog() {
  const [rows, setRows] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    execution_id: "",
    rule_id: "",
    location: "",
    status: "",
    exec_time: "",
    rule_desc: "",
    frequency: "",
    vendor_type: "",
    output_type: "",
  });
  const [detail, setDetail] = useState<any>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [records, setRecords] = useState(0);
  const [total, setTotal] = useState(0);
  const [picker, setPicker] = useState<"rule" | "execution" | null>(null);
  const [pickerRows, setPickerRows] = useState<any[]>([]);
  const search = async (nextPage = 1, nextSize = pageSize) => {
    setLoading(true);
    try {
      const result: any = await apiSend("/api/ars?entity=logs", "POST", {
        entity: "logs", REQ_SEARCH_FLAG: true, rows: nextSize, page: nextPage, sidx: "", sord: "asc", clientId: null,
        location: filters.location, arsExecId: filters.execution_id, execTime: filters.exec_time, frmExecTime: "", toExecTime: "",
        ruleId: filters.rule_id, ruleDesc: filters.rule_desc, frequency: filters.frequency, vendorType: filters.vendor_type,
        outputType: filters.output_type, status: filters.status,
      });
      setRows(result.gridModel || result.rows || []); setPage(result.page || nextPage); setPageSize(nextSize);
      setRecords(result.records || 0); setTotal(result.total || 0); setSearched(true);
    } catch (error: any) { setRows([]); setNotice({ msg: error.message, type: "err" }); } finally { setLoading(false); }
  };
  const reset = () => {
    setFilters({ execution_id: "", rule_id: "", location: "", status: "", exec_time: "", rule_desc: "", frequency: "", vendor_type: "", output_type: "" });
    setRows([]); setPage(1); setRecords(0); setTotal(0); setSearched(false);
  };
  const openPicker = async (kind: "rule" | "execution") => {
    try { setPickerRows(await apiGet<any[]>(`/api/ars?entity=${kind === "rule" ? "rules" : "logs"}`)); setPicker(kind); }
    catch (error: any) { setNotice({ msg: error.message, type: "err" }); }
  };
  return (
    <Shell
      active="procurement"
      breadcrumb="Procurement > ARS > ARS Execution Log"
      openScreens={[{ label: "ARS Execution Log", to: "#" }]}
    >
      <Bar>
        <Btn variant="warn" disabled={loading} onClick={() => void search(1)}>
          <Search size={13} />
          Search
        </Btn>
        <Btn
          variant="ghost"
          onClick={reset}
        >
          <RotateCcw size={13} />
          Reset
        </Btn>
      </Bar>
      <div className="grid grid-cols-2 gap-4 border bg-white p-3">
        <Field label="Rule ID"><span className="flex"><input aria-label="Rule ID" className={cls} value={filters.rule_id} onChange={(e) => setFilters({ ...filters, rule_id: e.target.value })}/><button aria-label="Rule ID Picker" className="border px-3" onClick={() => void openPicker("rule")}>...</button></span></Field>
        <Field label="Execution ID"><span className="flex"><input aria-label="Execution ID" className={cls} value={filters.execution_id} onChange={(e) => setFilters({ ...filters, execution_id: e.target.value })}/><button aria-label="Execution ID Picker" className="border px-3" onClick={() => void openPicker("execution")}>...</button></span></Field>
      </div>
      <table className="mt-2 w-full bg-white">
        <thead>
          <tr>
            {[
              "Location",
              "Execution ID",
              "Exec Time",
              "Rule Name",
              "Frequency",
              "Vendor Type",
              "Output Type",
              "Status",
            ].map((x) => (
              <Th key={x}>{x}</Th>
            ))}
          </tr>
          <tr>
            <th className="p-1"><select aria-label="Location" className={cls} value={filters.location} onChange={(e) => setFilters({ ...filters, location: e.target.value })}><option value="">--- Select ---</option>{LOCATIONS.map((value) => <option key={value}>{value}</option>)}</select></th>
            <th className="p-1"><input className={cls} value={filters.execution_id} onChange={(e) => setFilters({ ...filters, execution_id: e.target.value })}/></th>
            <th className="p-1"><input className={cls} value={filters.exec_time} onChange={(e) => setFilters({ ...filters, exec_time: e.target.value })}/></th>
            <th className="p-1"><input className={cls} value={filters.rule_desc} onChange={(e) => setFilters({ ...filters, rule_desc: e.target.value })}/></th>
            <th className="p-1"><select className={cls} value={filters.frequency} onChange={(e) => setFilters({ ...filters, frequency: e.target.value })}><option value="">--- Select ---</option>{['Never','Bimonthly','Monthly','Biweekly','Weekly','Daily'].map((value) => <option key={value}>{value}</option>)}</select></th>
            <th className="p-1"><select className={cls} value={filters.vendor_type} onChange={(e) => setFilters({ ...filters, vendor_type: e.target.value })}><option value="">--- Select ---</option>{['Min Cost','Min Lead Time','Primary'].map((value) => <option key={value}>{value}</option>)}</select></th>
            <th className="p-1"><select className={cls} value={filters.output_type} onChange={(e) => setFilters({ ...filters, output_type: e.target.value })}><option value="">--- Select ---</option>{OUTPUT_TYPES.map((value) => <option key={value}>{value}</option>)}</select></th>
            <th className="p-1"><select className={cls} value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}><option value="">--- Select ---</option>{['Pending','InProcess','ARS Generated','Approved','Document Generated','Zero Qty','Document Inprocess','Error'].map((value) => <option key={value}>{value}</option>)}</select></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <Td>{r.location}</Td>
              <Td>
                <button onClick={() => setDetail(r)} className="text-sky-600">
                  {r.arsExecId}
                </button>
              </Td>
              <Td>{r.execTime ? new Date(r.execTime).toLocaleString() : ""}</Td>
              <Td>{r.ruleDesc}</Td><Td>{r.frequencyDesc}</Td><Td>{r.vendorTypeDesc}</Td><Td>{r.outPutTypeDesc}</Td>
              <Td>
                <Status value={r.statusDesc} />
              </Td>
            </tr>
          ))}
          {!loading && !rows.length && <tr><td colSpan={8} className="p-8 text-center text-xs text-slate-400">No records to view</td></tr>}
          {loading && <tr><td colSpan={8} className="p-8 text-center text-xs text-slate-400">Loading...</td></tr>}
        </tbody>
      </table>
      <div className="flex items-center justify-between border border-t-0 bg-white p-2 text-xs text-slate-500">
        <span>Page {records ? page : 0} of {total}</span><span><button disabled={!records || page <= 1 || loading} onClick={() => void search(page - 1)}>Previous</button>{" "}<select aria-label="Records per Page" value={pageSize} onChange={(e) => { const size = Number(e.target.value); setPageSize(size); if (searched) void search(1, size); }}>{[20,50,100,200].map((size) => <option key={size}>{size}</option>)}</select>{" "}<button disabled={!records || page >= total || loading} onClick={() => void search(page + 1)}>Next</button></span>
        <span>{records ? `View ${(page - 1) * pageSize + 1} - ${Math.min(page * pageSize, records)} of ${records}` : "No records to view"}</span>
      </div>
      <Modal title={picker === "rule" ? "ARS Rule Pick List" : "ARS Execution Pick List"} open={!!picker} onClose={() => setPicker(null)}>
        <div className="max-h-72 overflow-auto">{pickerRows.map((row) => { const value = picker === "rule" ? row.rule_id : row.execution_id; return <button key={row.id} className="block w-full border-b p-2 text-left text-xs" onClick={() => { setFilters({ ...filters, [picker === "rule" ? "rule_id" : "execution_id"]: value }); setPicker(null); }}>{value} — {row.description}</button>; })}</div>
      </Modal>
      <Modal
        title={`ARS Execution — ${detail?.execution_id || ""}`}
        open={!!detail}
        onClose={() => setDetail(null)}
      >
        <p className="text-sm text-slate-600">{detail?.message}</p>
        <h3 className="mt-4 text-xs font-semibold uppercase text-slate-500">
          Generated Purchase Orders
        </h3>
        {detail?.generated_po_codes?.length ? (
          <ul className="mt-2 list-disc pl-5 text-sm text-sky-600">
            {detail.generated_po_codes.map((x: string) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-slate-400">
            No Purchase Orders generated.
          </p>
        )}
      </Modal>
      {notice && <Toast {...notice} onClose={() => setNotice(null)} />}
    </Shell>
  );
}

export function ARSSettings() {
  const [form, setForm] = useState<any>({
    enable_ars: true,
    calculation_hour: 2,
    ros_lifetime: true,
    ros_12_weeks: true,
    ros_6_weeks: false,
    ros_1_month: false,
    ros_2_weeks: false,
    custom_periods: ["", "", ""],
  });
  const [notice, setNotice] = useState<Notice>(null);
  useEffect(() => {
    apiGet<any[]>("/api/ars?entity=settings").then(
      (r) => r[0] && setForm(r[0]),
    );
  }, []);
  const save = async () => {
    try {
      const r = await apiSend("/api/ars", "PUT", {
        entity: "settings",
        ...form,
      });
      setForm(r);
      setNotice({ msg: "ARS and ROS configuration saved.", type: "ok" });
    } catch (e: any) {
      setNotice({ msg: e.message, type: "err" });
    }
  };
  const toggle = (key: string) => (
    <button
      onClick={() => setForm({ ...form, [key]: !form[key] })}
      className={`w-14 rounded-sm px-2 py-1 text-xs font-semibold text-white ${form[key] ? "bg-emerald-500" : "bg-rose-500"}`}
    >
      {form[key] ? "ON" : "OFF"}
    </button>
  );
  return (
    <Shell
      active="admin"
      breadcrumb="Admin > Setting > B2B Configuration"
      openScreens={[{ label: "B2B Configuration", to: "#" }]}
    >
      <div className="border bg-white">
        <div className="flex justify-end p-2">
          <Btn variant="warn" onClick={save}>
            Save
          </Btn>
        </div>
        <section className="border-t p-5">
          <h2 className="border-b-4 border-cyan-600 pb-1 text-sm font-semibold text-slate-600">
            ARS Setting
          </h2>
          <div className="mx-auto mt-4 grid max-w-lg gap-3">
            <Field label="Enable ARS">{toggle("enable_ars")}</Field>
            <Field label="ROS Calculation Hour">
              <select
                className={cls}
                value={form.calculation_hour}
                onChange={(e) =>
                  setForm({ ...form, calculation_hour: Number(e.target.value) })
                }
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i}>{i}</option>
                ))}
              </select>
            </Field>
          </div>
        </section>
        <section className="p-5">
          <h2 className="border-b-4 border-cyan-600 pb-1 text-sm font-semibold text-slate-600">
            Calculate ROS
          </h2>
          <div className="mx-auto mt-4 grid max-w-lg gap-3">
            {[
              ["ros_lifetime", "Life Time"],
              ["ros_12_weeks", "12 Weeks"],
              ["ros_6_weeks", "6 Weeks"],
              ["ros_1_month", "1 Month"],
              ["ros_2_weeks", "2 Weeks"],
            ].map(([k, l]) => (
              <Field key={k} label={l}>
                {toggle(k)}
              </Field>
            ))}
            {(form.custom_periods || ["", "", ""]).map(
              (v: string, i: number) => (
                <Field key={i} label="Custom Period">
                  <span className="flex items-center gap-2">
                    <input
                      type="number"
                      className={cls}
                      value={v}
                      onChange={(e) => {
                        const a = [...form.custom_periods];
                        a[i] = e.target.value;
                        setForm({ ...form, custom_periods: a });
                      }}
                    />
                    <span>Days</span>
                  </span>
                </Field>
              ),
            )}
          </div>
        </section>
      </div>
      {notice && <Toast {...notice} onClose={() => setNotice(null)} />}
    </Shell>
  );
}
