import { useEffect, useState } from 'react';
import { Plus, Download, SlidersHorizontal } from 'lucide-react';
import Shell from '../Shell';
import Modal from '../../components/Modal';
import { Toast } from '../parts';
import EnquiryScreen, { ECol, StatusPill } from '../EnquiryScreen';
import { apiGet, apiSend } from '../../lib/api';
import { useDownload } from '../../context/DownloadContext';

const TYPES = ['Percentage', 'Flat Amount', 'Free Shipping', 'BOGO'];
const fmt = (iso: string) => { if (!iso) return ''; const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; };

export default function ManageCoupons() {
  const { requestDownload } = useDownload();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [edit, setEdit] = useState<any | null>(null);
  const [view, setView] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
  const empty = { coupon_key: '', description: '', coupon_type: 'Percentage', status: 'Active', coupon_code: '', start_date: '', end_date: '', active_date: '', discount_value: 10, min_order: 0, usage_limit: 100, created_by: 'demo-admin' };
  const [form, setForm] = useState<any>(empty);

  const load = () => { setLoading(true); apiGet('/api/coupons').then(setRows).catch(() => setToast({ msg: 'Failed to load coupons', type: 'err' })).finally(() => setLoading(false)); };
  useEffect(load, []);

  const openNew = () => { setEdit(null); setForm(empty); setErrors({}); setShow(true); };
  const openEdit = (r: any) => { setEdit(r); setForm({ ...empty, ...r }); setErrors({}); setShow(true); };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.coupon_key.trim()) e.coupon_key = 'Coupon Key is required';
    if (!form.coupon_code.trim()) e.coupon_code = 'Coupon Code is required';
    if (form.discount_value === '' || isNaN(Number(form.discount_value)) || Number(form.discount_value) < 0) e.discount_value = 'Enter a valid discount value';
    if (form.start_date && form.end_date && form.start_date > form.end_date) e.end_date = 'End Date must be after Start Date';
    const dup = rows.find((r) => r.coupon_code?.toLowerCase() === form.coupon_code.toLowerCase() && (!edit || r.id !== edit.id));
    if (dup) e.coupon_code = `Coupon Code "${form.coupon_code}" already exists`;
    setErrors(e); return Object.keys(e).length === 0;
  };

  const save = async () => {
    if (!validate()) return setToast({ msg: 'Please fix the highlighted fields', type: 'err' });
    setBusy(true);
    try {
      if (edit) await apiSend('/api/coupons', 'PUT', { id: edit.id, ...form });
      else await apiSend('/api/coupons', 'POST', form);
      setToast({ msg: edit ? 'Coupon updated successfully' : 'Coupon created successfully', type: 'ok' }); setShow(false); load();
    } catch { setToast({ msg: 'Save failed', type: 'err' }); } finally { setBusy(false); }
  };

  const download = () => requestDownload({
    title: 'Coupon Enquiry', module: 'coupons', baseName: 'coupons',
    data: { columns: ['Coupon Key', 'Description', 'Coupon Type', 'Status', 'Coupon Code', 'Start Date', 'End Date', 'Active Date', 'Created By'], rows: rows.map((r) => [r.coupon_key, r.description, r.coupon_type, r.status, r.coupon_code, fmt(r.start_date), fmt(r.end_date), fmt(r.active_date), r.created_by]) },
  });

  const cols: ECol[] = [
    { key: 'coupon_key', label: 'Coupon Key', filter: 'text', align: 'left', render: (r) => <button onClick={() => setView(r)} className="font-medium text-[#2f7fb6] hover:underline">{r.coupon_key}</button> },
    { key: 'description', label: 'Description', filter: 'text', align: 'left' },
    { key: 'coupon_type', label: 'Coupon Type', filter: 'select', options: TYPES },
    { key: 'status', label: 'Status', filter: 'select', options: ['Active', 'Inactive'], render: (r) => <StatusPill active={r.status === 'Active'} /> },
    { key: 'coupon_code', label: 'Coupon Code', filter: 'text' },
    { key: 'start_date', label: 'Start Date', filter: 'none', render: (r) => fmt(r.start_date) },
    { key: 'end_date', label: 'End Date', filter: 'none', render: (r) => fmt(r.end_date) },
    { key: 'active_date', label: 'Active Date', filter: 'text', render: (r) => fmt(r.active_date) },
    { key: 'created_by', label: 'Created By', filter: 'none' },
  ];

  return (
    <Shell active="master" breadcrumb="MASTER > Coupon Management > Coupon Enquiry" openScreens={[{ label: 'Manage Coupons', to: '#' }]}>
      <EnquiryScreen
        breadcrumb={[{ label: 'Master' }, { label: 'Coupon Management' }, { label: 'Coupon Enquiry' }]}
        cols={cols} rows={rows} loading={loading}
        actions={[
          { label: 'Advance Search', icon: SlidersHorizontal, onClick: () => setToast({ msg: 'Advance Search: filter by discount, validity, usage limit.', type: 'ok' }) },
          { label: 'Add New', icon: Plus, variant: 'green', onClick: openNew },
          { label: 'Download', icon: Download, onClick: download },
        ]}
        onRowEdit={openEdit} onRowInfo={setView}
      />

      <Modal title={edit ? 'Edit Coupon' : 'Add New Coupon'} open={show} onClose={() => setShow(false)} wide>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="lbl">Coupon Key<span className="text-rose-500"> *</span></label>
            <input value={form.coupon_key} onChange={(e) => setForm({ ...form, coupon_key: e.target.value })} className={`inp ${errors.coupon_key ? 'border-rose-400 ring-1 ring-rose-300' : ''}`} />
            {errors.coupon_key && <p className="mt-0.5 text-xs text-rose-500">{errors.coupon_key}</p>}</div>
          <div><label className="lbl">Coupon Code<span className="text-rose-500"> *</span></label>
            <input value={form.coupon_code} onChange={(e) => setForm({ ...form, coupon_code: e.target.value })} className={`inp ${errors.coupon_code ? 'border-rose-400 ring-1 ring-rose-300' : ''}`} />
            {errors.coupon_code && <p className="mt-0.5 text-xs text-rose-500">{errors.coupon_code}</p>}</div>
          <div className="col-span-2"><label className="lbl">Description</label>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="inp" /></div>
          <div><label className="lbl">Coupon Type</label><select value={form.coupon_type} onChange={(e) => setForm({ ...form, coupon_type: e.target.value })} className="inp">{TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
          <div><label className="lbl">Discount Value<span className="text-rose-500"> *</span></label>
            <input type="number" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: e.target.value })} className={`inp ${errors.discount_value ? 'border-rose-400 ring-1 ring-rose-300' : ''}`} />
            {errors.discount_value && <p className="mt-0.5 text-xs text-rose-500">{errors.discount_value}</p>}</div>
          <div><label className="lbl">Min Order Value (₹)</label><input type="number" value={form.min_order} onChange={(e) => setForm({ ...form, min_order: e.target.value })} className="inp" /></div>
          <div><label className="lbl">Usage Limit</label><input type="number" value={form.usage_limit} onChange={(e) => setForm({ ...form, usage_limit: e.target.value })} className="inp" /></div>
          <div><label className="lbl">Start Date</label><input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="inp" /></div>
          <div><label className="lbl">End Date</label>
            <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className={`inp ${errors.end_date ? 'border-rose-400 ring-1 ring-rose-300' : ''}`} />
            {errors.end_date && <p className="mt-0.5 text-xs text-rose-500">{errors.end_date}</p>}</div>
          <div><label className="lbl">Active Date</label><input type="date" value={form.active_date} onChange={(e) => setForm({ ...form, active_date: e.target.value })} className="inp" /></div>
          <div><label className="lbl">Status</label><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="inp"><option>Active</option><option>Inactive</option></select></div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={() => setShow(false)} className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={save} disabled={busy} className="rounded-md bg-[#2ea44f] px-4 py-2 text-sm font-medium text-white hover:brightness-105 disabled:opacity-50">{busy ? 'Saving…' : edit ? 'Update' : 'Save'}</button>
        </div>
      </Modal>

      <Modal title={`Coupon — ${view?.coupon_key || ''}`} open={!!view} onClose={() => setView(null)} wide>
        {view && (
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            {[['Coupon Key', view.coupon_key], ['Coupon Code', view.coupon_code], ['Type', view.coupon_type], ['Discount', view.discount_value], ['Min Order', view.min_order], ['Usage Limit', view.usage_limit], ['Start Date', fmt(view.start_date)], ['End Date', fmt(view.end_date)], ['Active Date', fmt(view.active_date)], ['Status', view.status], ['Created By', view.created_by], ['Description', view.description || '—']].map(([l, v]) => (
              <div key={l as string}><p className="text-xs text-slate-400">{l}</p><p className="font-medium text-slate-700">{v}</p></div>
            ))}
          </div>
        )}
      </Modal>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </Shell>
  );
}
