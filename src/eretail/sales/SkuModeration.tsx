import { useState } from 'react';
import { Download, Search } from 'lucide-react';
import Modal from '../../components/Modal';
import { apiGet, apiSend } from '../../lib/api';
import EnquiryScreen, { type EField } from '../EnquiryScreen';
import Shell from '../Shell';
import { Btn, Toast } from '../parts';

const fields: EField[] = [
  { key: 'clientId', label: 'Client', type: 'select', options: ['0-DummyClient'] },
  { key: 'locCode', label: 'Channel' },
  { key: 'skuName', label: 'SKU Name' },
  { key: 'channelSkuCodeUnmappedSku', label: 'Seller SKU' },
  { key: 'channelProductIdUnmappedSku', label: 'Product ID' },
  { key: 'channelPrice', label: 'Channel Price' },
  { key: 'SearchChannelStatus', label: 'Channel Status', type: 'select', options: ['ALL', 'Active', 'InActive'] },
];
const baseCols = [
  { key: 'sku_name', label: 'SKU Name' }, { key: 'channel', label: 'Channel' }, { key: 'seller_sku', label: 'Seller SKU' },
  { key: 'eretail_sku', label: 'ERetail Sku' }, { key: 'product_id', label: 'Product ID' }, { key: 'pricing', label: 'Pricing' },
  { key: 'other_info', label: 'Other Info' }, { key: 'created_date', label: 'Created Date' },
];
export default function SkuModeration() {
  const [rows, setRows] = useState<any[]>([]), [pager, setPager] = useState({ page: 0, total: 0, records: 0, pageSize: 20 });
  const [loading, setLoading] = useState(false), [advanced, setAdvanced] = useState(false), [selected, setSelected] = useState<any>(null), [query, setQuery] = useState(''), [candidates, setCandidates] = useState<any[]>([]), [candidate, setCandidate] = useState(''), [toast, setToast] = useState<any>(null), [last, setLast] = useState<any>({});
  const search = async (filters: any = {}, page = 1, size = pager.pageSize) => { setLast(filters); setLoading(true); try { const result: any = await apiSend('/api/sku-moderation', 'POST', { rows: size, page, sidx: '', sord: 'desc', REQ_SEARCH_FLAG: true, linkedUnlinkedFlag: '0', doFetchCount: true, clientId: filters.clientId === '0-DummyClient' ? '0' : filters.clientId || '0', ...filters }); setRows(result.rows); setPager({ page: result.page, total: result.total, records: result.records, pageSize: size }); } catch (error: any) { setToast({ msg: error.message, type: 'err' }); } finally { setLoading(false); } };
  const reset = () => { setRows([]); setPager({ page: 0, total: 0, records: 0, pageSize: 20 }); };
  const fetchCandidates = async (value: string) => { setQuery(value); if (value.trim().length <= 2) { setCandidates([]); return; } try { setCandidates(await apiGet(`/api/sku-moderation?q=${encodeURIComponent(value.trim())}`)); } catch (error: any) { setToast({ msg: error.message, type: 'err' }); } };
  const link = async () => { if (!candidate) { setToast({ msg: 'Search SKU to link.', type: 'err' }); return; } try { const result: any = await apiSend('/api/sku-moderation', 'PUT', { id: selected.id, linkedSkuCode: candidate }); setToast({ msg: result.message, type: 'ok' }); setSelected(null); setCandidate(''); setQuery(''); await search(last); } catch (error: any) { setToast({ msg: error.message, type: 'err' }); } };
  const download = () => { const cols = baseCols, csv = [cols.map((col) => col.label), ...rows.map((row) => cols.map((col) => `"${String(row[col.key] ?? '').replaceAll('"', '""')}"`))].map((line) => line.join(',')).join('\n'); const anchor = document.createElement('a'); anchor.href = URL.createObjectURL(new Blob([csv])); anchor.download = 'sku-moderation.csv'; anchor.click(); URL.revokeObjectURL(anchor.href); };
  const cols = [...baseCols, { key: 'action', label: 'Action', filter: 'none' as const, render: (row: any) => <button className="rounded bg-sky-600 px-2 py-1 text-xs text-white" onClick={() => setSelected(row)}>Link</button> }];
  return <Shell active="sales" breadcrumb="SALES > SKU Moderation" openScreens={[{ label: 'SKU Moderation', to: '#' }]}>
    <div className="mb-2 flex border-b bg-white"><button className="border-b-2 border-sky-600 px-4 py-2 text-sm font-medium">Unmapped SKU</button></div>
    <div className="mb-2 flex justify-end"><Btn variant="ghost" onClick={() => setAdvanced(!advanced)}>Advance Search</Btn></div>
    <EnquiryScreen breadcrumb={[{ label: 'Sales' }, { label: 'SKU Moderation' }]} fields={advanced ? fields : []} cols={cols} rows={rows} loading={loading} remote={pager} onSearch={search} onReset={reset} actions={[{ label: 'Export', icon: Download, onClick: download }]} />
    <Modal title="Product Link" open={!!selected} onClose={() => setSelected(null)} wide><div className="grid gap-4 md:grid-cols-3"><div><p className="text-xs text-slate-500">Seller SKU</p><p className="font-semibold">{selected?.seller_sku}</p><p className="text-sm">{selected?.sku_name}</p></div><div><p className="text-xs text-slate-500">Channel</p><p className="font-semibold">{selected?.channel}</p></div><label className="text-sm">Search Item to link<div className="mt-1 flex"><input aria-label="Search Item to link" placeholder="Select Item SKU..." className="inp" value={query} onChange={(event) => void fetchCandidates(event.target.value)} /><Search size={16} className="-ml-6 mt-2 text-slate-400" /></div></label></div><div className="mt-4 overflow-auto border"><table className="w-full text-sm"><thead><tr className="bg-slate-100"><th className="p-2">Select</th><th>SKU Code</th><th>SKU Description</th></tr></thead><tbody>{candidates.map((row) => <tr className="border-t" key={row.id}><td className="p-2 text-center"><input aria-label={`Select SKU ${row.sku_code}`} type="radio" name="candidate" checked={candidate === row.sku_code} onChange={() => setCandidate(row.sku_code)} /></td><td>{row.sku_code}</td><td>{row.description}</td></tr>)}</tbody></table></div><div className="mt-4 flex justify-end gap-2"><Btn variant="warn" onClick={link}>Link Now</Btn><Btn variant="ghost" onClick={() => setSelected(null)}>Close</Btn></div></Modal>
    {toast && <Toast {...toast} onClose={() => setToast(null)} />}
  </Shell>;
}
