/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect -- Tally payloads are heterogeneous configuration maps loaded by the initial synchronization effect. */
import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, HelpCircle, Info, RotateCcw, Save, X } from 'lucide-react';
import Shell from '../Shell';
import { apiGet, apiSend } from '../../lib/api';

type Tab = 'sales' | 'purchase';
type PartyType = 'Marketplace' | 'Transporter' | 'B2B Customer' | 'Vendor';
type AliasRow = { id?: number; source_code: string; source_name: string; party_type: PartyType; tally_name?: string; voucher_type?: string; return_voucher_type?: string; local_ledger?: string; interstate_ledger?: string };
type Snapshot = { config: Record<string, any>; aliases: AliasRow[]; sources: Record<PartyType, AliasRow[]>; companies: any[]; audit: any[] };

const defaults: Record<string, any> = {
  sales_voucher_type: '', sales_voucher_number: 'Invoice Number', sales_reference_number: 'Extern orderno', sales_date: 'Invoice Date',
  sales_return_voucher_type: '', sales_return_voucher_number: 'Return Number', sales_return_reference_number: 'Extern orderno', sales_return_date: 'Return Date',
  sales_ledger_type: 'Local/Interstate', sales_with_tax_percent: true, sales_ledger_name: '', sales_local_ledger: '', sales_interstate_ledger: '',
  sales_tax_with_percent: false, sales_sgst_ledger: '', sales_cgst_ledger: '', sales_igst_ledger: '', sales_party_type: 'Marketplace',
  purchase_voucher_type: '', purchase_voucher_number: 'Inbound Number', purchase_reference_number: 'PO Code', purchase_date: 'Inbound Date',
  purchase_return_voucher_type: '', purchase_return_voucher_number: 'Return Number', purchase_return_date: 'Return Date',
  purchase_ledger_type: 'Item wise', purchase_with_tax_percent: false, purchase_ledger_name: '', purchase_local_ledger: '', purchase_interstate_ledger: '',
  purchase_tax_with_percent: false, purchase_sgst_ledger: '', purchase_cgst_ledger: '', purchase_igst_ledger: '', purchase_party_type: 'Vendor',
};

const unavailableSnapshot: Snapshot = { config: defaults, aliases: [], sources: { Marketplace: [], Transporter: [], 'B2B Customer': [], Vendor: [] }, companies: [], audit: [] };

const salesVoucher = ['External Invoice Number', 'Invoice Number', 'External Order Number'];
const salesReference = ['Invoice Number', 'External Order Number', 'Extern orderno'];
const salesDates = ['Invoice Date', 'Order Date', 'Shipping Date'];
const returnReference = ['Invoice Number', 'Return Number', 'External Order Number', 'Extern orderno'];
const returnDates = ['Return Date', 'Received Date'];
const purchaseVoucher = ['Inbound Number', 'GRN', 'PO Code'];
const purchaseReference = ['GRN Number', 'Invoice Number', 'PO Code'];

function missingFields(config: Record<string, any>) {
  const fields = ['sales_voucher_number','sales_reference_number','sales_date','sales_return_voucher_number','sales_return_reference_number','sales_return_date','sales_ledger_type','sales_sgst_ledger','sales_cgst_ledger','sales_igst_ledger','purchase_voucher_number','purchase_reference_number','purchase_date','purchase_return_voucher_number','purchase_return_date','purchase_ledger_type','purchase_sgst_ledger','purchase_cgst_ledger','purchase_igst_ledger'];
  fields.push(config.sales_ledger_type === 'Item wise' ? 'sales_ledger_name' : 'sales_local_ledger');
  if (config.sales_ledger_type === 'Local/Interstate') fields.push('sales_interstate_ledger');
  fields.push(config.purchase_ledger_type === 'Item wise' ? 'purchase_ledger_name' : 'purchase_local_ledger');
  if (config.purchase_ledger_type === 'Local/Interstate') fields.push('purchase_interstate_ledger');
  return fields.filter((key) => !String(config[key] || '').trim());
}

const fieldClass = 'h-9 w-[295px] max-w-full rounded border border-slate-300 bg-white px-3 text-[15px] text-slate-700 outline-none focus:border-[#298db8]';
const button = 'inline-flex h-10 items-center gap-2 rounded border border-slate-300 px-5 text-sm font-medium disabled:opacity-50';

function Hint({ text }: { text: string }) { return <span title={text} className="inline-flex cursor-help text-[#2b91ba]"><HelpCircle size={18} /></span>; }
function Label({ children, required, hint }: { children: React.ReactNode; required?: boolean; hint?: string }) { return <span className="flex items-center justify-end gap-1 text-right text-[15px] text-slate-700">{children}{required && <b>*</b>}{hint && <Hint text={hint} />}</span>; }

function TextField({ label, value, onChange, placeholder, required, hint, error }: any) {
  return <><Label required={required} hint={hint}>{label}</Label><input aria-label={label} className={`${fieldClass} ${error ? 'border-red-500 bg-red-50' : ''}`} value={value || ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} /></>;
}
function SelectField({ label, value, onChange, options, required, hint, error }: any) {
  return <><Label required={required} hint={hint}>{label}</Label><select aria-label={label} className={`${fieldClass} ${error ? 'border-red-500 bg-red-50' : ''}`} value={value} onChange={(e) => onChange(e.target.value)}>{options.map((option: string) => <option key={option}>{option}</option>)}</select></>;
}
function CheckField({ label, checked, onChange, hint }: any) {
  return <><Label hint={hint}>{label}</Label><label className="flex h-9 items-center"><input aria-label={label} type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-[#298db8]" /></label></>;
}

function Details({ mode, form, set, errors }: { mode: Tab; form: any; set: (key: string, value: any) => void; errors: Set<string> }) {
  const sales = mode === 'sales';
  const prefix = sales ? 'sales' : 'purchase';
  return <div className="grid grid-cols-1 border-b border-slate-200 lg:grid-cols-2">
    <section className="px-8 py-5"><h2 className="mb-5 text-center text-[25px] font-normal text-slate-700">{sales ? 'Sales Details' : 'Purchase Details'}</h2><div className="mx-auto grid max-w-[560px] grid-cols-[180px_1fr] items-center gap-x-3 gap-y-2">
      <TextField label="Voucher Type" value={form[`${prefix}_voucher_type`]} onChange={(v: string) => set(`${prefix}_voucher_type`, v)} placeholder={sales ? 'E.g Sales' : 'E.g Purchase'} hint="Tally voucher type; editable when your Tally terminology differs." />
      <SelectField label="Voucher Number" required value={form[`${prefix}_voucher_number`]} onChange={(v: string) => set(`${prefix}_voucher_number`, v)} options={sales ? salesVoucher : purchaseVoucher} error={errors.has(`${prefix}_voucher_number`)} hint="Source document number sent as the voucher number." />
      <SelectField label="Reference Number" required value={form[`${prefix}_reference_number`]} onChange={(v: string) => set(`${prefix}_reference_number`, v)} options={sales ? salesReference : purchaseReference} error={errors.has(`${prefix}_reference_number`)} hint="Source document number sent as the Tally reference." />
      <SelectField label="Date" required value={form[`${prefix}_date`]} onChange={(v: string) => set(`${prefix}_date`, v)} options={sales ? salesDates : ['Inbound Date']} error={errors.has(`${prefix}_date`)} hint="Source date used for the voucher." />
    </div></section>
    <section className="px-8 py-5"><h2 className="mb-5 text-center text-[25px] font-normal text-slate-700">{sales ? 'Sales Return Details' : 'Purchase Return Details'}</h2><div className="mx-auto grid max-w-[560px] grid-cols-[190px_1fr] items-center gap-x-3 gap-y-2">
      <TextField label="Voucher Type" value={form[`${prefix}_return_voucher_type`]} onChange={(v: string) => set(`${prefix}_return_voucher_type`, v)} placeholder={sales ? 'E.g Credit Note' : 'E.g Purchase Return'} hint="Tally voucher type used for returns." />
      <SelectField label="Voucher Number" required value={form[`${prefix}_return_voucher_number`]} onChange={(v: string) => set(`${prefix}_return_voucher_number`, v)} options={['Return Number']} error={errors.has(`${prefix}_return_voucher_number`)} hint="Return number sent as the return voucher number." />
      {sales && <SelectField label="Reference Number" required value={form.sales_return_reference_number} onChange={(v: string) => set('sales_return_reference_number', v)} options={returnReference} error={errors.has('sales_return_reference_number')} hint="Source number sent as the return reference." />}
      <SelectField label="Date" required value={form[`${prefix}_return_date`]} onChange={(v: string) => set(`${prefix}_return_date`, v)} options={returnDates} error={errors.has(`${prefix}_return_date`)} hint="Source return date sent to Tally." />
    </div></section>
  </div>;
}

function Ledgers({ mode, form, set, errors }: { mode: Tab; form: any; set: (key: string, value: any) => void; errors: Set<string> }) {
  const sales = mode === 'sales'; const prefix = sales ? 'sales' : 'purchase'; const type = form[`${prefix}_ledger_type`];
  return <div className="grid grid-cols-1 lg:grid-cols-2">
    <section className="px-8 py-6"><h2 className="mb-5 text-center text-[25px] font-normal text-slate-700">{sales ? 'Sales Ledger Name' : 'Expense Ledger Name'}</h2><div className="mx-auto grid max-w-[580px] grid-cols-[190px_1fr] items-center gap-x-3 gap-y-2">
      <SelectField label={sales ? 'Sales Ledger Type' : 'Purchase Ledger Type'} required value={type} onChange={(v: string) => set(`${prefix}_ledger_type`, v)} options={['Item wise', 'Local/Interstate']} error={errors.has(`${prefix}_ledger_type`)} hint="Choose a single item-wise ledger or separate local/interstate ledgers." />
      <CheckField label="With Tax Percent" checked={form[`${prefix}_with_tax_percent`]} onChange={(v: boolean) => set(`${prefix}_with_tax_percent`, v)} hint="Include the tax percentage in the ledger mapping." />
      {type === 'Item wise' ? <TextField label={sales ? 'Sales' : 'Purchase'} required value={form[`${prefix}_ledger_name`]} onChange={(v: string) => set(`${prefix}_ledger_name`, v)} placeholder={`Enter ${sales ? 'Sales' : 'Purchase'} Ledger Name`} error={errors.has(`${prefix}_ledger_name`)} /> : <><TextField label="For Local" required value={form[`${prefix}_local_ledger`]} onChange={(v: string) => set(`${prefix}_local_ledger`, v)} placeholder="Enter Local Ledger Name" error={errors.has(`${prefix}_local_ledger`)} /><TextField label="For Interstate" required value={form[`${prefix}_interstate_ledger`]} onChange={(v: string) => set(`${prefix}_interstate_ledger`, v)} placeholder="Enter Interstate Ledger Name" error={errors.has(`${prefix}_interstate_ledger`)} /></>}
    </div></section>
    <section className="px-8 py-6"><h2 className="mb-5 text-center text-[25px] font-normal text-slate-700">Tax Ledger Name</h2><div className="mx-auto grid max-w-[560px] grid-cols-[190px_1fr] items-center gap-x-3 gap-y-2">
      <CheckField label="With Tax Percent" checked={form[`${prefix}_tax_with_percent`]} onChange={(v: boolean) => set(`${prefix}_tax_with_percent`, v)} hint="Include the tax percentage in Tally tax ledger names." />
      <TextField label="SGST/UTGST" required value={form[`${prefix}_sgst_ledger`]} onChange={(v: string) => set(`${prefix}_sgst_ledger`, v)} placeholder={`E.g. ${sales ? 'Output' : 'Input'} SGST`} error={errors.has(`${prefix}_sgst_ledger`)} />
      <TextField label="CGST" required value={form[`${prefix}_cgst_ledger`]} onChange={(v: string) => set(`${prefix}_cgst_ledger`, v)} placeholder={`E.g. ${sales ? 'Output' : 'Input'} CGST`} error={errors.has(`${prefix}_cgst_ledger`)} />
      <TextField label="IGST" required value={form[`${prefix}_igst_ledger`]} onChange={(v: string) => set(`${prefix}_igst_ledger`, v)} placeholder={`E.g. ${sales ? 'Output' : 'Input'} IGST`} error={errors.has(`${prefix}_igst_ledger`)} />
    </div></section>
  </div>;
}

function AliasModal({ partyType, source, saved, close, persist }: { partyType: PartyType; source: AliasRow[]; saved: AliasRow[]; close: () => void; persist: (rows: AliasRow[]) => Promise<void> }) {
  const merged = useMemo(() => source.map((row) => ({ ...row, ...(saved.find((item) => item.party_type === partyType && item.source_code === row.source_code) || {}) })), [source, saved, partyType]);
  const [rows, setRows] = useState(merged); const [page, setPage] = useState(1); const [size, setSize] = useState(10); const [busy, setBusy] = useState(false);
  const pages = Math.max(1, Math.ceil(rows.length / size)); const shown = rows.slice((page - 1) * size, page * size);
  const updateRow = (code: string, key: keyof AliasRow, value: string) => setRows((old) => old.map((row) => row.source_code === code ? { ...row, [key]: value } : row));
  const sales = partyType !== 'Vendor';
  const headings = [partyType === 'Marketplace' ? 'Channel Code' : partyType === 'Transporter' ? 'Transporter Code' : 'Customer Code', partyType === 'Marketplace' ? 'Channel Name' : `${partyType} Name`, `Tally ${partyType === 'Marketplace' ? 'Channel' : partyType.replace('B2B ', '')} Name`, sales ? 'Sales Voucher Type' : 'Purchase Voucher Type', sales ? 'Returns Voucher Type' : 'P_Returns Voucher Type', 'Ledger Name (Local)', 'Ledger Name (Interstate)'];
  return <div className="fixed inset-0 z-[100] grid place-items-center bg-black/55 p-4"><div className="w-[1350px] max-w-[98vw] overflow-hidden bg-white shadow-2xl"><div className="flex items-center justify-between bg-[#3b95bd] px-5 py-3 text-2xl text-white"><span className="mx-auto">{partyType} Alias Name</span><button aria-label="Close alias window" onClick={close}><X /></button></div><div className="overflow-x-auto p-2"><table className="w-full min-w-[1180px] border-collapse text-[14px]"><thead><tr className="bg-[#eeedf3]">{headings.map((heading) => <th key={heading} className="whitespace-nowrap border border-slate-400 px-2 py-2 font-bold">{heading}</th>)}</tr></thead><tbody>{shown.map((row, index) => <tr key={row.source_code} className={index % 2 ? 'bg-[#eeedf7]' : 'bg-white'}><td className="border-y border-slate-200 px-2 py-1">{row.source_code}</td><td className="border-y border-slate-200 px-2 py-1">{row.source_name}</td>{(['tally_name', 'voucher_type', 'return_voucher_type', 'local_ledger', 'interstate_ledger'] as const).map((key) => <td key={key} className="border-y border-slate-200 p-1"><input aria-label={`${row.source_name} ${key}`} className="h-9 w-full rounded border border-slate-300 bg-white px-2 outline-none focus:border-[#298db8]" value={row[key] || ''} onChange={(e) => updateRow(row.source_code, key, e.target.value)} /></td>)}</tr>)}</tbody></table><div className="flex h-11 items-center justify-between bg-[#e8e8f0] px-4 text-sm text-slate-600"><span /><div className="flex items-center gap-3"><button disabled={page === 1} onClick={() => setPage(1)}>┃◀</button><button disabled={page === 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft size={17} /></button><span>Page <b className="rounded bg-white px-4 py-1">{page}</b> of {pages}</span><button disabled={page === pages} onClick={() => setPage((p) => p + 1)}><ChevronRight size={17} /></button><button disabled={page === pages} onClick={() => setPage(pages)}>▶┃</button><select value={size} onChange={(e) => { setSize(Number(e.target.value)); setPage(1); }} className="border bg-white px-2 py-1"><option>10</option><option>20</option><option>50</option></select></div><span>{rows.length ? `View ${(page - 1) * size + 1} - ${Math.min(page * size, rows.length)} of ${rows.length}` : 'No records to view'}</span></div></div><div className="flex justify-end gap-3 px-5 pb-4"><button disabled={busy} className={`${button} border-[#df9000] bg-[#ea9900] text-white`} onClick={async () => { setBusy(true); try { await persist(rows); } finally { setBusy(false); } }}><Save size={17} />{busy ? 'Saving…' : 'Save'}</button><button className={button} onClick={close}>Close</button></div></div></div>;
}

function AuditModal({ rows, close }: { rows: any[]; close: () => void }) { return <div className="fixed inset-0 z-[100] grid place-items-center bg-black/55 p-4"><div className="w-[850px] max-w-[95vw] bg-white"><div className="flex justify-between bg-[#3b95bd] px-4 py-3 text-xl text-white"><span>Tally Configuration Audit</span><button onClick={close}><X /></button></div><table className="w-full text-sm"><thead className="bg-[#eeedf3]"><tr>{['Date','Action','Description','Changed By'].map((x) => <th key={x} className="border p-2">{x}</th>)}</tr></thead><tbody>{rows.slice(0,20).map((row) => <tr key={row.id}><td className="border p-2">{row.changed_at ? new Date(row.changed_at).toLocaleString() : ''}</td><td className="border p-2">{row.action}</td><td className="border p-2">{row.name}</td><td className="border p-2">{row.changed_by}</td></tr>)}{!rows.length && <tr><td colSpan={4} className="h-32 text-center text-slate-400">No records to view</td></tr>}</tbody></table><div className="flex justify-end p-4"><button className={button} onClick={close}>Close</button></div></div></div>; }

export default function TallyConfiguration() {
  const [tab, setTab] = useState<Tab>('sales'); const [snapshot, setSnapshot] = useState<Snapshot | null>(null); const [form, setForm] = useState(defaults); const [errors, setErrors] = useState<Set<string>>(new Set()); const [alias, setAlias] = useState<PartyType | null>(null); const [audit, setAudit] = useState(false); const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(true); const [loadError, setLoadError] = useState(''); const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null);
  const load = async () => { setLoading(true); try { const data = await apiGet<Snapshot>('/api/tally-config'); setSnapshot(data); setForm({ ...defaults, ...data.config }); setLoadError(''); } catch { setSnapshot(unavailableSnapshot); setForm({ ...defaults }); setLoadError('Tally configuration service is unavailable. Restart the API server, then retry.'); setNotice({ text: 'Unable to load Tally Configuration.', error: true }); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, []);
  const set = (key: string, value: any) => { setForm((old) => ({ ...old, [key]: value })); setErrors((old) => { const next = new Set(old); next.delete(key); return next; }); };
  const save = async () => { const missing = missingFields(form); if (missing.length) { setErrors(new Set(missing)); setTab(missing[0].startsWith('purchase_') ? 'purchase' : 'sales'); setNotice({ text: 'Please enter all mandatory fields.', error: true }); return; } setBusy(true); try { const data = await apiSend<Snapshot>('/api/tally-config', 'PUT', { action: 'config', config: form }); setSnapshot(data); setForm({ ...defaults, ...data.config }); setErrors(new Set()); setNotice({ text: 'Configuration saved successfully.' }); } catch (error: any) { setNotice({ text: error.message || 'Unable to save configuration.', error: true }); } finally { setBusy(false); } };
  const reset = () => { setForm({ ...defaults }); setErrors(new Set()); setNotice({ text: 'Configuration reset to default values.' }); };
  const partyType = (tab === 'sales' ? form.sales_party_type : form.purchase_party_type) as PartyType;
  const saveAliases = async (rows: AliasRow[]) => { const data = await apiSend<Snapshot>('/api/tally-config', 'PUT', { action: 'aliases', party_type: alias, rows }); setSnapshot(data); setAlias(null); setNotice({ text: `${alias} alias names saved successfully.` }); };
  return <Shell active="master" breadcrumb="Master > Configuration Setting" openScreens={[{ label: 'Tally Configuration', to: '#' }, { label: 'Manage Api', to: '/app/admin/manage-api' }]}><div className="relative min-h-[calc(100vh-174px)] overflow-hidden border border-slate-300 bg-white">
    <div className="flex justify-end gap-2 border-b bg-white p-2"><button disabled={busy || !!loadError} onClick={save} className={`${button} border-[#df9000] bg-[#ea9900] text-white`}><Save size={17} />{busy ? 'Saving…' : 'Save'}</button><button onClick={reset} className={button}><RotateCcw size={17} />Reset</button><button onClick={() => setAudit(true)} className={`${button} border-[#12afc1] bg-[#13bdd0] text-white`}><Info size={17} />Audit</button></div>
    {loadError && <div className="flex items-center justify-between border-b border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900"><span>{loadError}</span><button onClick={load} className="rounded border border-amber-400 bg-white px-4 py-1 font-semibold">Retry</button></div>}
    <div className="flex items-center gap-3 border-b px-8 py-4"><Label required>Company</Label><select aria-label="Company" className={fieldClass} value={form.company_id || '-1'} onChange={(e) => set('company_id', e.target.value)}><option value="-1">--- Default ---</option>{(snapshot?.companies || []).map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></div>
    <div className="flex h-11 border-b bg-[#efeff5]"><button onClick={() => setTab('sales')} className={`px-5 text-[16px] font-semibold ${tab === 'sales' ? 'border-b-2 border-red-500 bg-white' : ''}`}>Sales And Sales Return</button><button onClick={() => setTab('purchase')} className={`px-5 text-[16px] font-semibold ${tab === 'purchase' ? 'border-b-2 border-red-500 bg-white' : ''}`}>Purchase And Purchase Returns</button></div>
    <Details mode={tab} form={form} set={set} errors={errors} /><Ledgers mode={tab} form={form} set={set} errors={errors} />
    <fieldset className="mx-4 mb-5 border border-slate-300 px-8 pb-7 pt-4"><legend className="px-2 text-lg text-slate-500">Party Name Configuration</legend><div className="flex items-center gap-4"><Label hint="Select the Party Name and click on Alias Name to enter the Tally-specific party name.">Party Name</Label><select aria-label="Party Name" value={partyType} onChange={(e) => set(tab === 'sales' ? 'sales_party_type' : 'purchase_party_type', e.target.value)} className={fieldClass}>{(tab === 'sales' ? ['Marketplace','Transporter','B2B Customer'] : ['Vendor']).map((x) => <option key={x}>{x}</option>)}</select><button onClick={() => setAlias(partyType)} className="text-[15px] text-[#278db8] hover:underline">Alias Name</button></div></fieldset>
    {loading && <div className="absolute inset-0 grid place-items-center bg-white/70"><div className="h-9 w-9 animate-spin rounded-full border-4 border-[#2b91ba] border-r-transparent" /></div>}
    {notice && <div className={`fixed right-5 top-20 z-[120] flex min-w-[350px] justify-between border px-5 py-4 shadow-lg ${notice.error ? 'border-red-300 bg-red-50 text-red-800' : 'border-emerald-300 bg-emerald-50 text-emerald-800'}`}><span>{notice.text}</span><button onClick={() => setNotice(null)}><X size={17} /></button></div>}
    {alias && snapshot && <AliasModal partyType={alias} source={snapshot.sources[alias] || []} saved={snapshot.aliases} close={() => setAlias(null)} persist={saveAliases} />}{audit && snapshot && <AuditModal rows={snapshot.audit} close={() => setAudit(false)} />}
  </div></Shell>;
}
