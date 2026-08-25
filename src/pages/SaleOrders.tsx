import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Filter, Download, Eye, Truck, PackageCheck, Trash2, RefreshCw, Search } from 'lucide-react';
import { apiGet, apiSend, money } from '../lib/api';
import { useDownload } from '../context/DownloadContext';
import PageHeader from '../components/PageHeader';
import DataTable, { Col } from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';

const CHANNELS = ['Amazon', 'Flipkart', 'Myntra', 'Website', 'Store POS', 'Nykaa'];
const STATUSES = ['Confirmed', 'Ready to Ship', 'Shipped', 'Delivered', 'Cancelled'];
const FLOW: Record<string, string> = { Confirmed: 'Ready to Ship', 'Ready to Ship': 'Shipped', Shipped: 'Delivered' };

export default function SaleOrders() {
  const { requestDownload } = useDownload();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [showCreate, setShowCreate] = useState(false);
  const [view, setView] = useState<any | null>(null);
  const [form, setForm] = useState({ channel: 'Amazon', customer: '', city: '', items: 1, qty: 1, amount: '', payment_mode: 'Prepaid' });
  const [customers, setCustomers] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [params] = useSearchParams();
  const [q, setQ] = useState('');

  const load = () => { setLoading(true); apiGet('/api/sale-orders').then(setRows).finally(() => setLoading(false)); };
  useEffect(() => { load(); apiGet<any[]>('/api/customers').then((data) => setCustomers(data.filter((c) => c.is_active))); }, []);
  useEffect(() => { const urlQ = params.get('q'); if (urlQ) setQ(urlQ); }, [params]);

  const filtered = (filter === 'All' ? rows : rows.filter((r) => r.status === filter))
    .filter((r) => !q || (`${r.order_no} ${r.customer} ${r.city} ${r.channel}`).toLowerCase().includes(q.toLowerCase()));

  const create = async () => {
    if (!form.customer || !form.amount) return;
    setSaving(true);
    const order_no = 'SO' + Date.now().toString().slice(-8);
    await apiSend('/api/sale-orders', 'POST', {
      order_no, channel: form.channel, customer: form.customer, city: form.city,
      order_date: new Date().toISOString().slice(0, 10), items: Number(form.items),
      qty: Number(form.qty), amount: Number(form.amount), status: 'Confirmed', payment_mode: form.payment_mode,
    });
    setSaving(false); setShowCreate(false);
    setForm({ channel: 'Amazon', customer: '', city: '', items: 1, qty: 1, amount: '', payment_mode: 'Prepaid' });
    load();
  };

  const advance = async (row: any) => {
    const next = FLOW[row.status];
    if (!next) return;
    await apiSend('/api/sale-orders', 'PUT', { id: row.id, status: next });
    load();
    if (view && view.id === row.id) setView({ ...row, status: next });
  };

  const cancel = async (row: any) => {
    await apiSend('/api/sale-orders', 'PUT', { id: row.id, status: 'Cancelled' });
    load(); setView(null);
  };

  const del = async (id: number) => {
    await apiSend('/api/sale-orders', 'DELETE', { id });
    load();
  };

  const exportCsv = () => requestDownload({
    title: 'Order Enquiry', module: 'sale-orders', baseName: 'sale-orders',
    data: {
      columns: ['Order No', 'Channel', 'Customer', 'City', 'Date', 'Qty', 'Amount', 'Status'],
      rows: filtered.map((r) => [r.order_no, r.channel, r.customer, r.city, r.order_date, r.qty, r.amount, r.status]),
    },
  });

  const cols: Col<any>[] = [
    { key: 'order_no', label: 'Order No', render: (r) => <button onClick={() => setView(r)} className="font-medium text-[#2f7fb6] hover:underline">{r.order_no}</button> },
    { key: 'channel', label: 'Channel' },
    { key: 'customer', label: 'Customer' },
    { key: 'city', label: 'City' },
    { key: 'order_date', label: 'Date' },
    { key: 'qty', label: 'Qty' },
    { key: 'amount', label: 'Amount', render: (r) => <span className="font-medium">{money(r.amount)}</span> },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'act', label: 'Actions', render: (r) => (
        <div className="flex items-center gap-1">
          <button onClick={() => setView(r)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100" title="View"><Eye size={15} /></button>
          {FLOW[r.status] && (
            <button onClick={() => advance(r)} className="rounded p-1.5 text-emerald-600 hover:bg-emerald-50" title={`Move to ${FLOW[r.status]}`}>
              {r.status === 'Confirmed' ? <PackageCheck size={15} /> : <Truck size={15} />}
            </button>
          )}
          <button onClick={() => del(r.id)} className="rounded p-1.5 text-rose-500 hover:bg-rose-50" title="Delete"><Trash2 size={15} /></button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Manage Sale Orders" breadcrumb="Sales / Sale Orders"
        actions={<>
          <button onClick={load} className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"><RefreshCw size={14} /> Refresh</button>
          <button onClick={exportCsv} className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"><Download size={14} /> Export</button>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 rounded-md bg-[#2f9e9e] px-3 py-2 text-sm font-medium text-white hover:bg-[#268686]"><Plus size={15} /> New Order</button>
        </>} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1 text-xs text-slate-400"><Filter size={13} /> Status:</span>
        {['All', ...STATUSES].map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${filter === s ? 'bg-[#2f9e9e] text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
            {s} {s !== 'All' && <span className="opacity-60">({rows.filter((r) => r.status === s).length})</span>}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-1.5">
          <Search size={14} className="text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search order, customer, city…" className="w-52 bg-transparent text-sm outline-none" />
          {q && <button onClick={() => setQ('')} className="text-xs text-slate-400 hover:text-rose-500">clear</button>}
        </div>
      </div>

      <DataTable cols={cols} rows={filtered} loading={loading} empty="No sale orders match this filter" />

      {/* Create modal */}
      <Modal title="Create Sale Order" open={showCreate} onClose={() => setShowCreate(false)}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Channel"><select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })} className="inp">{CHANNELS.map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Payment Mode"><select value={form.payment_mode} onChange={(e) => setForm({ ...form, payment_mode: e.target.value })} className="inp"><option>Prepaid</option><option>COD</option></select></Field>
          <Field label="Customer Name"><select value={form.customer} onChange={(e) => { const customer = customers.find((c) => c.customer_name === e.target.value); setForm({ ...form, customer: e.target.value, city: customer?.shipping_city || customer?.city || form.city }); }} className="inp"><option value="">Select customer…</option>{customers.map((c) => <option key={c.id} value={c.customer_name}>{c.customer_code} — {c.customer_name}</option>)}</select></Field>
          <Field label="City"><input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="inp" placeholder="e.g. Mumbai" /></Field>
          <Field label="No. of Items"><input type="number" min={1} value={form.items} onChange={(e) => setForm({ ...form, items: +e.target.value })} className="inp" /></Field>
          <Field label="Total Qty"><input type="number" min={1} value={form.qty} onChange={(e) => setForm({ ...form, qty: +e.target.value })} className="inp" /></Field>
          <Field label="Order Amount (₹)"><input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="inp" placeholder="0" /></Field>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={() => setShowCreate(false)} className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={create} disabled={saving || !form.customer || !form.amount} className="rounded-md bg-[#2f9e9e] px-4 py-2 text-sm font-medium text-white hover:bg-[#268686] disabled:opacity-50">{saving ? 'Saving…' : 'Create Order'}</button>
        </div>
      </Modal>

      {/* View / workflow modal */}
      <Modal title={`Order ${view?.order_no || ''}`} open={!!view} onClose={() => setView(null)} wide>
        {view && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <StatusBadge status={view.status} />
              <span className="text-sm text-slate-400">{view.order_date}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
              <Info label="Channel" value={view.channel} />
              <Info label="Customer" value={view.customer} />
              <Info label="City" value={view.city} />
              <Info label="Payment" value={view.payment_mode} />
              <Info label="Items" value={view.items} />
              <Info label="Quantity" value={view.qty} />
              <Info label="Amount" value={money(view.amount)} />
            </div>

            {/* Workflow tracker */}
            <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="mb-3 text-xs font-semibold uppercase text-slate-400">Fulfillment Progress</p>
              <div className="flex items-center">
                {['Confirmed', 'Ready to Ship', 'Shipped', 'Delivered'].map((st, i, arr) => {
                  const order = arr.indexOf(view.status);
                  const done = view.status !== 'Cancelled' && i <= order;
                  return (
                    <div key={st} className="flex flex-1 items-center">
                      <div className="flex flex-col items-center">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${done ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'}`}>{i + 1}</div>
                        <span className={`mt-1 text-[10px] ${done ? 'text-slate-700' : 'text-slate-400'}`}>{st}</span>
                      </div>
                      {i < arr.length - 1 && <div className={`h-0.5 flex-1 ${i < order ? 'bg-emerald-500' : 'bg-slate-200'}`} />}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              {view.status !== 'Cancelled' && view.status !== 'Delivered' && (
                <button onClick={() => cancel(view)} className="rounded-md border border-rose-300 px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50">Cancel Order</button>
              )}
              {FLOW[view.status] && (
                <button onClick={() => advance(view)} className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
                  <Truck size={15} /> Move to {FLOW[view.status]}
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Field({ label, children }: { label: string; children: any }) {
  return <div><label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>{children}</div>;
}
function Info({ label, value }: { label: string; value: any }) {
  return <div><p className="text-xs text-slate-400">{label}</p><p className="font-medium text-slate-700">{value}</p></div>;
}
