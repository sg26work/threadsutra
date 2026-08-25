import { useEffect, useState } from 'react';
import { FileBarChart, Download, Printer, Play, Calendar } from 'lucide-react';
import Shell from './Shell';
import { Panel, Btn, Toast } from './parts';
import { apiGet } from '../lib/api';
import { useDownload } from '../context/DownloadContext';

const WAREHOUSES = ['All', 'Delhi NCR', 'Mumbai WH', 'Bengaluru WH', 'Kolkata WH'];
// numeric-looking columns get right-aligned + money formatting where sensible
const MONEY_KEYWORDS = ['Amount', 'Revenue', 'Value', 'Price', 'MRP', 'Cost'];
const isMoneyCol = (col: string) => MONEY_KEYWORDS.some((k) => col.includes(k));

export default function ReportScreen({
  reportKey, title, crumb,
}: { reportKey: string; title: string; crumb: string }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [warehouse, setWarehouse] = useState('All');
  const [data, setData] = useState<{ columns: string[]; rows: any[][] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
  const { requestDownload } = useDownload();

  const run = () => {
    setLoading(true);
    const params = new URLSearchParams({ type: reportKey, warehouse, from, to });
    apiGet(`/api/reports?${params.toString()}`)
      .then((d) => { setData(d); if (!d.rows.length) setToast({ msg: 'No records for the selected filters', type: 'ok' }); })
      .catch(() => setToast({ msg: 'Failed to generate report', type: 'err' }))
      .finally(() => setLoading(false));
  };
  // auto-run on first load
  useEffect(() => { run(); /* eslint-disable-next-line */ }, [reportKey]);

  const exportCsv = () => {
    if (!data) return;
    requestDownload({ title, module: reportKey, baseName: reportKey, data });
  };

  const printReport = () => {
    if (!data) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<html><head><title>${title}</title>
      <style>body{font-family:Manrope,Arial,sans-serif;padding:24px;color:#1e293b}
      h1{font-size:18px;border-bottom:2px solid #2f9e9e;padding-bottom:8px}
      table{width:100%;border-collapse:collapse;font-size:12px;margin-top:12px}
      th{background:#2f3b57;color:#fff;padding:8px;text-align:left}
      td{padding:6px 8px;border-bottom:1px solid #e2e8f0}</style></head><body>
      <h1>${title}</h1><p style="font-size:11px;color:#64748b">Warehouse: ${warehouse} ${from ? '· From ' + from : ''} ${to ? '· To ' + to : ''}</p>
      <table><thead><tr>${data.columns.map((c) => `<th>${c}</th>`).join('')}</tr></thead>
      <tbody>${data.rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>
      </body></html>`);
    w.document.close(); w.print();
  };

  const fmt = (col: string, val: any) =>
    isMoneyCol(col) && typeof val === 'number'
      ? '₹' + Number(val).toLocaleString('en-IN')
      : val;

  return (
    <Shell active="reports" breadcrumb={crumb} openScreens={[{ label: title, to: '#' }]}>
      {/* Filter bar */}
      <div className="mb-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="lbl">From Date</label>
            <div className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2">
              <Calendar size={14} className="text-slate-400" />
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="text-sm outline-none" />
            </div>
          </div>
          <div>
            <label className="lbl">To Date</label>
            <div className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2">
              <Calendar size={14} className="text-slate-400" />
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="text-sm outline-none" />
            </div>
          </div>
          <div>
            <label className="lbl">Warehouse</label>
            <select value={warehouse} onChange={(e) => setWarehouse(e.target.value)} className="inp min-w-[150px]">
              {WAREHOUSES.map((w) => <option key={w}>{w}</option>)}
            </select>
          </div>
          <Btn onClick={run} disabled={loading}><Play size={14} /> {loading ? 'Generating…' : 'Generate'}</Btn>
          <div className="ml-auto flex items-end gap-2">
            <Btn variant="ghost" onClick={exportCsv} disabled={!data || !data.rows.length}><Download size={14} /> Export</Btn>
            <Btn variant="ghost" onClick={printReport} disabled={!data || !data.rows.length}><Printer size={14} /> Print</Btn>
          </div>
        </div>
      </div>

      <Panel title={title}>
        <div className="mb-2 flex items-center gap-2 text-xs text-slate-500">
          <FileBarChart size={14} className="text-[#2f9e9e]" />
          {data ? `${data.rows.length} row(s)` : 'Ready'} {warehouse !== 'All' ? `· ${warehouse}` : ''}
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-gradient-to-r from-[#2f3b57] to-[#3a4a6b] text-white">
              <tr>{(data?.columns || []).map((c) => (
                <th key={c} className={`whitespace-nowrap px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide ${isMoneyCol(c) ? 'text-right' : ''}`}>{c}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={data?.columns.length || 6} className="px-4 py-16 text-center text-slate-400">
                  <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-[#2f9e9e]" /><p className="mt-2 text-xs">Generating report…</p>
                </td></tr>
              ) : !data || data.rows.length === 0 ? (
                <tr><td colSpan={data?.columns.length || 6} className="px-4 py-16 text-center text-sm text-slate-400">No records found for the selected filters</td></tr>
              ) : data.rows.map((r, i) => (
                <tr key={i} className="transition-colors hover:bg-[#f0fafa]">
                  {r.map((cell, j) => (
                    <td key={j} className={`whitespace-nowrap px-3 py-2.5 text-slate-700 ${isMoneyCol(data.columns[j]) ? 'text-right font-medium' : ''}`}>
                      {fmt(data.columns[j], cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </Shell>
  );
}
