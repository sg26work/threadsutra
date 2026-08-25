import { find, findOne, insert, update, cors } from './mongo.js';
const normalize = (x) => ({ ...x, client_id: x.client_id || x.code, client_name: x.client_name || x.name, client_short_name: x.client_short_name || '', status: x.status || 'Active', is_active: x.is_active ?? x.status !== 'Inactive' });
const clean = (b) => ({ ...b, code: String(b.client_id), name: b.client_name, type: 'Client', client_id: String(b.client_id), client_name: b.client_name, client_short_name: b.client_short_name, contact: b.contact_person || '', phone: b.phone || '', email: b.email || '', city: b.city || '', state: b.state || '', gstin: b.gstin || '' });
export default async function handler(req,res){
 if(cors(req,res))return;
 try{
  if(req.method==='GET')return res.status(200).json((await find('partners',{type:'Client'},{sort:{id:-1}})).map(normalize));
  if(req.method==='POST'&&req.body?.REQ_SEARCH_FLAG){
   const b=req.body,has=(v,q)=>!String(q??'').trim()||String(v??'').toLowerCase().includes(String(q).trim().toLowerCase());
   const filtered=(await find('partners',{type:'Client'},{sort:{id:-1}})).map(normalize).filter(r=>has(r.client_id,b.clientId)&&has(r.client_name,b.clientName)&&has(r.client_short_name,b.clientShortName)&&has(r.status,b.status)&&has(r.country,b.country)&&has(r.state,b.state)&&has(r.city,b.city));
   const size=[20,50,100,200].includes(Number(b.rows))?Number(b.rows):20,page=Math.max(1,Number(b.page)||1),records=filtered.length,total=Math.ceil(records/size),gridModel=filtered.slice((page-1)*size,page*size);
   return res.status(200).json({gridModel,rows:gridModel,page,records,total,sidx:String(b.sidx||'clientId'),sord:String(b.sord||'desc')});
  }
  if(req.method==='POST'){
   const b=req.body,id=String(b.client_id||'').trim(); if(!/^\d+$/.test(id))return res.status(400).json({error:'Client Id must be numeric.'});
   for(const[k,msg]of[['client_name','Client Name'],['client_short_name','Client Short Name'],['address1','Address1'],['phone','Phone'],['country','Country'],['state','State']])if(!String(b[k]||'').trim()||b[k]==='--- Select ---')return res.status(400).json({error:`${msg} is mandatory.`});
   if(await findOne('partners',{code:id}))return res.status(409).json({error:'Client Id Already Exist.'}); if((await find('partners',{name:b.client_name})).some(x=>x.type==='Client'))return res.status(409).json({error:'Client Name Already Exist.'}); if(b.email&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(b.email))return res.status(400).json({error:'Wrong Email.'}); return res.status(201).json(normalize(await insert('partners',{...clean(b),status:b.status||'Active',is_active:(b.status||'Active')==='Active',created_date:new Date().toISOString().slice(0,10)})));
  }
  if(req.method==='PUT'){
   const{id,...b}=req.body,current=await findOne('partners',{id:Number(id)}); if(!current||current.type!=='Client')return res.status(404).json({error:'Client not found'}); const next=clean({...normalize(current),...b}); if(!String(next.name||'').trim())return res.status(400).json({error:'Client Name is mandatory.'}); const dupe=(await find('partners',{code:next.code})).find(x=>x.id!==Number(id)); if(dupe)return res.status(409).json({error:'Client Id Already Exist.'}); const[saved]=await update('partners',Number(id),{...next,status:b.status||current.status||'Active',is_active:(b.status||current.status||'Active')==='Active'}); return res.status(200).json(normalize(saved));
  }
  if(req.method==='DELETE')return res.status(409).json({error:'Clients cannot be deleted. Set Status to Inactive instead.'}); return res.status(405).json({error:'Method not allowed'});
 }catch(err){console.error('clients error:',err);return res.status(500).json({error:err.message});}
}
