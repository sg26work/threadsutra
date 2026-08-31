import { useEffect, useState } from 'react';
import Shell from '../Shell';
import EnquiryScreen from '../EnquiryScreen';
import Modal from '../../components/Modal';
import { Toast } from '../parts';
import { apiGet, apiSend } from '../../lib/api';

const blank = { code: '', name: '', price_zone_group: '', external_price_zone: '', external_price_zone_name: '', markup: '', hierarchy_code: '', active: true };
const groups = ['Price Zone Group One', 'Price Zone Group Three', 'Price Zone Group Two'];
const columns = [
  { key: 'code', label: 'Price Zone Code', filterKey: 'priceZoneCode' }, { key: 'name', label: 'Price Zone', filterKey: 'internalPriceZoneName' },
  { key: 'external_price_zone_name', label: 'External Price Zone', filterKey: 'externalPriceZoneName' }, { key: 'markup', label: 'Margin Percent', filterKey: 'marginPercent' },
  { key: 'price_zone_group', label: 'Price Zone Group', filter: 'select' as const, filterKey: 'priceZoneGroup', options: groups }, { key: 'hierarchy_code', label: 'Category' },
  { key: 'status', label: 'Status', filter: 'select' as const, filterKey: 'isActive', options: ['Active', 'Inactive'] }, { key: 'created_by', label: 'Created By', filter: 'none' as const },
  { key: 'created_date', label: 'Created Date', filter: 'none' as const }, { key: 'modified_by', label: 'Updated By', filter: 'none' as const },
  { key: 'modified_date', label: 'Updated Date', filter: 'none' as const },
];

export default function PriceZone() {
  const [tab, setTab] = useState<'PriceZone' | 'PriceZonePolicy'>('PriceZone');
  const [rows, setRows] = useState<any[]>([]);
  const [pager, setPager] = useState({ page: 0, total: 0, records: 0, pageSize: 20 });
  const [meta, setMeta] = useState<any>({ hierarchies: [] });
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [audit, setAudit] = useState<any>(null);
  const [form, setForm] = useState<any>(blank);
  const [editing, setEditing] = useState<any>(null);
  const [toast, setToast] = useState<any>(null);

  useEffect(() => { apiGet('/api/price-zones').then(setMeta); }, []);

  const search = async (filters: any = {}, page = 1, size = pager.pageSize, activeTab = tab) => {
    setLoading(true);
    try {
      const result: any = await apiSend('/api/price-zones', 'POST', { rows: size, page, sidx: 'priceZoneCode', sord: 'desc', ...filters, searchTab: activeTab, REQ_SEARCH_FLAG: true });
      setRows(result.rows);
      setPager({ page: result.page, total: result.total, records: result.records, pageSize: size });
    } catch (error: any) { setToast({ msg: error.message, type: 'err' }); }
    finally { setLoading(false); }
  };

  const changeTab = (next: 'PriceZone' | 'PriceZonePolicy') => { setTab(next); void search({}, 1, pager.pageSize, next); };
  const copyToEditor = (row: any) => { setEditing(row); setForm({ ...blank, ...row, active: row.status !== 'Inactive' }); setOpen(true); };
  const validationError = (msg: string, id: string) => {
    setToast({ msg, type: 'err' });
    requestAnimationFrame(() => document.getElementById(id)?.focus());
    return false;
  };
  const save = async () => {
    if (!form.price_zone_group) return validationError('Please select price zone Group', 'priceZoneGroup');
    if (tab === 'PriceZonePolicy') {
      if (!form.external_price_zone) return validationError('Please Select Price Zone', 'externalPriceZoneCode');
      if (!form.hierarchy_code) return validationError('Please select Category', 'priceZoneCategory');
    } else if (!String(form.name || '').trim()) return validationError('Please Enter Internal Price Zone', 'internalPriceZoneName');
    if (!String(form.markup || '').trim()) return validationError('Please Enter Internal Margin Percent', 'marginPercent');
    if (!/^\d+(\.\d{1,3})?$/.test(String(form.markup))) return validationError('Please Enter Only Decimal value in Margin Percent!', 'marginPercent');
    try {
      await apiSend('/api/price-zones', editing ? 'PUT' : 'POST', editing ? { ...form, id: editing.id } : form);
      setOpen(false); setEditing(null); setForm(blank); setToast({ msg: 'Price Zone saved successfully', type: 'ok' }); await search();
    } catch (error: any) { setToast({ msg: error.message, type: 'err' }); }
  };
  const remove = async (row: any) => {
    if (!window.confirm('Do you want to delete price zone')) return;
    try {
      const result: any = await apiSend(`/api/price-zones?id=${row.id}`, 'DELETE', { priceZoneCode: row.code, category: row.hierarchy_code, REQ_SEARCH_FLAG: true });
      setToast({ msg: result.jsonMessage || 'Price Zone deleted successfully', type: 'ok' }); await search();
    } catch (error: any) { setToast({ msg: error.message, type: 'err' }); }
  };

  return <Shell active="master" breadcrumb="MASTER > Price Zone Master" openScreens={[{ label: 'Price Zone Master', to: '#' }]}>
    <div className="flex border-b bg-white">
      <button onClick={() => changeTab('PriceZone')} className={`px-5 py-3 ${tab === 'PriceZone' ? 'border-b-2 border-red-500' : ''}`}>Price Zone</button>
      <button onClick={() => changeTab('PriceZonePolicy')} className={`px-5 py-3 ${tab === 'PriceZonePolicy' ? 'border-b-2 border-red-500' : ''}`}>Price Zone Policy</button>
    </div>
    <EnquiryScreen key={tab} breadcrumb={[{ label: 'Price Zone Master' }]} cols={tab === 'PriceZonePolicy' ? columns : columns.filter((column) => column.key !== 'hierarchy_code')} rows={rows} loading={loading} remote={pager} textFilterBehavior="debounced" selectFilterBehavior="change" filterDelay={500} onSearch={search} onReset={() => { setRows([]); setPager({ page: 0, total: 0, records: 0, pageSize: 20 }); }} onRowEdit={copyToEditor} onRowInfo={setAudit} onRowDelete={remove} actions={[{ label: 'Add New', onClick: () => { setForm(blank); setEditing(null); setOpen(true); } }]} />
    <Modal title={editing ? 'Edit Price Zone' : 'Add Price Zone'} open={open} onClose={() => setOpen(false)} wide>
      <div className="grid gap-3 md:grid-cols-2">
        {[['code', 'Price Zone Code', 'priceZoneCode'], ['name', 'Price Zone', 'internalPriceZoneName'], ['external_price_zone_name', 'External Price Zone', 'externalPriceZoneName'], ['markup', 'Margin Percent', 'marginPercent']].map(([key, label, id]) => <label key={key} className="text-xs">{label}<input id={id} aria-label={label} className="inp mt-1" value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} /></label>)}
        <label className="text-xs">Price Zone Group<select id="priceZoneGroup" aria-label="Price Zone Group" className="inp mt-1" value={form.price_zone_group} onChange={(event) => setForm({ ...form, price_zone_group: event.target.value })}><option value="">--- Select ---</option>{groups.map((group) => <option key={group}>{group}</option>)}</select></label>
        <label className="text-xs">Category<select id="priceZoneCategory" aria-label="Category" className="inp mt-1" value={form.hierarchy_code} onChange={(event) => setForm({ ...form, hierarchy_code: event.target.value })}><option value="">--- Select ---</option>{(meta.hierarchies || []).map((item: any) => <option key={item.id} value={item.code}>{item.name || item.code}</option>)}</select></label>
        <label className="text-xs">External Price Zone Code<input id="externalPriceZoneCode" aria-label="External Price Zone Code" className="inp mt-1" value={form.external_price_zone} onChange={(event) => setForm({ ...form, external_price_zone: event.target.value })} /></label>
        <label className="flex items-center gap-2"><input aria-label="IsActive" type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} />IsActive</label>
      </div>
      <div className="mt-5 flex justify-end gap-2"><button onClick={save} className="rounded bg-[#f5a623] px-4 py-2 text-white">Save</button><button onClick={() => setOpen(false)} className="rounded border px-4 py-2">Close</button></div>
    </Modal>
    <Modal title="Audit Details" open={Boolean(audit)} onClose={() => setAudit(null)}><dl className="grid grid-cols-2 gap-3 text-sm"><dt>Created By</dt><dd>{audit?.created_by}</dd><dt>Created Date</dt><dd>{audit?.created_date}</dd><dt>Updated By</dt><dd>{audit?.modified_by}</dd><dt>Updated Date</dt><dd>{audit?.modified_date}</dd></dl></Modal>
    {toast && <Toast {...toast} onClose={() => setToast(null)} />}
  </Shell>;
}
