import { useEffect, useState } from 'react';
import Shell from '../Shell';
import { Toast } from '../parts';
import { apiGet, apiSend } from '../../lib/api';

const masters = ['Subscribe HSN code', 'Brands', 'Materials', 'Size Group', 'Size', 'Color', 'State', 'Reasons', 'Tags', 'Payment Terms', 'Pigeon Hole Master', 'Excise Category', 'SKU Case Size', 'Packaging Type', 'SKU Fulfillment Type', 'Channel Configuration', 'Manage Currency', 'UOM', 'FnV Channel Master', 'Pick/Ship Instructions', 'Transpoter PickUp Location Mapping', 'Permanent LPN', 'Device Master', 'Store Promotion'];
const moduleKey = (name: string) => `other-masters-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

export default function OtherMasters() {
  const [selected, setSelected] = useState(''), [rows, setRows] = useState<any[]>([]), [code, setCode] = useState(''), [name, setName] = useState(''), [toast, setToast] = useState<any>(null);
  const load = async (master = selected) => { if (!master) return; try { setRows(await apiGet<any[]>(`/api/generic?module=${moduleKey(master)}`)); } catch { setToast({ msg: `Unable to load ${master}`, type: 'err' }); } };
  useEffect(() => { void load(); }, [selected]);
  const save = async () => {
    if (!code.trim() || !name.trim()) return setToast({ msg: 'Code and Name are mandatory.', type: 'err' });
    try { await apiSend('/api/generic', 'POST', { module: moduleKey(selected), code: code.trim(), name: name.trim(), description: '', status: 'Active' }); setCode(''); setName(''); setToast({ msg: `${selected} saved successfully`, type: 'ok' }); await load(); } catch (error: any) { setToast({ msg: error.message, type: 'err' }); }
  };
  return <Shell active="master" breadcrumb="MASTER > Miscellaneous > Other Masters" openScreens={[{ label: 'Other Masters', to: '#' }]}>
    {!selected ? <section className="border bg-white p-6"><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{masters.map((master) => <button key={master} onClick={() => setSelected(master)} className="min-h-20 rounded border border-slate-200 bg-gradient-to-b from-white to-slate-50 px-4 py-5 text-sm font-semibold text-slate-700 shadow-sm hover:border-[#2f9e9e] hover:text-[#247d7d]">{master}</button>)}</div></section> : <section className="border bg-white">
      <div className="flex items-center justify-between border-b bg-slate-50 px-4 py-3"><h2 className="font-semibold">{selected}</h2><button onClick={() => { setSelected(''); setRows([]); }} className="rounded border bg-white px-3 py-1.5 text-sm">Back to Other Masters</button></div>
      <div className="grid gap-3 p-4 md:grid-cols-[1fr_1fr_auto]"><label className="text-xs">Code *<input aria-label="Code" className="inp mt-1" value={code} onChange={(e) => setCode(e.target.value)} /></label><label className="text-xs">Name *<input aria-label="Name" className="inp mt-1" value={name} onChange={(e) => setName(e.target.value)} /></label><button onClick={save} className="self-end rounded bg-[#f5a623] px-5 py-2 text-sm text-white">Save</button></div>
      <table className="w-full text-sm"><thead className="bg-slate-100"><tr><th className="p-3 text-left">Code</th><th className="p-3 text-left">Name</th><th className="p-3 text-left">Status</th></tr></thead><tbody>{rows.length ? rows.map((row) => <tr key={row.id} className="border-t"><td className="p-3">{row.code}</td><td className="p-3">{row.name}</td><td className="p-3">{row.status}</td></tr>) : <tr><td colSpan={3} className="p-10 text-center text-slate-400">No records to view</td></tr>}</tbody></table>
    </section>}
    {toast && <Toast {...toast} onClose={() => setToast(null)} />}
  </Shell>;
}
