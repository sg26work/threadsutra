import { ReactNode, useEffect } from 'react';
import { useScreens } from './ScreenContext';

export function Toast({ msg, type, onClose }: { msg: string; type: 'ok' | 'err'; onClose: () => void }) {
  const { showFeedback } = useScreens();
  useEffect(() => { showFeedback(msg, type); }, [msg, type, showFeedback]);
  useEffect(() => { const timer = setTimeout(onClose, 15000); return () => clearTimeout(timer); }, [msg, type, onClose]);
  return null;
}

const STATUS_CLS: Record<string, string> = {
  Pending: 'bg-slate-100 text-slate-600 ring-slate-200',
  Allocated: 'bg-blue-50 text-blue-700 ring-blue-200',
  'Picklist Generated': 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  Picking: 'bg-amber-50 text-amber-700 ring-amber-200',
  Picked: 'bg-cyan-50 text-cyan-700 ring-cyan-200',
  Packed: 'bg-violet-50 text-violet-700 ring-violet-200',
  'Ready to Ship': 'bg-teal-50 text-teal-700 ring-teal-200',
  Manifested: 'bg-orange-50 text-orange-700 ring-orange-200',
  'Handed Over': 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Open: 'bg-slate-100 text-slate-600 ring-slate-200',
  'In Progress': 'bg-amber-50 text-amber-700 ring-amber-200',
  Completed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  'Pending Handover': 'bg-orange-50 text-orange-700 ring-orange-200',
};

export function Pill({ status }: { status: string }) {
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_CLS[status] || 'bg-slate-100 text-slate-600 ring-slate-200'}`}>{status}</span>;
}

export function ToolBar({ children }: { children: ReactNode }) {
  return <div className="mb-3 flex flex-wrap items-center gap-2">{children}</div>;
}

export function Btn({ children, onClick, variant = 'primary', disabled, title }: { children: ReactNode; onClick?: () => void; variant?: 'primary' | 'ghost' | 'danger' | 'warn'; disabled?: boolean; title?: string }) {
  const cls = {
    primary: 'bg-gradient-to-b from-[#34a9a9] to-[#2f9e9e] text-white shadow-sm hover:shadow-md hover:brightness-105 disabled:opacity-40 disabled:shadow-none',
    ghost: 'border border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:bg-slate-50 disabled:opacity-40',
    danger: 'bg-gradient-to-b from-rose-500 to-rose-600 text-white shadow-sm hover:shadow-md hover:brightness-105 disabled:opacity-40 disabled:shadow-none',
    warn: 'bg-gradient-to-b from-[#f7b13f] to-[#f5a623] text-white shadow-sm hover:shadow-md hover:brightness-105 disabled:opacity-40',
  }[variant];
  return <button title={title} onClick={onClick} disabled={disabled} className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-all active:scale-[0.97] ${cls}`}>{children}</button>;
}

export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ring-1 ring-black/[0.02]">
      <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-4 py-3">
        <h2 className="flex items-center gap-2 font-semibold text-slate-700">
          <span className="h-4 w-1 rounded-full bg-gradient-to-b from-[#34a9a9] to-[#2f9e9e]" />
          {title}
        </h2>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}
