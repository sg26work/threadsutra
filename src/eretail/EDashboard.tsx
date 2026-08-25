import { useEffect, useState, useCallback } from 'react';
import {
  ShoppingCart, Truck, Boxes, RotateCcw, RefreshCw, X, ChevronDown, Check,
  TrendingUp, BarChart3, PieChart, AlertTriangle,
} from 'lucide-react';
import Shell from './Shell';
import { apiGet } from '../lib/api';
import Modal from '../components/Modal';
import { Toast } from './parts';
import { BarChart, LineChart, DonutChart, DualLineChart } from './charts';

const money = (n: number) => '\u20b9' + Number(n || 0).toLocaleString('en-IN');

const TABS = [
  { key: 'sales', label: 'Sales', icon: ShoppingCart },
  { key: 'fulfillment', label: 'Fulfillment', icon: Truck },
  { key: 'inventory', label: 'Inventory', icon: Boxes },
  { key: 'returns', label: 'Returns', icon: RotateCcw },
];

const RANGES = [
  { key: '7', label: 'Last 7 days' }, { key: '14', label: 'Last 14 days' },
  { key: '30', label: 'Last 1 Month' }, { key: 'custom', label: 'Custom Date Range' },
];

// 15 KPI cards — colours match the reference exactly
const KPI_DEFS: { key: string; label: string; color: string; money?: boolean; pct?: boolean; drill: string }[] = [
  { key: 'totalOrders', label: 'Total Orders', color: '#1aa179', drill: '' },
  { key: 'totalOrderLines', label: 'Total Order Lines', color: '#f0a020', drill: '' },
  { key: 'totalOrderQty', label: 'Total Order Quantity', color: '#e0574f', drill: '' },
  { key: 'distinctSku', label: 'Distinct SKU Sold', color: '#2bb9c9', drill: '' },
  { key: 'avgLinesPerOrder', label: 'Average Lines Per Order', color: '#6a5acd', drill: '' },
  { key: 'totalAmount', label: 'Total Order Amount', color: '#d6236b', money: true, drill: '' },
  { key: 'avgOrderAmount', label: 'Avg. Order Amount', color: '#e5279e', money: true, drill: '' },
  { key: 'codPct', label: '% COD Orders', color: '#3b8fc4', pct: true, drill: 'kpi:cod' },
  { key: 'totalDiscount', label: 'Total Discount', color: '#f0921e', drill: '' },
  { key: 'pendingStockQty', label: 'Order Qty Pending Stock', color: '#2f9e78', drill: 'kpi:pendingstock' },
  { key: 'pendingOrders', label: 'Total Pending Order', color: '#2bb9c9', drill: 'kpi:pending' },
  { key: 'unfulfillableLines', label: 'Unfulfillable Line Level Order', color: '#6a5acd', drill: 'kpi:unfulfillable' },
  { key: 'unfulfillableOrders', label: 'Total Unfulfillable Order', color: '#d6236b', drill: 'kpi:unfulfillable' },
  { key: 'slaBreached', label: 'Total SLA Breached Order', color: '#1aa179', drill: 'kpi:sla' },
  { key: 'failedOrders', label: 'Total Failed Order', color: '#e0574f', drill: 'kpi:failed' },
];

export default function EDashboard() {
  const [tab, setTab] = useState('fulfillment');
  const [range, setRange] = useState('7');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [appliedCustom, setAppliedCustom] = useState<{ from: string; to: string } | null>(null);
  const [platformOpts, setPlatformOpts] = useState<string[]>(['All']);
  const [platforms, setPlatforms] = useState<string[]>(['All']);
  const [platMenu, setPlatMenu] = useState(false);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  // drill-down
  const [drill, setDrill] = useState<{ title: string; key: string } | null>(null);
  const [drillRows, setDrillRows] = useState<any[]>([]);
  const [drillLoading, setDrillLoading] = useState(false);

  useEffect(() => {
    apiGet('/api/platforms').then((d) => setPlatformOpts(d.platforms || ['All'])).catch(() => {});
  }, []);

  const buildParams = useCallback((extra?: Record<string, string>) => {
    const p = new URLSearchParams({ tab, range });
    if (range === 'custom' && appliedCustom) { p.set('from', appliedCustom.from); p.set('to', appliedCustom.to); }
    const plats = platforms.includes('All') ? 'All' : platforms.join(',');
    p.set('platform', plats);
    if (extra) Object.entries(extra).forEach(([k, v]) => p.set(k, v));
    return p.toString();
  }, [tab, range, appliedCustom, platforms]);

  const load = useCallback(() => {
    if (range === 'custom' && !appliedCustom) return; // wait for Apply
    setLoading(true); setError(false);
    apiGet(`/api/dashboard?${buildParams()}`)
      .then((d) => { setData(d); setLastRefresh(new Date()); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [buildParams, range, appliedCustom]);

  useEffect(() => { load(); }, [load]);

  const applyCustom = () => {
    if (!from || !to) return setToast({ msg: 'Select both From and To dates', type: 'err' });
    if (from > to) return setToast({ msg: 'From date must be before To date', type: 'err' });
    setAppliedCustom({ from, to });
  };
  const resetCustom = () => { setFrom(''); setTo(''); setAppliedCustom(null); setRange('7'); };

  const togglePlatform = (p: string) => {
    if (p === 'All') { setPlatforms(['All']); return; }
    setPlatforms((cur) => {
      const next = cur.filter((x) => x !== 'All');
      return next.includes(p) ? (next.filter((x) => x !== p).length ? next.filter((x) => x !== p) : ['All']) : [...next, p];
    });
  };

  const openDrill = (title: string, key: string) => {
    if (!key) return;
    setDrill({ title, key }); setDrillLoading(true); setDrillRows([]);
    apiGet(`/api/dashboard?${buildParams({ drill: key })}`)
      .then((d) => setDrillRows(d.orders || []))
      .catch(() => setToast({ msg: 'Failed to load order details', type: 'err' }))
      .finally(() => setDrillLoading(false));
  };

  const k = data?.kpis;
  const c = data?.charts;
  const platLabel = platforms.includes('All') ? '-----All-----' : `${platforms.length} platform(s)`;

  return (
    <Shell active="dashboard" breadcrumb="DASHBOARD > Overview" openScreens={[{ label: 'Dashboard', to: '#' }]}>
      {/* Tabs + platform filter */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {TABS.map((t) => {
            const on = tab === t.key;
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 rounded-t-md border-b-2 px-5 py-2.5 text-sm font-semibold transition ${on ? 'border-[#f5a623] bg-white text-slate-800 shadow-sm' : 'border-transparent bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                <t.icon size={15} /> {t.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          {/* platform multi-select */}
          <div className="relative">
            <label className="mb-1 block text-xs font-medium text-slate-500">Ecommerce Platform</label>
            <button onClick={() => setPlatMenu((v) => !v)} className="flex min-w-[180px] items-center justify-between gap-2 rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600">
              {platLabel} <ChevronDown size={14} />
            </button>
            {platMenu && (
              <div className="absolute right-0 z-30 mt-1 max-h-64 w-56 overflow-y-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg">
                {platformOpts.map((p) => {
                  const sel = platforms.includes(p);
                  return (
                    <button key={p} onClick={() => togglePlatform(p)} className="flex w-full items-center justify-between px-3 py-1.5 text-left text-sm text-slate-600 hover:bg-slate-50">
                      {p} {sel && <Check size={14} className="text-[#2f9e9e]" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <button onClick={load} className="flex h-9 w-9 items-center justify-center rounded bg-[#f5a623] text-white hover:brightness-105" title="Refresh"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></button>
        </div>
      </div>

      {/* Date filter row */}
      <div className="mb-3 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <div>
          <label className="lbl">Date Range</label>
          <select value={range} onChange={(e) => { setRange(e.target.value); if (e.target.value !== 'custom') setAppliedCustom(null); }} className="ci min-w-[180px]">
            {RANGES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
          </select>
        </div>
        {range === 'custom' && (
          <>
            <div><label className="lbl">From Date</label><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="ci" /></div>
            <div><label className="lbl">To Date</label><input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="ci" /></div>
            <button onClick={applyCustom} className="rounded bg-[#2f9e9e] px-4 py-2 text-sm font-medium text-white hover:brightness-105">Apply</button>
            <button onClick={resetCustom} className="rounded border border-slate-300 bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Reset</button>
          </>
        )}
        <div className="ml-auto text-right text-xs text-slate-400">
          {lastRefresh && <>Last refreshed: {lastRefresh.toLocaleTimeString()}<br /></>}
          {data?.meta && <span>{data.meta.from} → {data.meta.to} · {data.meta.record_count} orders</span>}
        </div>
      </div>

      {/* Error / retry */}
      {error && (
        <div className="mb-3 flex items-center justify-between rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <span className="flex items-center gap-2"><AlertTriangle size={16} /> Failed to load dashboard data.</span>
          <button onClick={load} className="rounded bg-rose-600 px-3 py-1.5 text-white hover:bg-rose-700">Retry</button>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {KPI_DEFS.map((def) => {
          const raw = k ? k[def.key] : null;
          const val = loading || raw == null ? '—' : def.money ? Number(raw).toLocaleString('en-IN') : def.pct ? raw : Number(raw).toLocaleString('en-IN');
          return (
            <button key={def.key} onClick={() => openDrill(def.label, def.drill)}
              className={`relative overflow-hidden rounded-lg p-4 text-left text-white shadow-sm transition ${def.drill ? 'cursor-pointer hover:brightness-105 hover:shadow-md' : 'cursor-default'}`}
              style={{ background: def.color }}>
              <p className="text-[13px] font-medium leading-tight opacity-95">{def.label}</p>
              <p className="mt-2 text-2xl font-bold">{val}</p>
              <BarChart3 size={40} className="absolute -bottom-1 right-1 opacity-20" />
            </button>
          );
        })}
      </div>

      {/* Charts grid */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ChartCard title="Order Count — By Date" hint="[Click On The Bar(s) To Drilldown]">
          {c && <BarChart data={c.orderCountByDate} color="#3b8fc4" onClick={(lb, i) => openDrill(`Orders on ${lb}`, `date:${c.dateKeys[i]}`)} />}
        </ChartCard>
        <ChartCard title="Order Line Count — By Date" hint="[Click On The Bar(s) To Drilldown]">
          {c && <BarChart data={c.orderLineByDate} color="#2f9e9e" onClick={(lb, i) => openDrill(`Lines on ${lb}`, `date:${c.dateKeys[i]}`)} />}
        </ChartCard>
        <ChartCard title="Order Quantity — By Date" hint="[Click On The Point(s) To Drilldown]">
          {c && <LineChart data={c.orderQtyByDate} color="#e0574f" onClick={(lb, i) => openDrill(`Qty on ${lb}`, `date:${c.dateKeys[i]}`)} />}
        </ChartCard>
        <ChartCard title="Order Amount — By Date" hint="[Click On The Point(s) To Drilldown]">
          {c && <LineChart data={c.orderAmountByDate} color="#d6236b" format={money} onClick={(lb, i) => openDrill(`Amount on ${lb}`, `date:${c.dateKeys[i]}`)} />}
        </ChartCard>
        <ChartCard title="Platform-Wise Orders" hint="[Click To Drilldown]" icon={PieChart}>
          {c && <DonutChart data={c.platformWise} onClick={(lb) => openDrill(`${lb} Orders`, `platform:${lb}`)} />}
        </ChartCard>
        <ChartCard title="Order Status Distribution" hint="[Click To Drilldown]" icon={PieChart}>
          {c && <DonutChart data={c.orderStatus} onClick={(lb) => openDrill(`${lb} Orders`, `status:${lb}`)} />}
        </ChartCard>
        <ChartCard title="Fulfilment Status Distribution" hint="[Click To Drilldown]" icon={PieChart}>
          {c && <DonutChart data={c.fulfilStatus} onClick={(lb) => openDrill(`${lb} Orders`, `fulfil:${lb}`)} />}
        </ChartCard>
        <ChartCard title="COD vs Prepaid Orders" hint="[Click To Drilldown]" icon={PieChart}>
          {c && <DonutChart data={c.codVsPrepaid} onClick={(lb) => openDrill(`${lb} Orders`, `pay:${lb}`)} />}
        </ChartCard>
        <ChartCard title="Pending & Failed Orders Trend" hint="[Click On The Point(s) To Drilldown]" icon={TrendingUp}>
          {c && <DualLineChart labels={c.pendingFailedTrend.labels} a={c.pendingFailedTrend.pending} b={c.pendingFailedTrend.failed} onClick={(lb, i) => openDrill(`Orders on ${lb}`, `date:${c.dateKeys[i]}`)} />}
        </ChartCard>
        <ChartCard title="Top-Selling SKUs" hint="[Click On The Bar(s) To Drilldown]">
          {c && <BarChart data={c.topSku} color="#8e5fd0" onClick={(lb) => openDrill(`Orders with ${lb}`, `sku:${lb}`)} />}
        </ChartCard>
      </div>

      {/* Drill-down modal */}
      <Modal title={`Order Details — ${drill?.title || ''}`} open={!!drill} onClose={() => setDrill(null)} wide>
        {drillLoading ? (
          <div className="py-12 text-center text-slate-400"><div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-[#2f9e9e]" /><p className="mt-2 text-xs">Loading order records…</p></div>
        ) : drillRows.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-400">No contributing order records</p>
        ) : (
          <div className="max-h-[60vh] overflow-auto rounded border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-[#2f3b57] text-white">
                <tr>{['Order No', 'External', 'Platform', 'Status', 'Fulfil', 'Pay', 'Lines', 'Qty', 'Amount'].map((h) => <th key={h} className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {drillRows.map((o, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-medium text-[#2f7fb6]">{o.order_no}</td>
                    <td className="px-3 py-2 text-slate-500">{o.external_order_no}</td>
                    <td className="px-3 py-2 text-slate-600">{o.platform}</td>
                    <td className="px-3 py-2 text-slate-600">{o.status}</td>
                    <td className="px-3 py-2 text-slate-600">{o.fulfilment_status}</td>
                    <td className="px-3 py-2 text-slate-600">{o.payment_mode}</td>
                    <td className="px-3 py-2 text-slate-600">{o.lines}</td>
                    <td className="px-3 py-2 text-slate-600">{o.qty}</td>
                    <td className="px-3 py-2 font-medium text-slate-700">{money(o.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-xs text-slate-400">{drillRows.length} record(s) shown</p>
      </Modal>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </Shell>
  );
}

function ChartCard({ title, hint, icon: Icon, children }: { title: string; hint: string; icon?: any; children: any }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-1 flex items-center justify-center gap-2">
        {Icon && <Icon size={15} className="text-[#2f9e9e]" />}
        <h3 className="text-center text-base font-semibold text-slate-700">{title}</h3>
      </div>
      <p className="mb-3 text-center text-[11px] text-slate-400">{hint}</p>
      {children || <div className="h-40 skeleton rounded" />}
    </div>
  );
}
