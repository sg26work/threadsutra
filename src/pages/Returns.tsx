import { useEffect, useState } from 'react';
import { Plus, RefreshCw, Trash2, CheckCircle2, RotateCcw } from 'lucide-react';
import { apiGet, apiSend } from '../lib/api';
import PageHeader from '../components/PageHeader';
import DataTable, { Col } from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';

const REASONS = ['Damaged Product', 'Wrong Item', 'Size Issue', 'Not as Described', 'Quality Issue', 'Changed Mind'];
const FLOW: Record<string, string> = { Requested: 'Approved', Approved: 'Received', Received: 'Refunded' };

export default function Returns() {
  const [rows, setRows] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ order_no: '', customer: '', sku_code: '', qty: 1, reason: 'Damaged Product' });

  const load = () => { setLoading(true); apiGet('/api/returns').then(setRows).finally(() => setLoading(false)); };
  useEffect(() => { load(); apiGet('/api/sale-orders').then(setOrders); }, []);

  const create = async () => {
    if (!form.order_no || !form.customer) return;
    setSaving(true);
    await apiSend('/api/returns', 'POST', {
      rma_no: 'RMA' + Date.now().toString().slice(-8), order_no: form.order_no, customer: form.customer,
      sku_code: form.sku_code, qty: +form.qty, reason: form.reason,
      return_date: new Date().toISOString().slice(0, 10), status: 'Requested',
    });
    setSaving(false); setShow(false); setForm({ order_no: '', customer: '', sku_code: '', qty: 1, reason: 'Damaged Product' }); load();
  };

  const advance = async (r: any) => { const n = FLOW[r.status]; if (!n) return; await apiSend('/api/returns', 'PUT', { id: r.id, status: n }); load(); };
  const del = async (id: number) => { await apiSend('/api/returns', 'DELETE', { id }); load(); };

  const cols: Col<any>[] = [
    { key: 'rma_no', label: 'RMA No', render: (r) => <span className="font-medium text-[#2f7fb6]">{r.rma_no}</span> },
    { key: 'order_no', label: 'Order No' },
    { key: 'customer', label: 'Customer' },
    { key: 'sku_code', label: 'SKU' },
    { key: 'qty', label: 'Qty' },
    { key: 'reason', label: 'Reason' },
    { key: 'return_date', label: 'Date' },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'act', label: 'Actions', render: (r) => (
      <div className="flex gap-1">
        {FLOW[r.status] && <button onClick={() => advance(r)} className="rounded p-1.5 text-emerald-600 hover:bg-emerald-50" title={`Move to ${FLOW[r.status]}`}><CheckCircle2 size={15} /></button>}
        <button onClick={() => del(r.id)} className="rounded p-1.5 text-rose-500 hover:bg-rose-50"><Trash2 size={15} /></button>
      </div>
    ) },
  ];

  return (
    <div>
      <PageHeader title="Customer Returns (RMA)" breadcrumb="Returns / Customer Returns"
        actions={<>
          <button onClick={load} className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"><RefreshCw size={14} /> Refresh</button>
          <button onClick={() => setShow(true)} className="flex items-center gap-1.5 rounded-md bg-[#2f9e9e] px-3 py-2 text-sm font-medium text-white hover:bg-[#268686]"><Plus size={15} /> New Return</button>
        </>} />
      <DataTable cols={cols} rows={rows} loading={loading} empty="No returns logged" />

      <Modal title="Create Return Request" open={show} onClose={() => setShow(false)}>
        <div className="space-y-3">
          <div><label className="lbl">Original Order</label>
            <select value={form.order_no} onChange={(e) => { const o = orders.find((x) => x.order_no === e.target.value); setForm({ ...form, order_no: e.target.value, customer: o?.customer || '' }); }} className="inp">
              <option value="">Select order…</option>
              {orders.map((o) => <option key={o.id} value={o.order_no}>{o.order_no} — {o.customer}</option>)}
            </select></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="lbl">Customer</label><input value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} className="inp" /></div>
            <div><label className="lbl">SKU Code</label><input value={form.sku_code} onChange={(e) => setForm({ ...form, sku_code: e.target.value })} className="inp" placeholder="e.g. TSHIRT-BLK-M" /></div>
            <div><label className="lbl">Quantity</label><input type="number" min={1} value={form.qty} onChange={(e) => setForm({ ...form, qty: +e.target.value })} className="inp" /></div>
            <div><label className="lbl">Reason</label><select value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="inp">{REASONS.map((r) => <option key={r}>{r}</option>)}</select></div>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={() => setShow(false)} className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={create} disabled={saving || !form.order_no} className="flex items-center gap-1.5 rounded-md bg-[#2f9e9e] px-4 py-2 text-sm font-medium text-white hover:bg-[#268686] disabled:opacity-50"><RotateCcw size={15} /> {saving ? 'Saving…' : 'Create RMA'}</button>
        </div>
      </Modal>
    </div>
  );
}
