import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import Shell from "../Shell";
import Modal from "../../components/Modal";
import { apiSend } from "../../lib/api";

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
  const [nameFilter, setNameFilter] = useState("");
  const [rows, setRows] = useState<Master[]>([]);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [records, setRecords] = useState(0);
  const [total, setTotal] = useState(0);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [open, setOpen] = useState(false);
  const [nameReadOnly, setNameReadOnly] = useState(false);
  const [form, setForm] = useState<Master>(blank());
  const [selected, setSelected] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const search = async (nextPage = 1, nextSize = size) => {
    setLoading(true);
    setError("");
    try {
      const data = await apiSend<any>("/api/chargeMasterSearch", "POST", {
        _search: true,
        rows: nextSize,
        page: nextPage,
        sidx: "updatedDate",
        sord: "desc",
        name: nameFilter,
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
  useEffect(() => {
    void search(1, 20);
    // LIVE loads the first enquiry page when the module opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const edit = async (chargeId?: string) => {
    setError("");
    setNotice("");
    setSelected([]);
    setNameReadOnly(Boolean(chargeId));
    if (chargeId) {
      try {
        const detail = await apiSend<any>(
          `/api/jsonPOChargeDetailGrid?chargeId=${encodeURIComponent(chargeId)}&clientId=0`,
          "POST",
          { _search: false, rows: 20, page: 1, sidx: "", sord: "asc" },
        );
        setForm(detail.chargeMasterDTO);
      } catch (e: any) {
        return setError(e.message);
      }
    } else setForm(blank());
    setOpen(true);
  };
  const addCharge = () => {
    if (form.charges.length >= 5)
      return setError("Maximum limit of parameters reached.");
    setForm({ ...form, charges: [...form.charges, blankCharge()] });
  };
  const removeCharges = async () => {
    if (!selected.length)
      return setError("Select the charge(s) that you would like to remove");
    const next = form.charges.filter((_, index) => !selected.includes(index));
    setError("");
    setNotice("");
    if (!form.chargeId) {
      setForm({ ...form, charges: next });
      setSelected([]);
      return;
    }
    setSaving(true);
    try {
      const response = await apiSend<any>(
        "/api/delUpdatePOCharges",
        "POST",
        { chargeId: form.chargeId, clientId: form.clientId, name: form.name, gridData: next },
      );
      const saved: Master = response.chargeMasterDTO;
      setForm(saved);
      setSelected([]);
      setNotice(response.actionMessage || "");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };
  const save = async () => {
    if (!form.name.trim()) return setError("Enter Name for Charge Master");
    if (!selected.length)
      return setError("Select the charge(s) that you would like to save/update");
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
      const response: any = await apiSend(
        "/api/saveUpdatePOCharges",
        "POST",
        { chargeId: form.chargeId, clientId: form.clientId, name: form.name, gridData: form.charges },
      );
      const data = response.chargeMasterDTO;
      setForm(data);
      setSelected([]);
      setNotice(response.actionMessage || "");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };
  const reset = () => {
    setNameFilter("");
    setRows([]);
    setRecords(0);
    setTotal(0);
    setPage(1);
    setSearched(false);
    setError("");
    setNotice("");
  };
  const closeEditor = () => {
    setOpen(false);
    setNotice("");
    void search(1);
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
      {notice && (
        <p className="mb-2 rounded border bg-emerald-50 p-2 text-sm text-emerald-700">
          {notice}
        </p>
      )}
      <div className="grid gap-3 border bg-white p-3">
        <label className="hidden text-xs">
          Charge ID
          <input
            id="gs_chargeId"
            name="chargeId"
            className="ci mt-1 block w-full"
            value=""
            readOnly
          />
        </label>
        <label className="hidden text-xs">
          Charge Line ID
          <input
            id="gs_clientId"
            name="clientId"
            className="ci mt-1 block w-full"
            value=""
            readOnly
          />
        </label>
        <label className="text-xs">
          Purchase Charge Master
          <input
            id="gs_name"
            name="name"
            className="ci mt-1 block w-full"
            value={nameFilter}
            onChange={(event) => setNameFilter(event.target.value)}
          />
        </label>
      </div>
      <div className="mt-2 overflow-auto border bg-white">
        <table className="w-full text-xs">
          <thead className="bg-[#2f3b57] text-white">
            <tr>
              <th className="p-2 text-left">Purchase Charge Master</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="p-8 text-center">
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
                      {row.name}
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="p-8 text-center text-slate-400">
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
        onClose={closeEditor}
      >
        <label className="text-xs">
          Name
          <input
            id="name"
            className="ci mt-1 block w-full"
            disabled={nameReadOnly}
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
            disabled={saving}
            onClick={() => void removeCharges()}
          >
            Remove Charge
          </button>
        </div>
        <table className="mt-2 w-full text-xs">
          <thead className="bg-[#2f3b57] text-white">
            <tr>
              <th></th>
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
                <td className="p-1">
                  <input
                    aria-label={`Charge Name ${i + 1}`}
                    className="ci w-full"
                    value={item.chargeName}
                    onChange={(event) => {
                      const charges = [...form.charges];
                      charges[i] = { ...item, chargeName: event.target.value };
                      setForm({ ...form, charges });
                    }}
                  />
                </td>
                <td className="p-1">
                  <select
                    aria-label={`Charge Type ${i + 1}`}
                    className="ci w-full"
                    value={item.chargeType}
                    onChange={(event) => {
                      const charges = [...form.charges];
                      charges[i] = { ...item, chargeType: event.target.value };
                      setForm({ ...form, charges });
                    }}
                  >
                    <option value="1">Absolute</option>
                    <option value="2">Percentage</option>
                  </select>
                </td>
                <td className="p-1">
                  <input
                    aria-label={`Operand ${i + 1}`}
                    className="ci w-full"
                    type="number"
                    value={item.operand}
                    onChange={(event) => {
                      const charges = [...form.charges];
                      charges[i] = {
                        ...item,
                        operand:
                          event.target.value === ""
                            ? ""
                            : Number(event.target.value),
                      };
                      setForm({ ...form, charges });
                    }}
                  />
                </td>
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
            onClick={closeEditor}
          >
            Close
          </button>
        </div>
      </Modal>
    </Shell>
  );
}
