import { useEffect, useState } from 'react';
import { ChevronRight, Save, RotateCcw } from 'lucide-react';
import Shell from '../Shell';
import { apiGet, apiSend } from '../../lib/api';
import { Toast } from '../parts';

type Row = { id: number; code: string; name: string; description: string; hierarchy_type?: string; parent_hierarchy_code?: string; org_country?: string; base_currency?: string; base_language?: string; timezone?: string; weight_unit?: string; dimension_unit?: string; financial_start_date?: string; locale?: string };
const blank = { code: '', name: '', description: '', hierarchy_type: '', parent_hierarchy_code: '', org_country: '', base_currency: '', base_language: '', timezone: '', weight_unit: '', dimension_unit: '', financial_start_date: '', locale: '' };
const COUNTRIES = ['INDIA', 'INDONESIA', 'MALAYSIA', 'SINGAPORE', 'THAILAND', 'UNITED ARAB EMIRATES', 'UNITED KINGDOM', 'UNITED STATES'];
const CURRENCIES = ['THB', 'INR', 'USD', 'SGD', 'CAD', 'EUR', 'HKD', 'JPY', 'MYR', 'PHP', 'GBP', 'RUB', 'SAR', 'CHF', 'TWD', 'AED', 'IDR', 'VND', 'OMR', 'JOD', 'LBP', 'BHD', 'KWD', 'CNY', 'EGP'];
const LANGUAGES = ['English', 'Thai/ไทย', 'Bahasa', 'Simple Chinese/简单的中文', 'Vietnamese/Tiếng Việt', 'Hindi/हिंदी', 'Traditional Chinese/繁體中文', 'Arabic (Saudi Arabia)'];
const TIMEZONES = ['(GMT+05:30) Asia/Kolkata', '(GMT+07:00) Asia/Bangkok', '(GMT+08:00) Asia/Singapore', '(GMT+04:00) Asia/Dubai', '(GMT+00:00) Europe/London'];

export default function OrganizationHierarchy() {
  const [rows, setRows] = useState<Row[]>([]), [form, setForm] = useState<any>(blank), [edit, setEdit] = useState<Row | null>(null), [busy, setBusy] = useState(false), [toast, setToast] = useState<{msg:string;type:'ok'|'err'} | null>(null);
  const load = async () => { const result: any = await apiGet('/api/org-hierarchy'); setRows(result.rows || []); };
  useEffect(() => { load().catch(() => setToast({ msg: 'Failed to load organization hierarchy', type: 'err' })); }, []);
  const reset = () => { setForm(blank); setEdit(null); };
  const pick = (row: Row) => { setEdit(row); setForm({ ...blank, ...row }); };
  const save = async () => { setBusy(true); try { await apiSend('/api/org-hierarchy', edit ? 'PUT' : 'POST', edit ? { ...form, id: edit.id } : form); setToast({ msg: edit ? 'Organization hierarchy updated' : 'Organization hierarchy saved', type: 'ok' }); reset(); await load(); } catch (error: any) { setToast({ msg: error.message, type: 'err' }); } finally { setBusy(false); } };
  const renderTree = (parent = '', depth = 0): React.ReactNode => rows.filter((row) => (row.parent_hierarchy_code || '') === parent).map((row) => <div key={row.id}><button onClick={() => pick(row)} className={`flex w-full items-center gap-1 rounded px-2 py-1.5 text-left text-sm hover:bg-sky-50 ${edit?.id === row.id ? 'bg-sky-100 text-sky-800' : 'text-slate-700'}`} style={{ paddingLeft: 8 + depth * 18 }}><ChevronRight size={13} />{row.name}</button>{renderTree(row.code, depth + 1)}</div>);
  const field = (label: string, key: string, required = false) => <label className="grid grid-cols-[190px_1fr] items-center gap-3 text-sm"><span className="text-right text-slate-600">{label}{required && <b className="text-red-500">*</b>} :</span><input className="inp" value={form[key]} disabled={key === 'code' && !!edit} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></label>;
  const select = (label: string, key: string, options: string[], required = false) => <label className="grid grid-cols-[190px_1fr] items-center gap-3 text-sm"><span className="text-right text-slate-600">{label}{required && <b className="text-red-500">*</b>} :</span><select className="inp" value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}><option value="">--- Select ---</option>{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
  return <Shell active="master" breadcrumb="MASTER > Organization Management > Organization Hierarchy" openScreens={[{ label: 'Organization Hierarchy', to: '#' }]}>
    <div className="mb-2 flex justify-end gap-2"><button onClick={save} disabled={busy} className="flex items-center gap-1 rounded bg-[#f5a623] px-4 py-2 text-sm font-medium text-white"><Save size={14} />{busy ? 'Saving…' : 'Save'}</button><button onClick={reset} className="flex items-center gap-1 rounded border bg-white px-4 py-2 text-sm text-slate-600"><RotateCcw size={14} />Reset</button></div>
    <div className="flex items-center gap-1 text-sm text-slate-500">Master <ChevronRight size={13}/> Organization Management <ChevronRight size={13}/> <b>Organization Hierarchy</b></div>
    <div className="mt-3 grid gap-3 lg:grid-cols-[320px_1fr]">
      <section className="min-h-[560px] rounded border bg-white p-3"><h2 className="mb-2 border-b pb-2 text-sm font-semibold text-slate-700">Organisation Hierarchy</h2>{renderTree()}</section>
      <section className="rounded border bg-white"><h2 className="border-b-4 border-[#2f9e9e] bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">Organization Hierarchy</h2><div className="grid gap-3 p-5">
        {select('Hierarchy Type', 'hierarchy_type', ['Company'], true)}{field('Hierarchy Code', 'code', true)}{field('Hierarchy Name', 'name', true)}{field('Description', 'description', true)}
        {select('Parent Hierarchy Code', 'parent_hierarchy_code', rows.filter((row) => row.id !== edit?.id).map((row) => row.code))}
        <div className="grid grid-cols-[190px_1fr] gap-3 text-sm"><span className="text-right text-slate-600">Parent Hierarchy Desc :</span><span className="py-2 text-slate-700">{rows.find((row) => row.code === form.parent_hierarchy_code)?.description || ''}</span></div>
        {select('Org Country', 'org_country', COUNTRIES)}{select('Base Currency', 'base_currency', CURRENCIES)}{select('Base Language', 'base_language', LANGUAGES)}{select('Time Zone', 'timezone', TIMEZONES)}{select('Org Weight Unit', 'weight_unit', ['GM', 'KG', 'OZ', 'LBS'])}{select('Org Dimension Unit', 'dimension_unit', ['MM', 'CM', 'MTR', 'IN'])}{select('Financial Start Date', 'financial_start_date', ['01-Jan', '01-Apr'])}{select('Locale', 'locale', ['en-IN', 'id-ID'])}
      </div></section>
    </div>{toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
  </Shell>;
}
