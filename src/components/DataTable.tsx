import { ReactNode } from 'react';

export type Col<T> = {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
  className?: string;
};

export default function DataTable<T extends { id: number }>({
  cols,
  rows,
  loading,
  empty,
}: {
  cols: Col<T>[];
  rows: T[];
  loading?: boolean;
  empty?: string;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-[#2f3b57] text-white">
          <tr>
            {cols.map((c) => (
              <th
                key={c.key}
                className={`whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide ${c.className || ''}`}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {loading ? (
            <tr>
              <td colSpan={cols.length} className="px-4 py-16 text-center text-slate-400">
                <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-[#2f9e9e]" />
                <p className="mt-2 text-xs">Loading records…</p>
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={cols.length} className="px-4 py-16 text-center text-sm text-slate-400">
                {empty || 'No records found'}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id} className="transition-colors hover:bg-slate-50">
                {cols.map((c) => (
                  <td key={c.key} className={`whitespace-nowrap px-4 py-3 text-slate-700 ${c.className || ''}`}>
                    {c.render ? c.render(row) : (row as any)[c.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
