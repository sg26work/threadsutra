import { useEffect, useState } from 'react';
import { RefreshCw, Download, SlidersHorizontal, Plus, Minus } from 'lucide-react';
import { apiGet, apiSend } from '../lib/api';
import { useDownload } from '../context/DownloadContext';
import PageHeader from '../components/PageHeader';
import DataTable, { Col } from '../components/DataTable';
import Modal from '../components/Modal';

const WAREHOUSES = ['All', 'Delhi NCR', 'Mumbai WH', 'Bengaluru WH', 'Kolkata WH'];

export default function Inventory() {
  const { requestDownload } = useDownload();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [wh, setWh] = useState('All');
  const [adj, setAdj] = useState<any | null>(null);
  const [amt, setAmt] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => { setLoading(true); apiGet('/api/inventory').then(setRows).finally(() => setLoading(false)); };
  useEffect(load, []);

  const filtered = wh === 'All' ? rows : rows.filter((r) => r.warehouse === wh);

  const doAdjust = async (sign: number) => {
    if (!amt) return;
    setSaving(true);
    await apiSend('/api/inventory', 'PUT', { id: adj.id, adjustment: sign * Number(amt) });
    setSaving(false); setAdj(null); setAmt(''); load();
  };

  const exportCsv = () => requestDownload({
    title: 'Inventory View', module: 'inventory', baseName: 'inventory',
    data: {
      columns: ['SKU', 'Name', 'Warehouse', 'Bin', 'Available', 'Reserved', 'On Hand'],
      rows: filtered.map((r) => [r.sku_code, r.name, r.warehouse, r.bin, r.available, r.reserved, r.on_hand]),
    },
  });

  const cols: Col<any>[] = [
    { key: 'sku_code', label: 'SKU', render: (r) => <span className="font-medium text-[#2f7fb6]">{r.sku_code}</span> },
    { key: 'name', label: 'Product' },
    { key: 'warehouse', label: 'Warehouse' },
    { key: 'bin', label: 'Bin' },
    { key: 'available', label: 'Available', render: (r) => <span className={Number(r.available) < 20 ? 'font-semibold text-rose-600' : 'font-medium text-slate-700'}>{r.available}</span> },
    { key: 'reserved', label: 'Reserved' },
    { key: 'on_hand', label: 'On Hand', render: (r) => <span className="font-medium">{r.on_hand}</span> },
    { key: 'act', label: 'Adjust', render: (r) => <button onClick={() => { setAdj(r); setAmt(''); }} className="flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"><SlidersHorizontal size={12} /> Adjust</button> },
  ];

  return (
    <div>
      <PageHeader title="Inventory Management" breadcrumb="WMS / Inventory View"
        actions={<>
          <button onClick={load} className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"><RefreshCw size={14} /> Refresh</button>
          <button onClick={exportCsv} className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"><Download size={14} /> Export</button>
        </>} />

      <div className="mb-4 flex flex-wrap gap-2">
        {WAREHOUSES.map((w) => (
          <button key={w} onClick={() => setWh(w)} className={`rounded-full px-3 py-1 text-xs font-medium transition ${wh === w ? 'bg-[#2f9e9e] text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>{w}</button>
        ))}
      </div>

      <DataTable cols={cols} rows={filtered} loading={loading} empty="No inventory records" />

      <Modal title={`Adjust Stock — ${adj?.sku_code || ''}`} open={!!adj} onClose={() => setAdj(null)}>
        {adj && (<>
          <div className="mb-4 rounded-md bg-slate-50 p-3 text-sm">
            <p className="font-medium text-slate-700">{adj.name}</p>
            <p className="text-xs text-slate-400">{adj.warehouse} • Bin {adj.bin} • Current available: <b>{adj.available}</b></p>
          </div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Adjustment Quantity</label>
          <input type="number" min={1} value={amt} onChange={(e) => setAmt(e.target.value)} className="inp" placeholder="e.g. 25" />
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => doAdjust(-1)} disabled={saving || !amt} className="flex items-center gap-1.5 rounded-md border border-rose-300 px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50"><Minus size={15} /> Reduce</button>
            <button onClick={() => doAdjust(1)} disabled={saving || !amt} className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"><Plus size={15} /> Add</button>
          </div>
        </>)}
      </Modal>
    </div>
  );
}
