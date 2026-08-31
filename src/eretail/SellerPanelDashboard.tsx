import { useState } from 'react';
import Shell from './Shell';
import { apiSend } from '../lib/api';

const modes = [['1', 'Drop Ship'], ['7', 'Mall Oneship'], ['2', 'Vendor Self Delivery']];
const cards = [['confirmed', 'Confirmed', '#00c0ef'], ['readyForShip', 'Ready For Ship', '#00a65a'], ['shipped', 'Shipped', '#f39c12'], ['returned', 'Returned', '#dd4b39'], ['cancelled', 'Cancelled', '#605ca8']] as const;
const empty = { confirmed: 0, readyForShip: 0, shipped: 0, returned: 0, cancelled: 0 };

export default function SellerPanelDashboard() {
  const [mode, setMode] = useState('1');
  const [counts, setCounts] = useState(empty);
  const changeMode = async (value: string) => { setMode(value); const result = await apiSend('/api/seller-panel-dashboard', 'POST', { selectMode: value }) as { counts: typeof empty }; setCounts(result.counts); };
  return <Shell active="dashboard" breadcrumb="Seller Panel Dashboard" openScreens={[{ label: 'Seller Panel Dashboard', to: '#' }]}>
    <div className="bg-[#ecf0f5] p-3 text-xs text-[#444]">
      <div className="mb-3 flex items-center"><h1 className="text-xl font-normal">Seller Panel Dashboard</h1><select aria-label="Seller Mode" className="ml-auto h-[22px] w-[140px] border bg-white px-1" value={mode} onChange={(event) => void changeMode(event.target.value)}>{modes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><button title="Help" className="ml-1 h-[22px] w-[22px] rounded-full bg-[#3c8dbc] text-white">?</button></div>
      <div className="grid grid-cols-5 gap-3">{cards.map(([key, label, color]) => <div key={key} style={{ backgroundColor: color }} className="h-[88px] p-3 text-white"><b className="text-3xl">{counts[key]}</b><p className="mt-2 text-sm">{label}</p></div>)}</div>
      <section className="mt-3 border-t-[3px] border-[#3c8dbc] bg-white"><h2 className="border-b px-3 py-2 text-sm font-semibold">Order Flow - Last 7 Days</h2><div className="h-[160px] p-4"><div className="mb-3 flex gap-5">{cards.map(([, label, color]) => <span key={label}><i style={{ backgroundColor: color }} className="mr-1 inline-block h-2 w-2" />{label}</span>)}</div><div className="h-[100px] border-b border-l bg-[linear-gradient(to_bottom,transparent_24%,#e5e7eb_25%,transparent_26%,transparent_49%,#e5e7eb_50%,transparent_51%,transparent_74%,#e5e7eb_75%,transparent_76%)]" /></div></section>
      <div className="mt-3 grid grid-cols-2 gap-3">{['SKU For Replenishment - Top 5', 'Top 5 SKUs Sold - Last 90 Days'].map((title) => <section key={title} className="border-t-[3px] border-[#3c8dbc] bg-white"><h2 className="border-b px-3 py-2 text-sm font-semibold">{title}</h2><table className="w-full border-collapse"><thead><tr>{['SKU ID','SKU Name','Inventory'].map((label) => <th key={label} className="border px-2 py-2 text-left">{label}</th>)}</tr></thead><tbody><tr><td colSpan={3} className="border p-5 text-center">No Records Found.</td></tr></tbody></table></section>)}</div>
      <section className="mt-3 border-t-[3px] border-[#3c8dbc] bg-white"><h2 className="border-b px-3 py-2 text-sm font-semibold">Shipment VS Transporter - Last 30 Days</h2><div className="h-[150px]" /></section>
    </div>
  </Shell>;
}
