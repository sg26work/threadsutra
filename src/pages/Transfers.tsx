import { useEffect, useState } from 'react';
import { Plus, RefreshCw, Trash2, CheckCircle2 } from 'lucide-react';
import { apiGet, apiSend } from '../lib/api';
import PageHeader from '../components/PageHeader';
import DataTable, { Col } from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';

const WH = ['Delhi NCR', 'Mumbai WH', 'Bengaluru WH', 'Kolkata WH'];

export default function Transfers() {
  const [rows, setRows] = useState<any[]>([]);
  const [skus, setSkus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ sku_code: '', from_wh: 'Delhi NCR', to_wh: 'Mumbai WH', qty: '' });

  const load = () => { setLoading(true); apiGet('/api/transfers').then(setRows).finally(() => setLoading(false)); };
  useEffect(() => { load(); apiGet('/api/skus').then(setSkus); }, []);

  const create = async () => {
    if (!form.sku_code || !form.qty || form.from_wh === form.to_wh) return;
    setSaving(true);
    await apiSend('/api/transfers', 'POST', {
      transfer_no: 'STO' + Date.now().toString().slice(-8), sku_code: form.sku_code,
      from_wh: form.from_wh, to_wh: form.to_wh, qty: +form.qty,
      transfer_date: new Date().toISOString().slice(0, 10), status: 'In Transit',
    });
    setSaving(false); setShow(false); setForm({ sku_code: '', from_wh: 'Delhi NCR', to_wh: 'Mumbai WH', qty: '' }); load();
  };

  const complete = async (r: any) => { await apiSend('/api/transfers', 'PUT', { id: r.id, status: 'Completed' }); load(); };
  const del = async (id: number) => { await apiSend('/api/transfers', 'DELETE', { id }); load(); };

  const cols: Col<any>[] = [
    { key: 'transfer_no', label: 'Transfer No', render: (r) => <span className="font-medium text-[#2f7fb6]">{r.transfer_no}</span> },
    { key: 'sku_code', label: 'SKU' },
    { key: 'from_wh', label: 'From' },
    { key: 'to_wh', label: 'To' },
    { key: 'qty', label: 'Qty' },
    { key: 'transfer_date', label: 'Date' },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'act', label: 'Actions', render: (r) => (
      <div className="flex gap-1">
        {r.status === 'In Transit' && <button onClick={() => complete(r)} className="rounded p-1.5 text-emerald-600 hover:bg-emerald-50" title="Mark received"><CheckCircle2 size={15} /></button>}
        <button onClick={() => del(r.id)} className="rounded p-1.5 text-rose-500 hover:bg-rose-50"><Trash2 size={15} /></button>
      </div>
    ) },
  ];

  return (
    <div>
      <PageHeader title="Stock Transfers" breadcrumb="WMS / Stock Transfers"
        actions={<>
          <button onClick={load} className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"><RefreshCw size={14} /> Refresh</button>
          <button onClick={() => setShow(true)} className="flex items-center gap-1.5 rounded-md bg-[#2f9e9e] px-3 py-2 text-sm font-medium text-white hover:bg-[#268686]"><Plus size={15} /> New Transfer</button>
        </>} />
      <DataTable cols={cols} rows={rows} loading={loading} empty="No stock transfers yet" />

      <Modal title="Create Stock Transfer Order" open={show} onClose={() => setShow(false)}>
        <div className="space-y-3">
          <div><label className="mb-1 block text-xs font-medium text-slate-600">SKU</label>
            <select value={form.sku_code} onChange={(e) => setForm({ ...form, sku_code: e.target.value })} className="inp">
              <option value="">Select SKU…</option>
              {skus.map((s) => <option key={s.id} value={s.sku_code}>{s.sku_code} — {s.name}</option>)}
            </select></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="mb-1 block text-xs font-medium text-slate-600">From Warehouse</label>
              <select value={form.from_wh} onChange={(e) => setForm({ ...form, from_wh: e.target.value })} className="inp">{WH.map((w) => <option key={w}>{w}</option>)}</select></div>
            <div><label className="mb-1 block text-xs font-medium text-slate-600">To Warehouse</label>
              <select value={form.to_wh} onChange={(e) => setForm({ ...form, to_wh: e.target.value })} className="inp">{WH.map((w) => <option key={w}>{w}</option>)}</select></div>
          </div>
          {form.from_wh === form.to_wh && <p className="text-xs text-rose-600">Source and destination must differ.</p>}
          <div><label className="mb-1 block text-xs font-medium text-slate-600">Quantity</label>
            <input type="number" min={1} value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} className="inp" placeholder="0" /></div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={() => setShow(false)} className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={create} disabled={saving || !form.sku_code || !form.qty || form.from_wh === form.to_wh} className="rounded-md bg-[#2f9e9e] px-4 py-2 text-sm font-medium text-white hover:bg-[#268686] disabled:opacity-50">{saving ? 'Saving…' : 'Create Transfer'}</button>
        </div>
      </Modal>
    </div>
  );
}
