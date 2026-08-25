import { useEffect, useState } from 'react';
import { Plus, RefreshCw, Trash2, Download, Search, Pencil, Eye, Filter, X, GitBranch } from 'lucide-react';
import Shell from './Shell';
import { Panel, ToolBar, Btn, Pill, Toast } from './parts';
import OrderGrid, { GCol } from './OrderGrid';
import Modal from '../components/Modal';
import { apiGet, apiSend } from '../lib/api';
import { useDownload } from '../context/DownloadContext';
import { getSchema, MField } from './masterSchemas';

const BASE_KEYS = ['code', 'name', 'description', 'status'];

export default function GenericModule({
  moduleKey, title, breadcrumb, active,
}: {
  moduleKey: string; title: string; breadcrumb: string; active: string;
  codeLabel?: string; nameLabel?: string;
}) {
  const schema = getSchema(moduleKey);
  const codeLabel = schema.codeLabel;
  const nameLabel = schema.nameLabel;

  const buildEmpty = () => {
    const f: any = { code: '', name: '', description: '', status: 'Active' };
    schema.fields.forEach((fd) => { if (!(fd.key in f)) f[fd.key] = fd.default ?? (fd.type === 'checkbox' ? 0 : ''); });
    return f;
  };

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [show, setShow] = useState(false);
  const [edit, setEdit] = useState<any | null>(null);
  const [view, setView] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<any>(buildEmpty());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
  const { requestDownload } = useDownload();

  const load = () => {
    setLoading(true);
    apiGet(`/api/generic?module=${moduleKey}`).then(setRows)
      .catch(() => setToast({ msg: 'Failed to load records', type: 'err' }))
      .finally(() => setLoading(false));
  };
  useEffect(load, [moduleKey]);
  useEffect(() => { setForm(buildEmpty()); /* reset when module changes */ }, [moduleKey]);

  const searchable = (r: any) => schema.fields.map((f) => r[f.key]).join(' ').toLowerCase();
  const filtered = rows
    .filter((r) => statusFilter === 'All' || r.status === statusFilter)
    .filter((r) => searchable(r).includes(q.toLowerCase()));
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const activePage = Math.min(page, pageCount - 1);
  const pagedRows = filtered.slice(activePage * pageSize, (activePage + 1) * pageSize);

  const resetFilters = () => {
    setQ('');
    setStatusFilter('All');
    setPage(0);
  };

  const openNew = () => { setEdit(null); setForm(buildEmpty()); setErrors({}); setShow(true); };
  const openEdit = (r: any) => {
    setEdit(r); setErrors({});
    const f = buildEmpty();
    schema.fields.forEach((fd) => { if (r[fd.key] !== undefined) f[fd.key] = r[fd.key]; });
    f.code = r.code; f.name = r.name; f.description = r.description ?? ''; f.status = r.status;
    setForm(f); setShow(true);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    schema.fields.forEach((fd) => {
      const v = form[fd.key];
      if (fd.required && (v === '' || v == null)) e[fd.key] = `${fd.label} is required`;
      if (fd.type === 'number' && v !== '' && v != null && isNaN(Number(v))) e[fd.key] = `${fd.label} must be a number`;
      if (fd.type === 'number' && fd.min != null && Number(v) < fd.min) e[fd.key] = `${fd.label} must be ≥ ${fd.min}`;
      if (fd.type === 'email' && v && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) e[fd.key] = 'Invalid email';
    });
    // duplicate code check (client-side)
    const dup = rows.find((r) => r.code?.toLowerCase() === String(form.code).toLowerCase() && (!edit || r.id !== edit.id));
    if (dup) e.code = `${codeLabel} "${form.code}" already exists`;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async () => {
    if (!validate()) { setToast({ msg: 'Please fix the highlighted fields', type: 'err' }); return; }
    setBusy(true);
    // split base vs extra
    const base: any = { code: form.code, name: form.name, description: form.description ?? '', status: form.status };
    const extra: any = {};
    schema.fields.forEach((fd) => { if (!BASE_KEYS.includes(fd.key)) extra[fd.key] = form[fd.key]; });
    try {
      if (edit) await apiSend('/api/generic', 'PUT', { id: edit.id, ...base, extra });
      else await apiSend('/api/generic', 'POST', { module: moduleKey, ...base, extra });
      setToast({ msg: edit ? 'Record updated successfully' : 'Record created successfully', type: 'ok' });
      setShow(false); load();
    } catch { setToast({ msg: 'Save failed', type: 'err' }); } finally { setBusy(false); }
  };

  const del = async (id: number) => {
    try { await apiSend('/api/generic', 'DELETE', { id }); setToast({ msg: 'Record deleted', type: 'ok' }); setView(null); load(); }
    catch { setToast({ msg: 'Delete failed', type: 'err' }); }
  };
  const toggleStatus = async (r: any) => {
    try { await apiSend('/api/generic', 'PUT', { id: r.id, status: r.status === 'Active' ? 'Inactive' : 'Active' }); load(); }
    catch { setToast({ msg: 'Update failed', type: 'err' }); }
  };

  const colFields = schema.fields.filter((f) => f.col && f.key !== 'status');
  const fmtVal = (fd: MField, v: any) => fd.type === 'checkbox' ? (Number(v) ? 'Yes' : 'No') : (v ?? '—');

  const exportCsv = () => { if (moduleKey === 'sku-group' && !filtered.length) { setToast({ msg: 'No data in grid to export', type: 'err' }); return; } requestDownload({
    title, module: moduleKey, baseName: moduleKey,
    data: {
      columns: [...colFields.map((f) => f.label), 'Status', 'Created'],
      rows: filtered.map((r) => [...colFields.map((f) => fmtVal(f, r[f.key])), r.status, r.created_date]),
    },
  }); };

  const cols: GCol[] = [
    ...colFields.map((f, i): GCol => ({
      key: f.key, label: f.label,
      render: i === 0
        ? (r: any) => <button onClick={() => setView(r)} className="font-medium text-[#2f7fb6] hover:underline">{r[f.key]}</button>
        : (r: any) => <span className="text-slate-700">{fmtVal(f, r[f.key])}</span>,
    })),
    { key: 'created_date', label: 'Created' },
    { key: 'status', label: 'Status', render: (r) => <button onClick={() => toggleStatus(r)} title="Toggle status"><Pill status={r.status === 'Active' ? 'Completed' : 'Open'} /></button> },
    { key: 'act', label: 'Actions', render: (r) => (
      <div className="flex gap-1">
        <button onClick={() => setView(r)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100" title="View"><Eye size={15} /></button>
        <button onClick={() => openEdit(r)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100" title="Edit"><Pencil size={15} /></button>
        <button onClick={() => del(r.id)} className="rounded p-1.5 text-rose-500 hover:bg-rose-50" title="Delete"><Trash2 size={15} /></button>
      </div>
    ) },
  ];

  const renderField = (fd: MField) => {
    const v = form[fd.key];
    const set = (nv: any) => setForm({ ...form, [fd.key]: nv });
    const err = errors[fd.key];
    const cls = `inp ${err ? 'border-rose-400 ring-1 ring-rose-300' : ''}`;
    return (
      <div key={fd.key}>
        <label className="lbl">{fd.label}{fd.required && <span className="text-rose-500"> *</span>}</label>
        {fd.type === 'select' ? (
          <select value={v} onChange={(e) => set(e.target.value)} className={cls}>
            {(fd.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : fd.type === 'textarea' ? (
          <textarea value={v} onChange={(e) => set(e.target.value)} className={cls} rows={2} placeholder={fd.placeholder} />
        ) : fd.type === 'checkbox' ? (
          <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" className="accent-[#2f9e9e]" checked={!!Number(v)} onChange={(e) => set(e.target.checked ? 1 : 0)} /> {fd.help || 'Enabled'}</label>
        ) : (
          <input type={fd.type === 'number' ? 'number' : fd.type === 'date' ? 'date' : 'text'} value={v} onChange={(e) => set(e.target.value)} className={cls} placeholder={fd.placeholder} min={fd.min} />
        )}
        {err && <p className="mt-0.5 text-xs text-rose-500">{err}</p>}
      </div>
    );
  };

  return (
    <Shell active={active} breadcrumb={breadcrumb} openScreens={[{ label: title, to: '#' }]}>
      {/* Filter bar */}
      <div className="mb-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="lbl">Search</label>
            <div className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2">
              <Search size={15} className="text-slate-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`${codeLabel}, ${nameLabel}…`} className="w-56 text-sm outline-none" />
              {q && <button onClick={() => setQ('')} className="text-slate-400 hover:text-rose-500"><X size={13} /></button>}
            </div>
          </div>
          <div>
            <label className="lbl">Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="inp min-w-[140px]">
              <option>All</option><option>Active</option><option>Inactive</option>
            </select>
          </div>
          <Btn variant="ghost" onClick={resetFilters}><Filter size={14} /> Reset</Btn>
          <div className="ml-auto flex items-end gap-2">
            <Btn onClick={openNew}><Plus size={15} /> Add New</Btn>
            <Btn variant="ghost" onClick={exportCsv}><Download size={15} /> Export</Btn>
            <Btn variant="ghost" onClick={load}><RefreshCw size={15} /> Refresh</Btn>
          </div>
        </div>
        {schema.usedBy && (
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400">
            <GitBranch size={12} className="text-[#2f9e9e]" /> Downstream: used by <span className="font-medium text-slate-500">{schema.usedBy}</span>
          </div>
        )}
      </div>

      <Panel title={title}>
        <ToolBar>
          <span className="text-xs text-slate-500">Showing <b>{pagedRows.length}</b> of {filtered.length} matching record(s){statusFilter !== 'All' ? ` · filtered by ${statusFilter}` : ''}</span>
        </ToolBar>
        <OrderGrid cols={cols} rows={pagedRows} loading={loading} empty="No records found — click Add New to create one" />
        <div className="mt-3 flex flex-wrap items-center justify-end gap-2 text-sm text-slate-600">
          <button type="button" onClick={() => setPage(0)} disabled={activePage === 0} className="rounded border border-slate-300 px-2 py-1 disabled:cursor-not-allowed disabled:opacity-40" aria-label="First page">First</button>
          <button type="button" onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={activePage === 0} className="rounded border border-slate-300 px-2 py-1 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Previous page">Previous</button>
          <span aria-live="polite">Page {filtered.length ? activePage + 1 : 0} of {filtered.length ? pageCount : 0}</span>
          <button type="button" onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))} disabled={!filtered.length || activePage >= pageCount - 1} className="rounded border border-slate-300 px-2 py-1 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Next page">Next</button>
          <button type="button" onClick={() => setPage(pageCount - 1)} disabled={!filtered.length || activePage >= pageCount - 1} className="rounded border border-slate-300 px-2 py-1 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Last page">Last</button>
          <label className="flex items-center gap-1">Page size
            <select aria-label="Page size" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(0); }} className="rounded border border-slate-300 px-2 py-1">
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </label>
        </div>
      </Panel>

      {/* Detail view */}
      <Modal title={`${title} — ${view?.code || ''}`} open={!!view} onClose={() => setView(null)} wide>
        {view && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <Pill status={view.status === 'Active' ? 'Completed' : 'Open'} />
              <span className="text-sm text-slate-400">Created {view.created_date}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
              {schema.fields.filter((f) => f.key !== 'status').map((f) => (
                <div key={f.key} className={f.type === 'textarea' ? 'col-span-full' : ''}>
                  <p className="text-xs text-slate-400">{f.label}</p>
                  <p className="font-medium text-slate-700">{fmtVal(f, view[f.key]) || '—'}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Btn variant="ghost" onClick={() => { setView(null); openEdit(view); }}><Pencil size={14} /> Edit</Btn>
              <Btn variant="danger" onClick={() => del(view.id)}><Trash2 size={14} /> Delete</Btn>
            </div>
          </div>
        )}
      </Modal>

      {/* Create/Edit — schema-driven */}
      <Modal title={edit ? `Edit ${title}` : `Add ${title}`} open={show} onClose={() => setShow(false)} wide>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {schema.fields.filter((f) => f.type !== 'textarea' && f.type !== 'checkbox').map(renderField)}
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3">
          {schema.fields.filter((f) => f.type === 'textarea' || f.type === 'checkbox').map(renderField)}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Btn variant="ghost" onClick={() => setShow(false)}>Cancel</Btn>
          <Btn onClick={save} disabled={busy}>{busy ? 'Saving…' : edit ? 'Update' : 'Create'}</Btn>
        </div>
      </Modal>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </Shell>
  );
}
