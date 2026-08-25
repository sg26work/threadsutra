import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import Shell from "../Shell";
import Modal from "../../components/Modal";
import { apiGet, apiSend } from "../../lib/api";

const SIZES = [20, 50, 100, 200];
const emptyFilters = {
  buyerCode: "",
  buyerName: "",
  buyerDesc: "",
  phone: "",
  altPhone: "",
  email: "",
  displayIsActive: "-1",
  udf1: "",
  udf2: "",
  udf3: "",
  udf4: "",
  udf5: "",
  createdDate: "",
  updatedBy: "",
  updatedDate: "",
  linkToCategory: "",
};
const blank = () => ({
  buyer_code: "",
  buyer_name: "",
  description: "",
  email: "",
  phone: "",
  alternate_phone: "",
  active: true,
  categories: [] as string[],
  udf: ["", "", "", "", ""],
  location: "",
  created_by: "",
  created_date: "",
  updated_by: "",
  updated_date: "",
});
type Buyer = ReturnType<typeof blank> & {
  id?: number;
  displayIsActive?: string;
  linkToCategory?: string;
};

export default function CategoryBuyers() {
  const [filters, setFilters] = useState(emptyFilters);
  const [rows, setRows] = useState<Buyer[]>([]);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [records, setRecords] = useState(0);
  const [total, setTotal] = useState(0);
  const [searched, setSearched] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Buyer>(blank());
  const [categories, setCategories] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    apiGet<any[]>("/api/skus")
      .then((data) =>
        setCategories(
          Array.from(
            new Set(
              data
                .flatMap((row) => [row.category, row.subcategory])
                .filter(Boolean),
            ),
          ).sort(),
        ),
      )
      .catch(() => setCategories([]));
  }, []);
  const set = (key: keyof typeof emptyFilters, value: string) =>
    setFilters((current) => ({ ...current, [key]: value }));
  const search = async (nextPage = 1, nextSize = size) => {
    setLoading(true);
    setNotice("");
    try {
      const result = await apiSend<any>("/api/category-buyers", "POST", {
        _search: true,
        rows: nextSize,
        page: nextPage,
        sidx: "",
        sord: "asc",
        ...filters,
        REQ_SEARCH_FLAG: true,
      });
      setRows(result.gridModel);
      setPage(result.page);
      setTotal(result.total);
      setRecords(result.records);
      setSize(nextSize);
      setSearched(true);
    } catch (error: any) {
      setRows([]);
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  };
  const reset = () => {
    setFilters(emptyFilters);
    setRows([]);
    setPage(1);
    setSize(20);
    setRecords(0);
    setTotal(0);
    setSearched(false);
    setAdvanced(false);
    setNotice("");
  };
  const edit = async (buyerCode?: string) => {
    setNotice("");
    if (buyerCode) {
      try {
        setForm(
          await apiGet<Buyer>(
            `/api/category-buyers?buyerCode=${encodeURIComponent(buyerCode)}`,
          ),
        );
      } catch (error: any) {
        return setNotice(error.message);
      }
    } else setForm(blank());
    setOpen(true);
  };
  const save = async () => {
    if (!form.buyer_name.trim()) return setNotice("Buyer Name is required.");
    if (form.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email))
      return setNotice("Enter a valid Email.");
    setSaving(true);
    setNotice("");
    try {
      const saved = await apiSend<Buyer>(
        "/api/category-buyers",
        form.buyer_code ? "PUT" : "POST",
        form,
      );
      setForm(saved);
      setOpen(false);
      await search(1);
    } catch (error: any) {
      setNotice(error.message);
    } finally {
      setSaving(false);
    }
  };
  const columns = [
    "Buyer Code",
    "Buyer Name",
    "Buyer Description",
    "Phone",
    "Alternate Phone",
    "Email",
    "Status",
    "UDF1",
    "UDF2",
    "UDF3",
    "UDF4",
    "UDF5",
    "Location",
    "Created by",
    "createdDate",
    "updatedBy",
    "updatedDate",
    "Category",
    "Actions",
  ];
  return (
    <Shell
      active="procurement"
      breadcrumb="Procurement > Category Buyers"
      openScreens={[{ label: "Category Buyers", to: "#" }]}
    >
      <div className="mb-2 flex justify-end gap-2">
        <button
          id="SearchBtn"
          onClick={() => void search(1)}
          className="rounded bg-amber-500 px-4 py-2 text-sm text-white"
        >
          Search
        </button>
        <button onClick={reset} className="rounded border px-4 py-2 text-sm">
          Reset
        </button>
        <button
          onClick={() => setAdvanced((value) => !value)}
          className="rounded border px-4 py-2 text-sm"
        >
          Advanced Search
        </button>
        <button
          onClick={() => void edit()}
          className="rounded bg-[#2f9e9e] px-4 py-2 text-sm text-white"
        >
          <Plus size={14} className="mr-1 inline" />
          Add New
        </button>
      </div>
      {notice && (
        <p
          role="alert"
          className="mb-2 rounded border bg-red-50 p-2 text-sm text-red-700"
        >
          {notice}
        </p>
      )}
      <div className="grid gap-2 border bg-white p-3 md:grid-cols-4">
        <label className="text-xs">
          Buyer Name
          <input
            id="gs_buyerName"
            className="ci mt-1 w-full"
            value={filters.buyerName}
            onChange={(e) => set("buyerName", e.target.value)}
          />
        </label>
        <label className="text-xs">
          Buyer Description
          <input
            id="gs_buyerDesc"
            className="ci mt-1 w-full"
            value={filters.buyerDesc}
            onChange={(e) => set("buyerDesc", e.target.value)}
          />
        </label>
        <label className="text-xs">
          Phone
          <input
            id="gs_phone"
            className="ci mt-1 w-full"
            value={filters.phone}
            onChange={(e) => set("phone", e.target.value)}
          />
        </label>
        <label className="text-xs">
          Alternate Phone
          <input
            id="gs_altPhone"
            className="ci mt-1 w-full"
            value={filters.altPhone}
            onChange={(e) => set("altPhone", e.target.value)}
          />
        </label>
        <label className="text-xs">
          Email
          <input
            id="gs_email"
            className="ci mt-1 w-full"
            value={filters.email}
            onChange={(e) => set("email", e.target.value)}
          />
        </label>
        <label className="text-xs">
          Status
          <select
            id="gs_displayIsActive"
            className="ci mt-1 w-full"
            value={filters.displayIsActive}
            onChange={(e) => set("displayIsActive", e.target.value)}
          >
            <option value="-1">--- Select ---</option>
            <option value="1">Active</option>
            <option value="0">Inactive</option>
          </select>
        </label>
        {advanced && (
          <>
            <label className="text-xs">
              Buyer Code
              <input
                id="gs_buyerCode"
                className="ci mt-1 w-full"
                value={filters.buyerCode}
                onChange={(e) => set("buyerCode", e.target.value)}
              />
            </label>
            {[1, 2, 3, 4, 5].map((n) => (
              <label key={n} className="text-xs">
                UDF{n}
                <input
                  id={`gs_udf${n}`}
                  className="ci mt-1 w-full"
                  value={(filters as any)[`udf${n}`]}
                  onChange={(e) =>
                    set(`udf${n}` as keyof typeof emptyFilters, e.target.value)
                  }
                />
              </label>
            ))}
            <label className="text-xs">
              Created Date
              <input
                id="gs_createDate"
                type="date"
                className="ci mt-1 w-full"
                value={filters.createdDate}
                onChange={(e) => set("createdDate", e.target.value)}
              />
            </label>
            <label className="text-xs">
              Updated By
              <input
                id="gs_modifiedBy"
                className="ci mt-1 w-full"
                value={filters.updatedBy}
                onChange={(e) => set("updatedBy", e.target.value)}
              />
            </label>
            <label className="text-xs">
              Updated Date
              <input
                id="gs_modifiedDate"
                type="date"
                className="ci mt-1 w-full"
                value={filters.updatedDate}
                onChange={(e) => set("updatedDate", e.target.value)}
              />
            </label>
            <label className="text-xs">
              Category
              <select
                id="gs_linkToCategory"
                className="ci mt-1 w-full"
                value={filters.linkToCategory}
                onChange={(e) => set("linkToCategory", e.target.value)}
              >
                <option value="">--- Select ---</option>
                {categories.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
          </>
        )}
      </div>
      <div className="mt-2 overflow-auto border bg-white">
        <table className="min-w-[1900px] w-full text-xs">
          <thead className="bg-[#2f3b57] text-white">
            <tr>
              {columns.map((heading) => (
                <th key={heading} className="p-2 text-left">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={19} className="p-8 text-center">
                  Loading…
                </td>
              </tr>
            ) : rows.length ? (
              rows.map((row) => (
                <tr key={row.buyer_code} className="border-t">
                  <td className="p-2">
                    <button
                      onClick={() => void edit(row.buyer_code)}
                      className="text-sky-600"
                    >
                      {row.buyer_code}
                    </button>
                  </td>
                  <td>{row.buyer_name}</td>
                  <td>{row.description}</td>
                  <td>{row.phone}</td>
                  <td>{row.alternate_phone}</td>
                  <td>{row.email}</td>
                  <td>{row.displayIsActive}</td>
                  {row.udf.map((value, index) => (
                    <td key={index}>{value}</td>
                  ))}
                  <td>{row.location}</td>
                  <td>{row.created_by}</td>
                  <td>{row.created_date}</td>
                  <td>{row.updated_by}</td>
                  <td>{row.updated_date}</td>
                  <td>{row.linkToCategory}</td>
                  <td>
                    <button
                      aria-label={`Edit ${row.buyer_code}`}
                      onClick={() => void edit(row.buyer_code)}
                    >
                      ✎
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={19} className="p-8 text-center text-slate-400">
                  {searched
                    ? "No records to view"
                    : "Search to view Category Buyers"}
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
          value={size}
          onChange={(e) => {
            const n = Number(e.target.value);
            setSize(n);
            if (searched) void search(1, n);
          }}
        >
          {SIZES.map((n) => (
            <option key={n}>{n}</option>
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
            View {(page - 1) * size + 1} - {Math.min(page * size, records)} of{" "}
            {records}
          </span>
        )}
      </div>
      <Modal
        title="Category Buyer Create/Edit"
        open={open}
        onClose={() => setOpen(false)}
        wide
      >
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-xs">
            Buyer Code
            <input
              id="buyerCode"
              readOnly
              className="ci mt-1 w-full bg-slate-100"
              value={form.buyer_code}
            />
          </label>
          <label className="text-xs">
            Buyer Name*
            <input
              id="buyerName"
              className="ci mt-1 w-full"
              value={form.buyer_name}
              onChange={(e) => setForm({ ...form, buyer_name: e.target.value })}
            />
          </label>
          <label className="text-xs">
            Buyer Description
            <input
              id="buyerDesc"
              className="ci mt-1 w-full"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </label>
          <label className="text-xs">
            Email
            <input
              id="email"
              className="ci mt-1 w-full"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>
          <label className="text-xs">
            Phone
            <input
              id="phone"
              className="ci mt-1 w-full"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </label>
          <label className="text-xs">
            Alternate PhNo
            <input
              id="altPhone"
              className="ci mt-1 w-full"
              value={form.alternate_phone}
              onChange={(e) =>
                setForm({ ...form, alternate_phone: e.target.value })
              }
            />
          </label>
          <label className="flex items-center gap-2 text-xs">
            <input
              id="isActive"
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
            Is Active
          </label>
          <label className="text-xs">
            Category
            <select
              id="categorySelect"
              multiple
              className="ci mt-1 h-28 w-full"
              value={form.categories}
              onChange={(e) =>
                setForm({
                  ...form,
                  categories: Array.from(
                    e.target.selectedOptions,
                    (option) => option.value,
                  ),
                })
              }
            >
              {categories.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          {form.udf.map((value, index) => (
            <label key={index} className="text-xs">
              UDF{index + 1}
              <input
                id={`UDF${index + 1}`}
                className="ci mt-1 w-full"
                value={value}
                onChange={(e) => {
                  const udf = [...form.udf];
                  udf[index] = e.target.value;
                  setForm({ ...form, udf });
                }}
              />
            </label>
          ))}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            id="saveButton"
            disabled={saving}
            onClick={() => void save()}
            className="rounded bg-amber-500 px-4 py-2 text-sm text-white"
          >
            Save
          </button>
          <button
            onClick={() => setOpen(false)}
            className="rounded border px-4 py-2 text-sm"
          >
            Close
          </button>
        </div>
      </Modal>
    </Shell>
  );
}
