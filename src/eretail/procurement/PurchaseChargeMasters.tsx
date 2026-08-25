import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import Shell from "../Shell";
import Modal from "../../components/Modal";
import { apiGet, apiSend } from "../../lib/api";

const SIZES = [20, 50, 100, 200];
type Charge = {
  chargeId?: string;
  chargeLineId?: number;
  chargeName: string;
  chargeType: string;
  chargeTypeTxt?: string;
  operand: number | "";
};
type Master = {
  chargeId: string;
  clientId: string;
  name: string;
  charges: Charge[];
};
const blank = (): Master => ({
  chargeId: "",
  clientId: "0",
  name: "",
  charges: [],
});
const blankCharge = (): Charge => ({
  chargeName: "",
  chargeType: "1",
  operand: "",
});

export default function PurchaseChargeMasters() {
  const [filters, setFilters] = useState({ chargeId: "", clientId: "", name: "" });
  const [rows, setRows] = useState<Master[]>([]);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [records, setRecords] = useState(0);
  const [total, setTotal] = useState(0);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Master>(blank());
  const [line, setLine] = useState<Charge>(blankCharge());
  const [selected, setSelected] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const search = async (nextPage = 1, nextSize = size) => {
    setLoading(true);
    setError("");
    try {
      const data = await apiSend<any>("/api/purchase-charge-masters", "POST", {
        _search: true,
        rows: nextSize,
        page: nextPage,
        sidx: "updatedDate",
        sord: "desc",
        ...filters,
        REQ_SEARCH_FLAG: true,
      });
      setRows(data.gridModel);
      setPage(data.page);
      setRecords(data.records);
      setTotal(data.total);
      setSize(nextSize);
      setSearched(true);
    } catch (e: any) {
      setRows([]);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  const edit = async (chargeId?: string) => {
    setError("");
    setSelected([]);
    setLine(blankCharge());
    if (chargeId) {
      try {
        setForm(
          await apiGet<Master>(
            `/api/purchase-charge-masters?chargeId=${encodeURIComponent(chargeId)}`,
          ),
        );
      } catch (e: any) {
        return setError(e.message);
      }
    } else setForm(blank());
    setOpen(true);
  };
  const addCharge = () => {
    if (form.charges.length >= 5)
      return setError("Maximum limit of parameters reached.");
    setForm({ ...form, charges: [...form.charges, line] });
    setLine(blankCharge());
  };
  const save = async () => {
    if (!form.name.trim()) return setError("Enter Name for Charge Master");
    if (!form.charges.length)
      return setError(
        "Please add charge data alongside creating Charge Master",
      );
    const missingName = form.charges.some((item) => !item.chargeName.trim());
    if (missingName) return setError("Enter Charge name");
    const missingType = form.charges.some((item) => !item.chargeType);
    if (missingType) return setError("Enter Charge Type");
    const missingOperand = form.charges.some(
      (item) => item.operand === "" || !Number.isFinite(Number(item.operand)),
    );
    if (missingOperand) return setError("Enter Operand");
    setSaving(true);
    setError("");
    try {
      const data: any = await apiSend(
        "/api/purchase-charge-masters",
        "POST",
        form,
      );
      setForm(data);
      setOpen(false);
      await search(1);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };
  const reset = () => {
    setFilters({ chargeId: "", clientId: "", name: "" });
    setRows([]);
    setRecords(0);
    setTotal(0);
    setPage(1);
    setSearched(false);
    setError("");
  };
  return (
    <Shell
      active="procurement"
      breadcrumb="Master > Purchase Charge Masters"
      openScreens={[{ label: "Purchase Charge Masters", to: "#" }]}
    >
      <div className="mb-2 flex justify-end gap-2">
        <button
          id="SearchBtn"
          className="rounded bg-amber-500 px-4 py-2 text-sm text-white"
          onClick={() => void search(1)}
        >
          Search
        </button>
        <button className="rounded border px-4 py-2 text-sm" onClick={reset}>
          Reset
        </button>
        <button
          className="rounded bg-[#2f9e9e] px-4 py-2 text-sm text-white"
          onClick={() => void edit()}
        >
          <Plus size={14} className="mr-1 inline" />
          Add New
        </button>
      </div>
      {error && (
        <p
          role="alert"
          className="mb-2 rounded border bg-red-50 p-2 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      <div className="grid gap-3 border bg-white p-3 md:grid-cols-3">
        <label className="text-xs">
          Charge ID
          <input
            id="gs_chargeId"
            name="chargeId"
            className="ci mt-1 block w-full"
            value={filters.chargeId}
            onChange={(event) => setFilters({ ...filters, chargeId: event.target.value })}
          />
        </label>
        <label className="text-xs">
          Charge Line ID
          <input
            id="gs_clientId"
            name="clientId"
            className="ci mt-1 block w-full"
            value={filters.clientId}
            onChange={(event) => setFilters({ ...filters, clientId: event.target.value })}
          />
        </label>
        <label className="text-xs">
          Purchase Charge Master
          <input
            id="gs_name"
            name="name"
            className="ci mt-1 block w-full"
            value={filters.name}
            onChange={(event) => setFilters({ ...filters, name: event.target.value })}
          />
        </label>
      </div>
      <div className="mt-2 overflow-auto border bg-white">
        <table className="w-full text-xs">
          <thead className="bg-[#2f3b57] text-white">
            <tr>
              <th className="p-2 text-left">Charge ID</th>
              <th className="p-2 text-left">Charge Line ID</th>
              <th className="p-2 text-left">Purchase Charge Master</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} className="p-8 text-center">
                  Loading…
                </td>
              </tr>
            ) : rows.length ? (
              rows.map((row) => (
                <tr key={row.chargeId} className="border-t">
                  <td className="p-2">
                    <button
                      className="text-sky-600"
                      onClick={() => void edit(row.chargeId)}
                    >
                      {row.chargeId}
                    </button>
                  </td>
                  <td>{row.clientId}</td>
                  <td>{row.name}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="p-8 text-center text-slate-400">
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
        title="Purchase Charge Master"
        open={open}
        onClose={() => setOpen(false)}
      >
        <label className="text-xs">
          Name
          <input
            id="name"
            className="ci mt-1 block w-full"
            disabled={Boolean(form.chargeId)}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>
        <div className="my-3 flex gap-2">
          <button
            className="rounded bg-[#2f9e9e] px-3 py-2 text-sm text-white"
            onClick={addCharge}
          >
            Add Charge
          </button>
          <button
            id="removeChargeBtn"
            className="rounded border px-3 py-2 text-sm"
            onClick={() => {
              if (!selected.length)
                return setError(
                  "Select the charge(s) that you would like to remove",
                );
              setForm({
                ...form,
                charges: form.charges.filter((_, i) => !selected.includes(i)),
              });
              setSelected([]);
            }}
          >
            Remove Charge
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2 border bg-slate-50 p-2">
          <input
            aria-label="Charge Name"
            className="ci"
            placeholder="Charge Name"
            value={line.chargeName}
            onChange={(e) => setLine({ ...line, chargeName: e.target.value })}
          />
          <select
            aria-label="Charge Type"
            className="ci"
            value={line.chargeType}
            onChange={(e) => setLine({ ...line, chargeType: e.target.value })}
          >
            <option value="1">Absolute</option>
            <option value="2">Percentage</option>
          </select>
          <input
            aria-label="Operand"
            className="ci"
            type="number"
            placeholder="Operand"
            value={line.operand}
            onChange={(e) =>
              setLine({
                ...line,
                operand: e.target.value === "" ? "" : Number(e.target.value),
              })
            }
          />
        </div>
        <table className="mt-2 w-full text-xs">
          <thead className="bg-[#2f3b57] text-white">
            <tr>
              <th></th>
              <th className="p-2 text-left">Charge ID</th>
              <th className="p-2 text-left">Charge Line ID</th>
              <th className="p-2 text-left">Charge Name</th>
              <th className="p-2 text-left">Charge Type</th>
              <th className="p-2 text-left">Operand</th>
            </tr>
          </thead>
          <tbody>
            {form.charges.map((item, i) => (
              <tr className="border-t" key={i}>
                <td className="p-2">
                  <input
                    type="checkbox"
                    aria-label={`Select charge ${i + 1}`}
                    checked={selected.includes(i)}
                    onChange={(e) =>
                      setSelected(
                        e.target.checked
                          ? [...selected, i]
                          : selected.filter((x) => x !== i),
                      )
                    }
                  />
                </td>
                <td>{item.chargeId || ""}</td>
                <td>{item.chargeLineId || ""}</td>
                <td>{item.chargeName}</td>
                <td>{item.chargeType === "2" ? "Percentage" : "Absolute"}</td>
                <td>{item.operand}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 flex justify-end gap-2">
          <button
            id="okButtonAdditionalCharge"
            className="rounded bg-amber-500 px-4 py-2 text-sm text-white"
            disabled={saving}
            onClick={() => void save()}
          >
            Save
          </button>
          <button
            id="closeBtn"
            className="rounded border px-4 py-2 text-sm"
            onClick={() => setOpen(false)}
          >
            Close
          </button>
        </div>
      </Modal>
    </Shell>
  );
}
