const MAP: Record<string, string> = {
  Confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
  'Ready to Ship': 'bg-amber-50 text-amber-700 border-amber-200',
  Shipped: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
  Open: 'bg-sky-50 text-sky-700 border-sky-200',
  Received: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'In Transit': 'bg-amber-50 text-amber-700 border-amber-200',
  Completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Requested: 'bg-purple-50 text-purple-700 border-purple-200',
  Approved: 'bg-blue-50 text-blue-700 border-blue-200',
  Refunded: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export default function StatusBadge({ status }: { status: string }) {
  const cls = MAP[status] || 'bg-slate-50 text-slate-600 border-slate-200';
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}
