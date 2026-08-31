import { useEffect, useState } from 'react';
import Modal from '../../components/Modal';
import Shell from '../Shell';
import { Toast } from '../parts';
import { apiRequest } from '../../lib/api';

type Variable = { name: string; mapping: string };
type Definition = { id?: number; definition_key: string; description: string; content: string; recipient_val: string; buyer_val: string; variables: Variable[]; order_status: string; is_active: boolean };
const blank = (): Definition => ({ definition_key: '', description: '', content: '', recipient_val: '-1', buyer_val: '-1', variables: [], order_status: '-1', is_active: true });
const statuses = [['-1','--- Select ---'],['13','Allocated'],['7','Cancelled'],['37','Closed'],['4','Confirmed'],['33','Delivered'],['25','Delivery created'],['22','Packed'],['10','Part Allocated'],['16','Part Picked'],['28','Partially Shipped'],['1','Pending'],['19','Pick complete'],['35','Shipped & Returned'],['31','Shipped complete']];
const mappings = [['-1','--- Select ---'],['8','AWB No'],['10','Bill Phone'],['4','Bill To Name'],['3','Customer Name'],['7','Delivery No'],['18','Delivery Status'],['20','Expected Delivery Date'],['16','Ext Transporter Name'],['13','External Invoice No'],['2','External Order No'],['9','Invoice No'],['5','Location Code'],['6','Location Name'],['14','Location Phone'],['12','Order Date'],['1','Order No'],['17','Order Status'],['19','Ship Date'],['11','Ship Phone'],['15','Transporter Name']];

async function request<T>(path: string, method: string, body?: unknown): Promise<T> {
  return apiRequest<T>(path, method, body === undefined ? undefined : { kind: 'json', value: body });
}
function mapRows(rows: Record<string, unknown>[]): Definition[] {
  return rows.map((row) => ({ id: Number(row.id), definition_key: String(row.definition_key || ''), description: String(row.description || ''), content: String(row.content || ''), recipient_val: String(row.recipient_val || '-1'), buyer_val: String(row.buyer_val || '-1'), variables: Array.isArray(row.variables) ? row.variables as Variable[] : [], order_status: String(row.order_status || '-1'), is_active: Boolean(row.is_active) }));
}

export default function ExternalAppsMoreConfiguration({ extAppId, extAppType, extAppSubId, onBack }: { extAppId: string; extAppType: string; extAppSubId: number; onBack: () => void }) {
  const [rows, setRows] = useState<Definition[]>([]);
  const [recipientIndex, setRecipientIndex] = useState<number | null>(null);
  const [variableIndex, setVariableIndex] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
  const load = async () => { try { const result = await request<{ rows: Record<string, unknown>[] }>(`/api/external-app-definitions?extAppSubId=${extAppSubId}`, 'GET'); setRows(mapRows(result.rows)); } catch (error) { setToast({ msg: error instanceof Error ? error.message : 'Search failed', type: 'err' }); } };
  useEffect(() => { request<{ rows: Record<string, unknown>[] }>(`/api/external-app-definitions?extAppSubId=${extAppSubId}`, 'GET').then((result) => setRows(mapRows(result.rows))).catch((error: unknown) => setToast({ msg: error instanceof Error ? error.message : 'Search failed', type: 'err' })); }, [extAppSubId]);
  const change = (index: number, patch: Partial<Definition>) => setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row));
  const parseVariables = (content: string) => { if (!content.trim()) throw new Error('Please fill content first.'); const values = [...content.matchAll(/%%(.*?)%%/g)].map((match) => match[1]); if (!values.length) throw new Error('The content must contains atleast one variable.'); if (new Set(values).size !== values.length) throw new Error('Duplicate variables in content.'); if (values.length > 4) throw new Error('Maximum limit for variables is 4.'); return values; };
  const openVariables = (index: number) => { try { const names = parseVariables(rows[index].content); const existing = rows[index].variables; change(index, { variables: names.map((name, position) => ({ name, mapping: existing[position]?.name === name ? existing[position].mapping : '-1' })) }); setVariableIndex(index); } catch (error) { setToast({ msg: error instanceof Error ? error.message : 'Invalid variables', type: 'err' }); } };
  const save = async (index: number) => {
    const row = rows[index];
    if (!row.definition_key.trim() || !row.description.trim() || !row.content.trim() || row.recipient_val === '-1' || row.buyer_val === '-1' || row.order_status === '-1') { setToast({ msg: 'Please fill all mandatory fields', type: 'err' }); return; }
    try {
      const names = parseVariables(row.content);
      if (names.length !== row.variables.length || row.variables.some((variable) => variable.mapping === '-1')) { setToast({ msg: 'Please fill all mandatory fields', type: 'err' }); return; }
      const result = await request<{ row: Record<string, unknown> }>('/api/saveDefinition', 'POST', { extAppID: extAppId, extAppType, extAppSubId, definitionKey: row.definition_key, description: row.description, content: row.content, recipientVal: row.recipient_val, buyerVal: row.buyer_val, variables: row.variables, orderStatus: row.order_status, isActive: row.is_active ? '1' : '0', mode: row.id ? 'Update' : 'Create', lineId: row.id || '' });
      change(index, { id: Number(result.row.id) }); setToast({ msg: 'Definition saved successfully.', type: 'ok' });
    } catch (error) { setToast({ msg: error instanceof Error ? error.message : 'Save failed', type: 'err' }); }
  };
  const toggle = async (index: number, checked: boolean) => { const row = rows[index]; if (!row.id) { change(index, { is_active: checked }); return; } if (!window.confirm('Do you really want to update?')) return; try { await request('/api/external-app-definitions', 'PATCH', { lineId: row.id, isActive: checked ? '1' : '0' }); change(index, { is_active: checked }); setToast({ msg: 'Status Updated Successfully', type: 'ok' }); } catch (error) { setToast({ msg: error instanceof Error ? error.message : 'Update failed', type: 'err' }); } };
  const cloneRow = (index: number) => setRows((current) => [...current.slice(0, index + 1), blank(), ...current.slice(index + 1)]);
  const removeRow = async (index: number) => { const row = rows[index]; if (!row.id) { setRows((current) => current.filter((_, rowIndex) => rowIndex !== index)); return; } if (!window.confirm('Do you really want to delete?')) return; try { await request('/api/saveDefinition', 'POST', { extAppID: extAppId, extAppType, extAppSubId, definitionKey: row.definition_key, mode: 'Delete', lineId: row.id }); setRows((current) => current.filter((_, rowIndex) => rowIndex !== index)); setToast({ msg: 'Data deleted successfully', type: 'ok' }); } catch (error) { setToast({ msg: error instanceof Error ? error.message : 'Delete failed', type: 'err' }); } };

  return <Shell active="master" breadcrumb="MASTER > Miscellaneous > More Configuration" openScreens={[{ label: 'More Configuration', to: '#' }]}>
    <div className="mb-3 flex justify-end gap-2"><button title="Search" aria-label="Search" className="rounded bg-[#f5a623] px-3 py-2 text-white" onClick={() => void load()}>⌕</button><button title="Clear Search" aria-label="Clear Search" className="rounded border px-3 py-2" onClick={() => setRows([])}>↻</button></div>
    <section className="border bg-white">
      <button id="createDefinition" className="w-full border-b bg-slate-100 px-5 py-3 text-left text-lg font-semibold" onClick={() => setRows((current) => current.length ? current : [blank()])}>Create Definition</button>
      <div className="overflow-x-auto"><table className="w-full min-w-[1200px] text-sm"><thead className="bg-slate-100"><tr>{['Definition Key','Description','Content','Recipient','Variables','Order Status','Action'].map((heading) => <th key={heading} className="border p-2">{heading}</th>)}</tr></thead><tbody>
        {rows.map((row, index) => <tr key={row.id || `new-${index}`} className="border-t">
          <td className="p-2"><input aria-label={`Definition Key ${index + 1}`} disabled={Boolean(row.id)} className="inp" value={row.definition_key} onChange={(event) => change(index, { definition_key: event.target.value })} /></td>
          <td className="p-2"><input aria-label={`Description ${index + 1}`} disabled={Boolean(row.id)} className="inp" value={row.description} onChange={(event) => change(index, { description: event.target.value })} /></td>
          <td className="p-2"><textarea aria-label={`Content ${index + 1}`} disabled={Boolean(row.id)} className="inp min-h-20" value={row.content} onChange={(event) => change(index, { content: event.target.value, variables: [] })} /></td>
          <td className="p-2"><button className="text-[#2179d0]" onClick={() => setRecipientIndex(index)}>Recipients</button></td>
          <td className="p-2"><button className="text-[#2179d0]" onClick={() => openVariables(index)}>Variables</button></td>
          <td className="p-2"><select aria-label={`Order Status ${index + 1}`} className="inp" value={row.order_status} onChange={(event) => change(index, { order_status: event.target.value })}>{statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></td>
          <td className="p-2"><div className="flex min-w-64 items-center justify-center gap-3"><label className="whitespace-nowrap font-semibold">Is Active <input aria-label={`Is Active ${index + 1}`} className="ml-1" type="checkbox" checked={row.is_active} onChange={(event) => void toggle(index, event.target.checked)} /></label><button aria-label="Submit" className="whitespace-nowrap text-[#2179d0]" onClick={() => void save(index)}>✎ Submit</button><button title="Add New Parameter" aria-label={`Add New Parameter ${index + 1}`} className="h-8 w-8 rounded bg-emerald-700 text-xl text-white" onClick={() => cloneRow(index)}>+</button><button title="Remove Parameter" aria-label={`Remove Parameter ${index + 1}`} className="h-8 w-8 rounded bg-red-700 text-xl text-white" onClick={() => void removeRow(index)}>×</button></div></td>
        </tr>)}
      </tbody></table>{!rows.length && <p className="p-12 text-center text-slate-400">No records to view</p>}</div>
    </section>
    <div className="mt-4 flex items-center justify-between"><span className="font-semibold">More Configuration</span><button className="rounded border px-4 py-2" onClick={onBack}>Cancel</button></div>
    <Modal title="Recipient" open={recipientIndex !== null} onClose={() => setRecipientIndex(null)}>{recipientIndex !== null && <div className="space-y-3">
      <label className="text-sm">Recipient<select aria-label="Recipient" className="inp mt-1" value={rows[recipientIndex].recipient_val} onChange={(event) => change(recipientIndex, { recipient_val: event.target.value, buyer_val: '-1' })}><option value="-1">--- Select ---</option><option value="2">Buyer</option><option value="1">Seller</option></select></label>
      {rows[recipientIndex].recipient_val !== '-1' && <label className="text-sm">{rows[recipientIndex].recipient_val === '2' ? 'Buyer Details' : 'Seller Details'}<select aria-label="Recipient Details" className="inp mt-1" value={rows[recipientIndex].buyer_val} onChange={(event) => change(recipientIndex, { buyer_val: event.target.value })}><option value="-1">--- Select ---</option>{(rows[recipientIndex].recipient_val === '2' ? [['2','Bill To'],['3','Both'],['1','Ship To']] : [['2','Alternate Contact No'],['3','Both'],['1','Primary Contact No']]).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>}
      <div className="flex justify-end"><button aria-label="OK" className="rounded bg-[#f5a623] px-4 py-2 text-white" onClick={() => { const row = rows[recipientIndex]; if (row.recipient_val === '-1') { setToast({ msg: 'Please select recipient.', type: 'err' }); return; } if (row.buyer_val === '-1') { setToast({ msg: row.recipient_val === '2' ? 'Please select buyer.' : 'Please select seller.', type: 'err' }); return; } setRecipientIndex(null); }}>✓ OK</button></div>
    </div>}</Modal>
    <Modal title="Variables" open={variableIndex !== null} onClose={() => setVariableIndex(null)} wide>{variableIndex !== null && <div><table className="w-full text-sm"><thead><tr><th>Definition Key</th><th>Variables</th><th>Mapping</th></tr></thead><tbody>{rows[variableIndex].variables.map((variable, index) => <tr key={`${variable.name}-${index}`}><td className="p-2"><input className="inp" disabled value={rows[variableIndex].definition_key} /></td><td className="p-2"><input className="inp" disabled value={variable.name} /></td><td className="p-2"><select aria-label={`Variable ${variable.name}`} className="inp" value={variable.mapping} onChange={(event) => change(variableIndex, { variables: rows[variableIndex].variables.map((item, itemIndex) => itemIndex === index ? { ...item, mapping: event.target.value } : item) })}>{mappings.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></td></tr>)}</tbody></table><div className="mt-4 flex justify-end"><button aria-label="OK" className="rounded bg-[#f5a623] px-4 py-2 text-white" onClick={() => setVariableIndex(null)}>✓ OK</button></div></div>}</Modal>
    {toast && <Toast {...toast} onClose={() => setToast(null)} />}
  </Shell>;
}
