import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Shell from '../Shell';
import { Btn, Toast } from '../parts';
import { apiGet, apiSend } from '../../lib/api';

type Mode = 'merchant' | 'marketplace';
type Option = { value: string; label: string };
type Filters = { orderNo: string; webOrderNo: string; orderDate: string; orderType: string; customerName: string; status: string[]; orderTag: string; onHold: string; vendor: string; vendorMode: string };
const formatDate = (date: Date) => `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
const parseDisplayDate = (value: string) => { const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/); return match ? new Date(`${match[3]}-${match[2]}-${match[1]}T00:00:00`) : null; };
const defaultFilters = (): Filters => { const end = new Date(), start = new Date(); start.setDate(start.getDate() - 15); return { orderNo: '', webOrderNo: '', orderDate: `${formatDate(start)} - ${formatDate(end)}`, orderType: '', customerName: '', status: [], orderTag: '', onHold: '-1', vendor: '', vendorMode: '' }; };
const merchantColumns = ['Order No', 'Web Order No', 'Order Date', 'Order Type', 'Customer Name', 'Ship City', 'Status', 'Order Amount', 'Tax Amt', 'Disc Amt', 'Order Tag', 'On Hold'];
const marketplaceColumns = ['Order No', 'Web Order No', 'Order Date', 'Timezone', 'Order Type', 'Customer Name', 'Ship City', 'Status', 'Order Amount', 'Tax Amt', 'Disc Amt', 'Order Tag', 'On Hold', 'Vendor', 'Vendor Mode'];
const fieldClass = 'h-7 w-full min-w-24 rounded border border-slate-300 bg-white px-1 text-xs';

export default function GlobalOrderSearch() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('marketplace'), [filters, setFilters] = useState<Filters>(defaultFilters());
  const [meta, setMeta] = useState<any>(null), [rows, setRows] = useState<any[]>([]), [loading, setLoading] = useState(false);
  const [pager, setPager] = useState({ page: 1, total: 0, records: 0, pageSize: 20 }), [toast, setToast] = useState<any>(null);
  useEffect(() => { void apiGet('/api/global-order-search').then(setMeta); }, []);
  const search = async (page = 1, pageSize = pager.pageSize, activeMode = mode, activeFilters = filters) => {
    if (!activeFilters.orderNo.trim() && !activeFilters.webOrderNo.trim() && !activeFilters.orderDate.trim()) { setToast({ msg: 'Please Provide Value For Either Order No ,Web Order No or Order Date.', type: 'err' }); return; }
    if (activeFilters.orderDate.trim()) { const [fromText, toText] = activeFilters.orderDate.split(' - '), from = parseDisplayDate(fromText), to = parseDisplayDate(toText); if (!from || !to) { setToast({ msg: 'The server encountered an internal error and was unable to complete your request. Please contact the server administrator.', type: 'err' }); return; } if ((to.getTime() - from.getTime()) / 86400000 > 90) { setToast({ msg: 'Order Date range can not be greater than 90 days', type: 'err' }); return; } }
    setLoading(true);
    try {
      const [fromDate, toDate] = activeFilters.orderDate.split(' - ');
      const result: any = await apiSend('/api/global-order-search', 'POST', { ...activeFilters, fromDate, toDate, rows: pageSize, page, sidx: 'o.OrderDate', sord: 'desc', REQ_SEARCH_FLAG: true, mode: activeMode, key: activeMode === 'marketplace' ? 'SPGBLDSODRSRCH' : 'SPGBLODRSRCH' });
      setRows(result.rows); setPager({ page: result.page, total: result.total, records: result.records, pageSize });
    } catch (error: any) { setToast({ msg: error.message, type: 'err' }); } finally { setLoading(false); }
  };
  const changeMode = (value: Mode) => { setMode(value); setFilters(defaultFilters()); setRows([]); setPager({ page: 1, total: 0, records: 0, pageSize: 20 }); };
  const reset = () => { setFilters({ ...defaultFilters(), orderDate: '' }); setRows([]); setPager({ page: 1, total: 0, records: 0, pageSize: 20 }); };
  const download = async () => {
    if (!rows.length) return setToast({ msg: 'No order available to download in search results.', type: 'err' });
    try { const result: any = await apiSend('/api/global-order-search', 'POST', { action: 'export', mode, key: mode === 'marketplace' ? 'SPGBLDSODRSRCH' : 'SPGBLODRSRCH', rows, filters }); setToast({ msg: `Pending Report created: ${result.reportId}`, type: 'ok' }); } catch (error: any) { setToast({ msg: error.message, type: 'err' }); }
  };
  const option = (item: Option) => <option key={`${item.value}-${item.label}`} value={item.value}>{item.label}</option>;
  const statusOptions: Option[] = meta?.[mode === 'marketplace' ? 'marketplaceStatuses' : 'merchantStatuses'] || [];
  const columns = mode === 'marketplace' ? marketplaceColumns : merchantColumns;
  const filterFor = (column: string) => {
    if (column === 'Order No') return <input aria-label="Order No" className={fieldClass} value={filters.orderNo} onChange={(e) => setFilters({ ...filters, orderNo: e.target.value })}/>;
    if (column === 'Web Order No') return <input aria-label="Web Order No" className={fieldClass} value={filters.webOrderNo} onChange={(e) => setFilters({ ...filters, webOrderNo: e.target.value })}/>;
    if (column === 'Order Date') return <input aria-label="Order Date" className={fieldClass} value={filters.orderDate} onChange={(e) => setFilters({ ...filters, orderDate: e.target.value })}/>;
    if (column === 'Order Type') return <select aria-label="Order Type" className={fieldClass} value={filters.orderType} onChange={(e) => setFilters({ ...filters, orderType: e.target.value })}>{(meta?.orderTypes || []).map(option)}</select>;
    if (column === 'Customer Name') return <input aria-label="Customer Name" className={fieldClass} value={filters.customerName} onChange={(e) => setFilters({ ...filters, customerName: e.target.value })}/>;
    if (column === 'Status') return <select aria-label="Status" multiple className={`${fieldClass} h-12`} value={filters.status} onChange={(e) => setFilters({ ...filters, status: [...e.target.selectedOptions].map((item) => item.value) })}>{statusOptions.map(option)}</select>;
    if (column === 'Order Tag') return <select aria-label="Order Tag" className={fieldClass} value={filters.orderTag} onChange={(e) => setFilters({ ...filters, orderTag: e.target.value })}>{(meta?.orderTags || []).map(option)}</select>;
    if (column === 'On Hold') return <select aria-label="On Hold" className={fieldClass} value={filters.onHold} onChange={(e) => setFilters({ ...filters, onHold: e.target.value })}>{(meta?.onHold || []).map(option)}</select>;
    if (column === 'Vendor') return <input aria-label="Vendor" className={fieldClass} value={filters.vendor} onChange={(e) => setFilters({ ...filters, vendor: e.target.value })}/>;
    if (column === 'Vendor Mode') return <select aria-label="Vendor Mode" className={fieldClass} value={filters.vendorMode} onChange={(e) => setFilters({ ...filters, vendorMode: e.target.value })}>{(meta?.vendorModes || []).map(option)}</select>;
    return null;
  };
  const cell = (row: any, column: string) => {
    if (column === 'Order No') return <button className="font-bold text-sky-700" onClick={() => navigate(mode === 'marketplace' ? `/app/market-order-view?orderNo=${encodeURIComponent(row.order_no)}` : `/app/order-maintenance?orderCode=${encodeURIComponent(row.order_no)}`)}>{row.order_no}</button>;
    const key: Record<string, string> = { 'Web Order No': 'web_order_no', 'Order Date': 'order_date', Timezone: 'timezone', 'Order Type': 'order_type', 'Customer Name': 'customer_name', 'Ship City': 'ship_city', Status: 'status', 'Order Amount': 'order_amount', 'Tax Amt': 'tax_amt', 'Disc Amt': 'disc_amt', 'Order Tag': 'order_tag', 'On Hold': 'on_hold', Vendor: 'vendor', 'Vendor Mode': 'vendor_mode' };
    if (column === 'Status') return <span className="inline-block min-w-16 rounded-sm bg-indigo-100 px-2 py-1">{row.status}</span>;
    return row[key[column]];
  };
  return <Shell active="sales" breadcrumb="SALES > Global Order Search" openScreens={[{ label: 'Global Order Search', to: '#' }]}>
    <div className="border bg-white">
      <div className="flex items-center justify-between border-b p-3"><label className="flex items-center gap-3 text-sm"><b>Fulfillment Mode</b><select aria-label="Fulfillment Mode" value={mode === 'merchant' ? '1' : '2'} onChange={(e) => changeMode(e.target.value === '1' ? 'merchant' : 'marketplace')} className="rounded border px-3 py-1"><option value="1">By Merchant</option><option value="2">By Marketplace</option></select></label><div className="flex gap-2"><Btn variant="warn" onClick={() => void search()}>Search</Btn><Btn variant="ghost" onClick={reset}>Reset</Btn><Btn variant="ghost" onClick={() => void download()}><Download size={15}/>Download</Btn></div></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[1250px] text-xs"><thead className="bg-slate-100"><tr>{columns.map((column) => <th key={column} className="border p-2 text-left">{column}</th>)}</tr><tr>{columns.map((column) => <th key={column} className="border p-1 align-top">{filterFor(column)}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-t">{columns.map((column) => <td key={column} className="border p-2">{cell(row, column)}</td>)}</tr>)}</tbody></table>{!rows.length && <div className="h-56 border-t p-4 text-center text-sm text-slate-500">{loading ? 'Loading…' : 'No records to view'}</div>}</div>
      <div className="flex items-center justify-end gap-2 border-t p-2 text-xs"><button disabled={pager.page <= 1} onClick={() => void search(pager.page - 1)}>‹</button><span>Page {pager.page} of {pager.total}</span><button disabled={pager.page >= pager.total} onClick={() => void search(pager.page + 1)}>›</button><select aria-label="Page size" value={pager.pageSize} onChange={(e) => void search(1, Number(e.target.value))}>{[20,50,100,200].map((size) => <option key={size}>{size}</option>)}</select><span>{pager.records ? `View ${(pager.page - 1) * pager.pageSize + 1} - ${Math.min(pager.page * pager.pageSize, pager.records)} of ${pager.records}` : 'No records to view'}</span></div>
    </div>{toast && <Toast {...toast} onClose={() => setToast(null)}/>}</Shell>;
}
