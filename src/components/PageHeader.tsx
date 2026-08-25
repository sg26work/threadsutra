import { ReactNode } from 'react';

export default function PageHeader({
  title,
  breadcrumb,
  actions,
}: {
  title: string;
  breadcrumb: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">{title}</h1>
        <p className="mt-0.5 text-xs text-slate-400">{breadcrumb}</p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
