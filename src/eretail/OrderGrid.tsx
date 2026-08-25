import { ReactNode } from 'react';
import { money } from '../lib/api';

export type GCol = { key: string; label: string; render?: (r: any) => ReactNode };

export default function OrderGrid({
  cols, rows, loading, selectable, selected, onToggle, onToggleAll, empty, onRowClick,
}: {
  cols: GCol[]; rows: any[]; loading?: boolean; selectable?: boolean;
  selected?: number[]; onToggle?: (id: number) => void; onToggleAll?: () => void; empty?: string;
  onRowClick?: (row: any) => void;
}) {
  const allChecked = selectable && rows.length > 0 && selected!.length === rows.length;
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm ring-1 ring-black/[0.02]">
      <table className="min-w-full text-sm">
        <thead className="bg-gradient-to-r from-[#2f3b57] to-[#3a4a6b] text-white">
          <tr>
            {selectable && <th className="w-10 px-3 py-3"><input type="checkbox" className="accent-[#2f9e9e]" checked={allChecked} onChange={onToggleAll} /></th>}
            {cols.map((c) => <th key={c.key} className="whitespace-nowrap px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide">{c.label}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {loading ? (
            <tr><td colSpan={cols.length + (selectable ? 1 : 0)} className="px-4 py-16 text-center text-slate-400">
              <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-[#2f9e9e]" /><p className="mt-2 text-xs">Loading…</p>
            </td></tr>
          ) : rows.length === 0 ? (
            <tr><td colSpan={cols.length + (selectable ? 1 : 0)} className="px-4 py-16 text-center text-sm text-slate-400">{empty || 'No records found'}</td></tr>
          ) : rows.map((r) => (
            <tr key={r.id ?? r.code} onClick={() => onRowClick?.(r)} className={`transition-colors hover:bg-[#f0fafa] ${onRowClick ? 'cursor-pointer' : ''} ${selected?.includes(r.id) ? 'bg-teal-50/70' : ''}`}>
              {selectable && <td className="px-3 py-2.5"><input type="checkbox" className="accent-[#2f9e9e]" checked={selected!.includes(r.id)} onChange={() => onToggle!(r.id)} /></td>}
              {cols.map((c) => <td key={c.key} className="whitespace-nowrap px-3 py-2.5 text-slate-700">{c.render ? c.render(r) : (c.key === 'amount' ? money(r[c.key]) : r[c.key])}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
