import { useEffect, useState } from 'react';
import { Plus, RefreshCw, Trash2, Pencil } from 'lucide-react';
import { apiGet, apiSend } from '../lib/api';
import PageHeader from '../components/PageHeader';
import DataTable, { Col } from '../components/DataTable';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';

export default function Partners() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('All');
  const [show, setShow] = useState(false);
  const [edit, setEdit] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const empty = { code: '', name: '', type: 'Vendor', contact: '', phone: '', email: '', city: '', state: '', gstin: '' };
  const [form, setForm] = useState<any>(empty);

  const load = () => { setLoading(true); apiGet('/api/partners').then(setRows).finally(() => setLoading(false)); };
  useEffect(load, []);

  const filtered = tab === 'All' ? rows : rows.filter((r) => r.type === tab);

  const openNew = () => { setEdit(null); setForm(empty); setShow(true); };
  const openEdit = (r: any) => { setEdit(r); setForm(r); setShow(true); };

  const save = async () => {
    if (!form.name || !form.code) return;
    setSaving(true);
    if (edit) await apiSend('/api/partners', 'PUT', { id: edit.id, ...form });
    else await apiSend('/api/partners', 'POST', form);
    setSaving(false); setShow(false); load();
  };
  const del = async (id: number) => { await apiSend('/api/partners', 'DELETE', { id }); load(); };

  const cols: Col<any>[] = [
    { key: 'code', label: 'Code', render: (r) => <span className="font-medium text-[#2f7fb6]">{r.code}</span> },
    { key: 'name', label: 'Name' },
    { key: 'type', label: 'Type', render: (r) => <StatusBadge status={r.type === 'Vendor' ? 'Open' : 'Active'} /> },
    { key: 'contact', label: 'Contact' },
    { key: 'phone', label: 'Phone' },
    { key: 'city', label: 'City' },
    { key: 'gstin', label: 'GSTIN' },
    { key: 'act', label: 'Actions', render: (r) => (
      <div className="flex gap-1">
        <button onClick={() => openEdit(r)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100"><Pencil size={15} /></button>
        <button onClick={() => del(r.id)} className="rounded p-1.5 text-rose-500 hover:bg-rose-50"><Trash2 size={15} /></button>
      </div>
    ) },
  ];

  return (
    <div>
      <PageHeader title="Trading Partners" breadcrumb="Masters / Trading Partners"
        actions={<>
          <button onClick={load} className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"><RefreshCw size={14} /> Refresh</button>
          <button onClick={openNew} className="flex items-center gap-1.5 rounded-md bg-[#2f9e9e] px-3 py-2 text-sm font-medium text-white hover:bg-[#268686]"><Plus size={15} /> Add Partner</button>
        </>} />

      <div className="mb-4 flex gap-2">
        {['All', 'Vendor', 'Customer', 'Transporter'].map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-full px-3 py-1 text-xs font-medium transition ${tab === t ? 'bg-[#2f9e9e] text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>{t}</button>
        ))}
      </div>

      <DataTable cols={cols} rows={filtered} loading={loading} empty="No trading partners" />

      <Modal title={edit ? 'Edit Partner' : 'Add Trading Partner'} open={show} onClose={() => setShow(false)} wide>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="lbl">Code</label><input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="inp" placeholder="e.g. VEN001" /></div>
          <div><label className="lbl">Type</label><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="inp"><option>Vendor</option><option>Customer</option><option>Transporter</option></select></div>
          <div className="col-span-2"><label className="lbl">Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="inp" /></div>
          <div><label className="lbl">Contact Person</label><input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} className="inp" /></div>
          <div><label className="lbl">Phone</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="inp" /></div>
          <div><label className="lbl">Email</label><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="inp" /></div>
          <div><label className="lbl">GSTIN</label><input value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value })} className="inp" /></div>
          <div><label className="lbl">City</label><input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="inp" /></div>
          <div><label className="lbl">State</label><input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className="inp" /></div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={() => setShow(false)} className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={save} disabled={saving || !form.code || !form.name} className="rounded-md bg-[#2f9e9e] px-4 py-2 text-sm font-medium text-white hover:bg-[#268686] disabled:opacity-50">{saving ? 'Saving…' : edit ? 'Update' : 'Create'}</button>
        </div>
      </Modal>
    </div>
  );
}
