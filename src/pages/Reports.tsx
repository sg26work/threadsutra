import { useEffect, useState } from 'react';
import { Download, TrendingUp, Package, IndianRupee, Undo2 } from 'lucide-react';
import { apiGet, money } from '../lib/api';
import PageHeader from '../components/PageHeader';

export default function Reports() {
  const [orders, setOrders] = useState<any[]>([]);
  const [inv, setInv] = useState<any[]>([]);
  const [rets, setRets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([apiGet('/api/sale-orders'), apiGet('/api/inventory'), apiGet('/api/returns')])
      .then(([o, i, r]) => { setOrders(o); setInv(i); setRets(r); }).finally(() => setLoading(false));
  }, []);

  const totalSales = orders.reduce((s, o) => s + Number(o.amount || 0), 0);
  const byChannel: Record<string, { count: number; amt: number }> = {};
  orders.forEach((o) => { byChannel[o.channel] = byChannel[o.channel] || { count: 0, amt: 0 }; byChannel[o.channel].count++; byChannel[o.channel].amt += Number(o.amount || 0); });
  const byStatus: Record<string, number> = {};
  orders.forEach((o) => { byStatus[o.status] = (byStatus[o.status] || 0) + 1; });
  const byCat: Record<string, number> = {};
  inv.forEach((i) => { byCat[i.warehouse] = (byCat[i.warehouse] || 0) + Number(i.on_hand || 0); });

  const exportReport = () => {
    const lines = ['Channel,Orders,Revenue'];
    Object.entries(byChannel).forEach(([c, v]) => lines.push(`${c},${v.count},${v.amt}`));
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'sales-report.csv'; a.click();
  };

  const kpis = [
    { label: 'Total Revenue', value: money(totalSales), icon: IndianRupee, tint: 'from-blue-500 to-blue-600' },
    { label: 'Total Orders', value: orders.length, icon: TrendingUp, tint: 'from-emerald-500 to-teal-600' },
    { label: 'Units in Stock', value: inv.reduce((s, i) => s + Number(i.on_hand || 0), 0), icon: Package, tint: 'from-violet-500 to-purple-600' },
    { label: 'Total Returns', value: rets.length, icon: Undo2, tint: 'from-amber-500 to-orange-500' },
  ];

  if (loading) return <div className="grid gap-4 sm:grid-cols-4">{[0,1,2,3].map(i=><div key={i} className="h-28 animate-pulse rounded-xl bg-white"/>)}</div>;

  return (
    <div>
      <PageHeader title="Reports & Analytics" breadcrumb="Reports"
        actions={<button onClick={exportReport} className="flex items-center gap-1.5 rounded-md bg-[#2f9e9e] px-3 py-2 text-sm font-medium text-white hover:bg-[#268686]"><Download size={14} /> Export Sales Report</button>} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div><p className="text-xs font-medium text-slate-400">{k.label}</p><p className="mt-1 text-2xl font-bold text-slate-800">{k.value}</p></div>
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${k.tint} text-white`}><k.icon size={18} /></div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-slate-700">Revenue by Channel</h3>
          <table className="min-w-full text-sm">
            <thead><tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400"><th className="py-2">Channel</th><th className="py-2">Orders</th><th className="py-2 text-right">Revenue</th></tr></thead>
            <tbody>{Object.entries(byChannel).sort((a,b)=>b[1].amt-a[1].amt).map(([c,v])=>(
              <tr key={c} className="border-b border-slate-50"><td className="py-2.5 font-medium text-slate-700">{c}</td><td className="py-2.5 text-slate-600">{v.count}</td><td className="py-2.5 text-right font-medium text-slate-700">{money(v.amt)}</td></tr>
            ))}</tbody>
          </table>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-slate-700">Orders by Status</h3>
          <div className="space-y-3">
            {Object.entries(byStatus).map(([s, n]) => {
              const max = Math.max(...Object.values(byStatus));
              return (
                <div key={s}>
                  <div className="mb-1 flex justify-between text-xs"><span className="font-medium text-slate-600">{s}</span><span className="text-slate-400">{n}</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-[#2f7fb6] to-[#4a7bc8]" style={{ width: `${(n / max) * 100}%` }} /></div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h3 className="mb-4 text-sm font-semibold text-slate-700">Stock on Hand by Warehouse</h3>
          <div className="grid gap-4 sm:grid-cols-4">
            {Object.entries(byCat).map(([w, n]) => (
              <div key={w} className="rounded-lg border border-slate-100 bg-slate-50 p-4 text-center">
                <p className="text-2xl font-bold text-slate-800">{n}</p>
                <p className="mt-1 text-xs text-slate-400">{w}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
