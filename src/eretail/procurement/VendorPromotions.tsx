import { type KeyboardEvent, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Download, Plus } from "lucide-react";
import Shell from "../Shell";
import Modal from "../../components/Modal";
import { apiGet, apiSend } from "../../lib/api";
import { useGlobalBlocking } from "../ScreenContext";
import { useDownload } from "../../context/DownloadContext";
import { Toast } from "../parts";

const PAGE_SIZES = [20, 50, 100, 200];
const STATUS = [
  { value: "-1", text: "--- Select ---" },
  { value: "1", text: "Pending" },
  { value: "4", text: "Confirmed" },
  { value: "7", text: "Cancelled" },
];
const CONDITIONS = [
  { value: "-1", text: "--- Select ---" },
  { value: "5", text: "ALL" },
  { value: "4", text: "Brand" },
  { value: "1", text: "Product Category" },
  { value: "3", text: "SKU" },
  { value: "2", text: "Sub Category" },
];
const textFor = (options: { value: string; text: string }[], value: string) =>
  options.find((option) => option.value === value)?.text || "";
type PromoLine = {
  conditionOn: string;
  conditionOnStr: string;
  conditionCode: string;
  conditionCodeStr: string;
  skuQty: number;
  discType: string;
  discTypeStr: string;
  discValue: number | "";
  lineStatus: string;
  discountOn: string;
  discountOnStr: string;
  qtyFactor: string;
  qtyFactorStr: string;
  freeSku: string;
  freeQty: number | "";
};
type Promotion = {
  id?: number;
  discKey: string;
  vendorCode: string;
  vendorNameDesc: string;
  vendorCurrDesc: string;
  promoCode: string;
  promoName: string;
  promoType: string;
  promoTypeText: string;
  startDate: string;
  endDate: string;
  status: string;
  statusText: string;
  lines: PromoLine[];
  locations: string[];
  linkToAll: boolean;
  createdBy?: string;
  createDateText?: string;
  modifiedBy?: string;
  modifiedDateText?: string;
  rowVersion: number;
};
const blank = (): Promotion => ({
  discKey: "",
  vendorCode: "",
  vendorNameDesc: "",
  vendorCurrDesc: "",
  promoCode: "",
  promoName: "",
  promoType: "1",
  promoTypeText: "Line Discount",
  startDate: "",
  endDate: "",
  status: "",
  statusText: "",
  lines: [],
  locations: [],
  linkToAll: false,
  rowVersion: 0,
});
const blankLine = (): PromoLine => ({
  conditionOn: "1",
  conditionOnStr: "Product Category",
  conditionCode: "",
  conditionCodeStr: "",
  skuQty: 1,
  discType: "1",
  discTypeStr: "Percentage",
  discValue: "",
  lineStatus: "Active",
  discountOn: "2",
  discountOnStr: "Cost",
  qtyFactor: "1",
  qtyFactorStr: "On Min. Purchase",
  freeSku: "",
  freeQty: "",
});

export default function VendorPromotions() {
  const { requestDownload } = useDownload();
  const locationState = useLocation();
  const navigate = useNavigate();
  const editorParams = new URLSearchParams(locationState.search);
  const mode = editorParams.get("screen") === "editor" ? "editor" : "enquiry";
  const editorDiscKey = editorParams.get("discKey") || "";
  const [form, setForm] = useState<Promotion>(blank());
  const [tab, setTab] = useState<"info" | "locations">("info");
  const [rows, setRows] = useState<Promotion[]>([]);
  const [records, setRecords] = useState(0);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  useGlobalBlocking(loading);
  const [filters, setFilters] = useState({
    delLocation: "-1",
    vendorCode: "",
    promoType: "-1",
    status: "-1",
    promoName: "",
    promoCode: "",
    startDate: "",
    endDate: "",
  });
  const [advanced, setAdvanced] = useState(false);
  const [notice, setNotice] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);
  const [vendors, setVendors] = useState<any[]>([]);
  const [skus, setSkus] = useState<any[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [picker, setPicker] = useState<
    "vendor" | "sku" | "freeSku" | "hierarchy" | "brand" | null
  >(null);
  const [pickerQuery, setPickerQuery] = useState("");
  const [line, setLine] = useState<PromoLine>(blankLine());
  const [location, setLocation] = useState("");
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [audit, setAudit] = useState(false);
  const [saving, setSaving] = useState(false);
  const brands = useMemo(
    () =>
      Array.from(
        new Set(skus.map((sku) => String(sku.brand || "")).filter(Boolean)),
      ).sort(),
    [skus],
  );
  useEffect(() => {
    Promise.all([
      apiGet<any[]>("/api/vendors"),
      apiGet<any[]>("/api/skus"),
      apiGet<any[]>("/api/purchase-orders"),
    ])
      .then(([vendorRows, skuRows, poRows]) => {
        setVendors(vendorRows);
        setSkus(skuRows);
        setLocations(
          Array.from(
            new Set(
              poRows.map((row) => String(row.warehouse || "")).filter(Boolean),
            ),
          ).sort() as string[],
        );
      })
      .catch((error) => setNotice({ type: "err", text: error.message }));
  }, []);
  useEffect(() => {
    if (mode !== "editor") return;
    setTab("info");
    setLine(blankLine());
    setNotice(null);
    if (!editorDiscKey) { setForm(blank()); return; }
    apiGet<Promotion>(`/api/vendor-promotions?discKey=${encodeURIComponent(editorDiscKey)}`)
      .then(setForm)
      .catch((error) => setNotice({ type: "err", text: error.message }));
  }, [editorDiscKey, mode]);
  const search = async (nextPage = 1, nextSize = pageSize, nextFilters = filters) => {
    setLoading(true);
    setNotice(null);
    try {
      const data = await apiSend<any>("/api/vendor-promotions", "POST", {
        _search: true,
        rows: nextSize,
        page: nextPage,
        sidx: "discKey",
        sord: "desc",
        ...nextFilters,
        REQ_SEARCH_FLAG: true,
      });
      setRows(data.gridModel || data.rows || []);
      setPage(data.page);
      setTotal(data.total);
      setRecords(data.records);
      setPageSize(nextSize);
      setSearched(true);
    } catch (error: any) {
      setRows([]);
      setNotice({ type: "err", text: error.message });
    } finally {
      setLoading(false);
    }
  };
  const changeAndSearch = (key: keyof typeof filters, value: string) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    void search(1, pageSize, next);
  };
  const searchOnEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') { event.preventDefault(); void search(1); }
  };
  const resetEnquiry = () => {
    setFilters((current) => ({
      delLocation: "-1",
      vendorCode: "",
      promoType: "-1",
      status: current.status,
      promoName: "",
      promoCode: "",
      startDate: "",
      endDate: "",
    }));
    setRows([]);
    setRecords(0);
    setTotal(0);
    setPage(1);
    setSearched(false);
    setAdvanced(false);
    setNotice(null);
  };
  const openEditor = (discKey?: string) => navigate(`/app/m/vendor-promotions?screen=editor${discKey ? `&discKey=${encodeURIComponent(discKey)}` : ""}`);
  const save = async (requested: "1" | "4" | "7") => {
    if (form.status === "7" && requested !== "7")
      return setNotice({
        type: "err",
        text: "Can not perform save/confirm operation Promotion is in cancelled state",
      });
    if (!form.vendorCode.trim())
      return setNotice({ type: "err", text: "Please select vendor code" });
    if (!form.promoCode.trim())
      return setNotice({ type: "err", text: "Please enter Promo Code." });
    if (!form.promoName.trim())
      return setNotice({ type: "err", text: "Please enter Promo Name." });
    if (form.promoType !== "1")
      return setNotice({ type: "err", text: "Please select Promotion Type." });
    if (!form.startDate)
      return setNotice({ type: "err", text: "Please select Start date." });
    if (!form.endDate)
      return setNotice({ type: "err", text: "Please select End date." });
    if (new Date(form.startDate) > new Date(form.endDate))
      return setNotice({
        type: "err",
        text: "End Date cannot be less than StartDate",
      });
    if (!form.lines.length)
      return setNotice({
        type: "err",
        text: "Please enter details for promotion",
      });
    if (!form.linkToAll && !form.locations.length)
      return setNotice({
        type: "err",
        text: "Please enter details for location",
      });
    const status = form.status === "4" && requested === "1" ? "4" : requested;
    if (status === "4" && !window.confirm("Do you want to confirm?")) return;
    if (status === "7" && !window.confirm("Do you want to cancel?")) return;
    setSaving(true);
    setNotice(null);
    try {
      const saved = await apiSend<Promotion>("/api/vendor-promotions", "POST", {
        ...form,
        status,
      });
      setForm(saved);
      setNotice({
        type: "ok",
        text:
          status === "1"
            ? "Record Saved Successfully"
            : status === "4"
              ? "Records confirmed successfully"
              : "Records cancelled successfully",
      });
    } catch (error: any) {
      setNotice({ type: "err", text: error.message });
    } finally {
      setSaving(false);
    }
  };
  const addLine = () => {
    if (line.conditionOn === "-1")
      return setNotice({ type: "err", text: "Please select Condition Type." });
    if (line.conditionOn === "3" && !line.conditionCode)
      return setNotice({ type: "err", text: "SKU Code is Mandatory." });
    if (line.conditionOn === "1" && !line.conditionCode)
      return setNotice({
        type: "err",
        text: "Please select a Parent hierarchy.",
      });
    if (line.conditionOn === "2" && !line.conditionCode)
      return setNotice({
        type: "err",
        text: "Please select any Sub Level Hierarchy.",
      });
    if (!(Number(line.skuQty) > 0))
      return setNotice({ type: "err", text: "Please eneter SKU Qty." });
    if (
      (line.freeSku && !(Number(line.freeQty) > 0)) ||
      (!line.freeSku && Number(line.freeQty) > 0)
    )
      return setNotice({
        type: "err",
        text: "Please enter Free SKU with its free Qty.",
      });
    if (
      (line.discType !== "-1" && line.discValue === "") ||
      (line.discType === "-1" && line.discValue !== "")
    )
      return setNotice({
        type: "err",
        text: "Please select Discount Type and its value.",
      });
    if (line.discType === "1" && Number(line.discValue) > 100)
      return setNotice({
        type: "err",
        text: "Please enter discount value less than or equal 100",
      });
    setForm((current) => ({ ...current, lines: [...current.lines, line] }));
    setLine(blankLine());
    setNotice(null);
  };
  const pickerItems = useMemo(() => {
    const source =
      picker === "vendor"
        ? vendors
        : picker === "hierarchy"
          ? Array.from(
              new Set(
                skus
                  .map((sku) =>
                    line.conditionOn === "4"
                      ? sku.brand
                      : sku.category || sku.subcategory,
                  )
                  .filter(Boolean),
              ),
            ).map((name, index) => ({ id: index, name }))
          : picker === "brand"
            ? Array.from(
                new Set(skus.map((sku) => sku.brand).filter(Boolean)),
              ).map((name, index) => ({ id: index, name }))
            : skus;
    return source.filter((item: any) =>
      JSON.stringify(item).toLowerCase().includes(pickerQuery.toLowerCase()),
    );
  }, [picker, vendors, skus, pickerQuery, line.conditionOn]);
  const choose = (item: any) => {
    if (picker === "vendor")
      setForm((current) => ({
        ...current,
        vendorCode: item.vendor_code,
        vendorNameDesc: item.vendor_name,
        vendorCurrDesc: item.currency || "INR",
      }));
    else {
      const code = picker === "hierarchy" ? item.name : item.sku_code;
      setLine((current) =>
        picker === "freeSku"
          ? { ...current, freeSku: code }
          : { ...current, conditionCode: code, conditionCodeStr: code },
      );
    }
    setPicker(null);
    setPickerQuery("");
  };
  const field = (key: keyof Promotion, value: any) =>
    setForm((current) => ({ ...current, [key]: value }));
  if (mode === "editor")
    return (
      <Shell
        active="procurement"
        breadcrumb="Master > Vendor Promotion Management > Vendor Promotion Create/Edit"
        openScreens={[
          { label: "Vendor Promotions", to: "#" },
          { label: "Vendor Promotion Create/Edit", to: "#" },
        ]}
      >
        <div className="mb-2 flex justify-end gap-2">
          <button
            onClick={() => void save("1")}
            disabled={saving}
            className="rounded bg-amber-500 px-4 py-2 text-sm text-white"
          >
            Save
          </button>
          <button
            onClick={() => void save("4")}
            disabled={saving}
            className="rounded bg-emerald-600 px-4 py-2 text-sm text-white"
          >
            Confirm
          </button>
          <button
            onClick={() => void save("7")}
            disabled={saving || !form.discKey}
            className="rounded border px-4 py-2 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              setForm(blank());
              setLine(blankLine());
              setNotice(null);
            }}
            className="rounded border px-4 py-2 text-sm"
          >
            Reset
          </button>
          <button
            onClick={() => setAudit(true)}
            className="rounded border px-4 py-2 text-sm"
          >
            Audit
          </button>
          <button
            onClick={() => navigate("/app/m/vendor-promotions")}
            className="rounded border px-4 py-2 text-sm"
          >
            Vendor Promotions
          </button>
        </div>
        {notice && <Toast msg={notice.text} type={notice.type} onClose={() => setNotice(null)} />}
        <div className="border bg-white">
          <div className="flex border-b bg-slate-50">
            <button
              onClick={() => setTab("info")}
              className={`px-5 py-3 text-sm font-semibold ${tab === "info" ? "border-b-2 border-red-500 bg-white" : ""}`}
            >
              Promo Info
            </button>
            <button
              onClick={() => setTab("locations")}
              className={`px-5 py-3 text-sm font-semibold ${tab === "locations" ? "border-b-2 border-red-500 bg-white" : ""}`}
            >
              Location Link
            </button>
          </div>
          {tab === "info" ? (
            <>
              <div className="grid gap-3 p-4 md:grid-cols-4">
                <label className="text-xs">
                  Vendor Code*
                  <span className="flex">
                    <input
                      id="vendorCode"
                      className="ci mt-1 w-full"
                      value={form.vendorCode}
                      onChange={(event) => field("vendorCode", event.target.value)}
                    />
                    <button
                      aria-label="Open vendor picker"
                      onClick={() => setPicker("vendor")}
                      className="mt-1 border px-2"
                    >
                      ...
                    </button>
                  </span>
                </label>
                <label className="text-xs">
                  Vendor Name
                  <p className="mt-2">{form.vendorNameDesc || "—"}</p>
                </label>
                <label className="text-xs">
                  Vendor Currency
                  <p className="mt-2">{form.vendorCurrDesc || "—"}</p>
                </label>
                <label className="text-xs">
                  Disc Key
                  <input
                    className="ci mt-1 w-full bg-slate-100"
                    value={form.discKey}
                    readOnly
                  />
                </label>
                <label className="text-xs">
                  Promo Code*
                  <input
                    id="promoCode"
                    className="ci mt-1 w-full"
                    value={form.promoCode}
                    disabled={Boolean(form.discKey)}
                    onChange={(event) => field("promoCode", event.target.value)}
                  />
                </label>
                <label className="text-xs">
                  Promo Name*
                  <input
                    id="promoName"
                    className="ci mt-1 w-full"
                    value={form.promoName}
                    disabled={Boolean(form.discKey)}
                    onChange={(event) => field("promoName", event.target.value)}
                  />
                </label>
                <label className="text-xs">
                  Promo Type*
                  <select
                    id="promoType"
                    className="ci mt-1 w-full"
                    value={form.promoType}
                    disabled={Boolean(form.discKey)}
                    onChange={(event) => field("promoType", event.target.value)}
                  >
                    <option value="-1">--- Select ---</option>
                    <option value="1">Line Discount</option>
                  </select>
                </label>
                <label className="text-xs">
                  Date*
                  <span className="flex gap-1">
                    <input
                      aria-label="Start Date"
                      type="date"
                      className="ci mt-1 w-full"
                      value={form.startDate}
                      onChange={(event) =>
                        field("startDate", event.target.value)
                      }
                    />
                    <input
                      aria-label="End Date"
                      type="date"
                      className="ci mt-1 w-full"
                      value={form.endDate}
                      onChange={(event) => field("endDate", event.target.value)}
                    />
                  </span>
                </label>
                <label className="text-xs">
                  Status<p className="mt-2">{form.statusText || "—"}</p>
                </label>
              </div>
              <div className="grid gap-3 border-t bg-slate-50 p-3 md:grid-cols-5">
                <label className="text-xs">
                  Condition On*
                  <select
                    id="conditionOn"
                    className="ci mt-1 w-full"
                    value={line.conditionOn}
                    onChange={(event) =>
                      setLine({
                        ...line,
                        conditionOn: event.target.value,
                        conditionOnStr: textFor(CONDITIONS, event.target.value),
                        conditionCode: "",
                        conditionCodeStr: "",
                      })
                    }
                  >
                    {CONDITIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.text}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs">
                  {line.conditionOn === "3"
                    ? "SKU Code"
                    : line.conditionOn === "4"
                      ? "Brand"
                      : "Merch. Hierarchy"}
                  {line.conditionOn === "4" ? (
                    <select
                      id="brand"
                      className="ci mt-1 w-full"
                      value={line.conditionCode}
                      onChange={(event) =>
                        setLine({
                          ...line,
                          conditionCode: event.target.value,
                          conditionCodeStr: event.target.value,
                        })
                      }
                    >
                      <option value="">--- Select ---</option>
                      {brands.map((brand) => (
                        <option key={brand}>{brand}</option>
                      ))}
                    </select>
                  ) : line.conditionOn === "5" ? null : (
                    <span className="flex">
                      <input
                        className="ci mt-1 w-full"
                        value={line.conditionCodeStr}
                        readOnly
                      />
                      <button
                        aria-label="Open condition picker"
                        onClick={() =>
                          setPicker(
                            line.conditionOn === "3" ? "sku" : "hierarchy",
                          )
                        }
                        className="mt-1 border px-2"
                      >
                        ...
                      </button>
                    </span>
                  )}
                </label>
                <label className="text-xs">
                  SKU Qty*
                  <input
                    id="qty"
                    type="number"
                    min="1"
                    className="ci mt-1 w-full"
                    value={line.skuQty}
                    onChange={(event) =>
                      setLine({ ...line, skuQty: Number(event.target.value) })
                    }
                  />
                </label>
                <label className="text-xs">
                  Discount Type
                  <select
                    className="ci mt-1 w-full"
                    value={line.discType}
                    onChange={(event) =>
                      setLine({
                        ...line,
                        discType: event.target.value,
                        discTypeStr:
                          event.target.value === "1"
                            ? "Percentage"
                            : event.target.value === "2"
                              ? "Absolute"
                              : "",
                      })
                    }
                  >
                    <option value="-1">--- Select ---</option>
                    <option value="2">Absolute</option>
                    <option value="1">Percentage</option>
                  </select>
                </label>
                <label className="text-xs">
                  Discount Value
                  <input
                    id="discVal"
                    type="number"
                    min="0"
                    className="ci mt-1 w-full"
                    value={line.discValue}
                    onChange={(event) =>
                      setLine({
                        ...line,
                        discValue:
                          event.target.value === ""
                            ? ""
                            : Number(event.target.value),
                      })
                    }
                  />
                </label>
                <label className="text-xs">
                  Discount On
                  <select
                    className="ci mt-1 w-full"
                    value={line.discountOn}
                    onChange={(event) =>
                      setLine({
                        ...line,
                        discountOn: event.target.value,
                        discountOnStr:
                          event.target.value === "1" ? "MRP" : "Cost",
                      })
                    }
                  >
                    <option value="-1">--- Select ---</option>
                    <option value="2">Cost</option>
                    <option value="1">MRP</option>
                  </select>
                </label>
                <label className="text-xs">
                  Quantity Factor
                  <select
                    className="ci mt-1 w-full"
                    value={line.qtyFactor}
                    onChange={(event) =>
                      setLine({
                        ...line,
                        qtyFactor: event.target.value,
                        qtyFactorStr:
                          event.target.value === "2"
                            ? "In the Ratio Of"
                            : "On Min. Purchase",
                      })
                    }
                  >
                    <option value="-1">--- Select ---</option>
                    <option value="2">In the Ratio Of</option>
                    <option value="1">On Min. Purchase</option>
                  </select>
                </label>
                <label className="text-xs">
                  Free SKU
                  <span className="flex">
                    <input
                      className="ci mt-1 w-full"
                      value={line.freeSku}
                      readOnly
                    />
                    <button
                      aria-label="Open free SKU picker"
                      onClick={() => setPicker("freeSku")}
                      className="mt-1 border px-2"
                    >
                      ...
                    </button>
                  </span>
                </label>
                <label className="text-xs">
                  Free Qty
                  <input
                    type="number"
                    min="0"
                    className="ci mt-1 w-full"
                    value={line.freeQty}
                    onChange={(event) =>
                      setLine({
                        ...line,
                        freeQty:
                          event.target.value === ""
                            ? ""
                            : Number(event.target.value),
                      })
                    }
                  />
                </label>
                <div className="flex items-end gap-1">
                  <button
                    onClick={addLine}
                    className="rounded bg-[#2f9e9e] px-3 py-2 text-sm text-white"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      if (selectedLine === null)
                        return setNotice({
                          type: "err",
                          text: "Please select row(s) to delete.",
                        });
                      field(
                        "lines",
                        form.lines.filter((_, index) => index !== selectedLine),
                      );
                      setSelectedLine(null);
                    }}
                    className="rounded border px-3 py-2 text-sm"
                  >
                    Remove
                  </button>
                  <button
                    onClick={() => setLine(blankLine())}
                    className="rounded border px-3 py-2 text-sm"
                  >
                    Reset
                  </button>
                </div>
              </div>
              <div className="overflow-auto">
                <table className="min-w-[1200px] w-full text-xs">
                  <thead className="bg-[#2f3b57] text-white">
                    <tr>
                      {[
                        "",
                        "LN",
                        "Condition On",
                        "Condition Code",
                        "SKU Qty",
                        "Discount Type",
                        "Discount Value",
                        "Status",
                        "Discount On",
                        "Quantity Factor",
                        "Free SKU",
                        "Free Qty",
                      ].map((heading) => (
                        <th key={heading} className="p-2 text-left">
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {form.lines.length ? (
                      form.lines.map((item, index) => (
                        <tr key={index} className="border-t">
                          <td className="p-2">
                            <input
                              aria-label={`Select promotion line ${index + 1}`}
                              type="radio"
                              checked={selectedLine === index}
                              onChange={() => setSelectedLine(index)}
                            />
                          </td>
                          <td>{index + 1}</td>
                          <td>{item.conditionOnStr}</td>
                          <td>{item.conditionCodeStr}</td>
                          <td>{item.skuQty}</td>
                          <td>{item.discTypeStr}</td>
                          <td>{item.discValue}</td>
                          <td>{item.lineStatus}</td>
                          <td>{item.discountOnStr}</td>
                          <td>{item.qtyFactorStr}</td>
                          <td>{item.freeSku}</td>
                          <td>{item.freeQty}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={12}
                          className="p-8 text-center text-slate-400"
                        >
                          No records to view
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="p-4">
              <div className="flex items-end gap-3">
                <label className="text-xs">
                  Location
                  <select
                    aria-label="Promotion Location"
                    className="ci mt-1 min-w-60"
                    value={location}
                    onChange={(event) => setLocation(event.target.value)}
                  >
                    <option value="">--- Select ---</option>
                    {locations.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    id="linkToAll"
                    type="checkbox"
                    checked={form.linkToAll}
                    onChange={(event) =>
                      field("linkToAll", event.target.checked)
                    }
                  />
                  Link To All
                </label>
                <button
                  onClick={() => {
                    if (location && !form.locations.includes(location))
                      field("locations", [...form.locations, location]);
                    setLocation("");
                  }}
                  className="rounded bg-[#2f9e9e] px-3 py-2 text-sm text-white"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    if (!selectedLocation)
                      return setNotice({
                        type: "err",
                        text: "Please select row(s) to delete.",
                      });
                    field(
                      "locations",
                      form.locations.filter(
                        (item) => item !== selectedLocation,
                      ),
                    );
                    setSelectedLocation("");
                  }}
                  className="rounded border px-3 py-2 text-sm"
                >
                  Delete
                </button>
              </div>
              <table className="mt-4 w-full text-sm">
                <thead className="bg-[#2f3b57] text-white">
                  <tr>
                    <th></th>
                    <th className="p-2 text-left">Location</th>
                  </tr>
                </thead>
                <tbody>
                  {form.locations.map((item) => (
                    <tr key={item} className="border-t">
                      <td className="w-10 p-2">
                        <input
                          type="radio"
                          checked={selectedLocation === item}
                          onChange={() => setSelectedLocation(item)}
                        />
                      </td>
                      <td>{item}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <Modal title="Audit" open={audit} onClose={() => setAudit(false)}>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <dt>Created By</dt>
            <dd>{form.createdBy || "—"}</dd>
            <dt>Created Date</dt>
            <dd>{form.createDateText || "—"}</dd>
            <dt>Modified By</dt>
            <dd>{form.modifiedBy || "—"}</dd>
            <dt>Modified Date</dt>
            <dd>{form.modifiedDateText || "—"}</dd>
          </dl>
        </Modal>
        <Modal
          title={
            picker === "vendor"
              ? "Vendor Picker"
              : picker === "hierarchy"
                ? "Merchandising Hierarchy"
                : "SKU Picker"
          }
          open={Boolean(picker)}
          onClose={() => setPicker(null)}
        >
          <input
            aria-label="Picker search"
            className="ci mb-2 w-full"
            value={pickerQuery}
            onChange={(event) => setPickerQuery(event.target.value)}
          />
          <div className="max-h-72 overflow-auto border">
            {pickerItems.map((item: any) => (
              <button
                key={`${picker}-${item.id}`}
                onClick={() => choose(item)}
                className="block w-full border-b p-2 text-left text-xs"
              >
                {picker === "vendor"
                  ? `${item.vendor_code} — ${item.vendor_name}`
                  : picker === "hierarchy"
                    ? item.name
                    : `${item.sku_code} — ${item.description || item.sku_name || ""}`}
              </button>
            ))}
          </div>
        </Modal>
      </Shell>
    );
  return (
    <Shell
      active="procurement"
      breadcrumb="Master > Vendor Promotion Management > Vendor Promotions"
      openScreens={[{ label: "Vendor Promotions", to: "#" }]}
    >
      <div className="mb-2 flex justify-end gap-2">
        <button
          id="SearchBtn"
          onClick={() => void search(1)}
          className="rounded bg-amber-500 px-4 py-2 text-sm text-white"
        >
          Search
        </button>
        <button
          onClick={resetEnquiry}
          className="rounded border px-4 py-2 text-sm"
        >
          Reset
        </button>
        <button
          onClick={() =>
            records
              ? requestDownload({
                  title: "Vendor Promotions",
                  module: "vendor-promotions",
                  baseName: "vendor-promotions",
                  data: {
                    columns: [
                      "Disc Key",
                      "Vendor Code",
                      "Vendor Name",
                      "Promo Type",
                      "Status",
                      "Promotion Name",
                      "Promotion Code",
                      "Start Date",
                      "End Date",
                    ],
                    rows: rows.map((row) => [
                      row.discKey,
                      row.vendorCode,
                      row.vendorNameDesc,
                      row.promoTypeText,
                      row.statusText,
                      row.promoName,
                      row.promoCode,
                      row.startDate,
                      row.endDate,
                    ]),
                  },
                })
              : setNotice({ type: "err", text: "No data found" })
          }
          className="rounded border px-4 py-2 text-sm"
        >
          <Download size={14} className="mr-1 inline" />
          Export
        </button>
        <button
          onClick={() => setAdvanced((value) => !value)}
          className="rounded border px-4 py-2 text-sm"
        >
          Advanced Search
        </button>
        <button
          onClick={() => void openEditor()}
          className="rounded bg-[#2f9e9e] px-4 py-2 text-sm text-white"
        >
          <Plus size={14} className="mr-1 inline" />
          Add New
        </button>
      </div>
      {notice && <Toast msg={notice.text} type={notice.type} onClose={() => setNotice(null)} />}
      <div className="grid gap-3 border bg-white p-3 md:grid-cols-4">
        <label className="text-xs">
          Delivery Location
          <select
            id="gs_delLocation"
            className="ci mt-1 w-full"
            value={filters.delLocation}
            onChange={(event) =>
              setFilters({ ...filters, delLocation: event.target.value })
            }
          >
            <option value="-1">--- Select ---</option>
            {locations.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          Vendor Code
          <input
            id="gs_vendorCode"
            className="ci mt-1 w-full"
            value={filters.vendorCode}
            onKeyDown={searchOnEnter}
            onChange={(event) =>
              setFilters({ ...filters, vendorCode: event.target.value })
            }
          />
        </label>
        <label className="text-xs">
          Promo Type
          <select
            id="gs_promoType"
            className="ci mt-1 w-full"
            value={filters.promoType}
            onChange={(event) => changeAndSearch('promoType', event.target.value)}
          >
            <option value="-1">--- Select ---</option>
            <option value="1">Line Discount</option>
          </select>
        </label>
        <label className="text-xs">
          Status
          <select
            id="gs_status"
            className="ci mt-1 w-full"
            value={filters.status}
            onChange={(event) => changeAndSearch('status', event.target.value)}
          >
            {STATUS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.text}
              </option>
            ))}
          </select>
        </label>
        {advanced && (
          <>
            <label className="text-xs">
              Promotion Name
              <input
                id="gs_promoName"
                className="ci mt-1 w-full"
                value={filters.promoName}
                onKeyDown={searchOnEnter}
                onChange={(event) =>
                  setFilters({ ...filters, promoName: event.target.value })
                }
              />
            </label>
            <label className="text-xs">
              Promotion Code
              <input
                id="gs_promoCode"
                className="ci mt-1 w-full"
                value={filters.promoCode}
                onKeyDown={searchOnEnter}
                onChange={(event) =>
                  setFilters({ ...filters, promoCode: event.target.value })
                }
              />
            </label>
            <label className="text-xs">
              Start Date
              <input
                id="gs_startDate"
                type="date"
                className="ci mt-1 w-full"
                value={filters.startDate}
                onKeyDown={searchOnEnter}
                onChange={(event) =>
                  setFilters({ ...filters, startDate: event.target.value })
                }
              />
            </label>
            <label className="text-xs">
              End Date
              <input
                id="gs_endDate"
                type="date"
                className="ci mt-1 w-full"
                value={filters.endDate}
                onKeyDown={searchOnEnter}
                onChange={(event) =>
                  setFilters({ ...filters, endDate: event.target.value })
                }
              />
            </label>
          </>
        )}
      </div>
      <div className="mt-2 overflow-auto border bg-white">
        <table className="min-w-[1000px] w-full text-xs">
          <thead className="bg-[#2f3b57] text-white">
            <tr>
              {[
                "Disc Key",
                "Vendor Code",
                "Vendor Name",
                "Promo Type",
                "Status",
                "Promotion Name",
                "Promotion Code",
                "Start Date",
                "End Date",
              ].map((heading) => (
                <th key={heading} className="p-2 text-left">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="p-8 text-center">
                  Loading…
                </td>
              </tr>
            ) : rows.length ? (
              rows.map((row) => (
                <tr key={row.discKey} className="border-t">
                  <td className="p-2">
                    <button
                      onClick={() => void openEditor(row.discKey)}
                      className="text-sky-600"
                    >
                      {row.discKey}
                    </button>
                  </td>
                  <td>{row.vendorCode}</td>
                  <td>{row.vendorNameDesc}</td>
                  <td>{row.promoTypeText}</td>
                  <td>{row.statusText}</td>
                  <td>{row.promoName}</td>
                  <td>{row.promoCode}</td>
                  <td>{row.startDate}</td>
                  <td>{row.endDate}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9} className="p-8 text-center text-slate-400">
                  No records to view
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex justify-end gap-3 border bg-white p-2 text-xs">
        <span>
          Page {records ? page : 0} of {total}
        </span>
        <select
          aria-label="Records per Page"
          value={pageSize}
          onChange={(event) => {
            const size = Number(event.target.value);
            setPageSize(size);
            if (searched) void search(1, size);
          }}
        >
          {PAGE_SIZES.map((size) => (
            <option key={size}>{size}</option>
          ))}
        </select>
        <button
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => void search(page - 1)}
        >
          <ChevronLeft size={15} />
        </button>
        <button
          aria-label="Next page"
          disabled={!total || page >= total}
          onClick={() => void search(page + 1)}
        >
          <ChevronRight size={15} />
        </button>
        {records > 0 && (
          <span>
            View {(page - 1) * pageSize + 1} -{" "}
            {Math.min(page * pageSize, records)} of {records}
          </span>
        )}
      </div>
    </Shell>
  );
}
