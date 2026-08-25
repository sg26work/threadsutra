import { cors, find, insert, update, updateWhere } from './mongo.js';
const text=value=>String(value??'').trim();
const has=(value,query)=>!text(query)||text(query)==='-1'||text(value).toLowerCase().includes(text(query).toLowerCase());
const labels=['Unique Batch Nos','Lottable2','Mfg Date','Lottable 04','Batch No','Recv Date','Lottable 07'];
const normalize=row=>({...row,lotValCode:row.lot_val_code||row.code||'',description:row.description||row.name||'',isDefault:!!row.is_default,lottables:Array.from({length:7},(_,i)=>row.lottables?.[i]||{label:labels[i],mandatory:false,outward:false,mask:'',length:[0,4,5,6].includes(i)?'50':''})});
const validate=body=>{
 if(!text(body.lotValCode))return 'Please Enter Lottable Validation Code';
 if(!text(body.description))return 'Please Enter Description';
 if(!/^[a-zA-Z0-9]+$/.test(text(body.lotValCode)))return 'Please Enter Only AlphaNumerics';
 const lots=Array.isArray(body.lottables)?body.lottables:[];
 for(const index of [0,4,5,6]){const length=text(lots[index]?.length);if(Number(length)>50)return `Length${index+1} exceeds the limit`;if(length&&!/^\d*[aA]?[\-.]?\d*[aA]?[\-.]?\d*$/.test(length))return 'Please Enter Valid Length';if(text(lots[index]?.mask).length>Number(length||0))return `Mask${index+1} exceeds the limit`;}
 return '';
};
export default async function handler(req,res){
 if(cors(req,res))return;
 try{
  const body=req.body||{};
  if(req.method==='POST'&&(body.REQ_SEARCH_FLAG||body.action==='search')){
   const defaultFilter=['1','Yes'].includes(text(body.isDefault))?true:['0','No'].includes(text(body.isDefault))?false:null;
   let rows=(await find('generic_records',{module:'lottable-validation'})).map(normalize).filter(r=>has(r.lotValCode,body.receivingValidationCode)&&has(r.description,body.description)&&(defaultFilter===null||defaultFilter===r.isDefault));
   rows.sort((a,b)=>text(a.lotValCode).localeCompare(text(b.lotValCode))*(text(body.sord)==='asc'?1:-1));
   const size=[20,50,100,200].includes(Number(body.rows))?Number(body.rows):20,page=Math.max(1,Number(body.page)||1),records=rows.length,total=Math.ceil(records/size),gridModel=rows.slice((page-1)*size,page*size);
   return res.json({gridModel,lottableValidationDTOs:gridModel,rows:size,record:records,page,records,total});
  }
  if(req.method==='POST'||req.method==='PUT'){
   const error=validate(body);if(error)return res.status(400).json({error});
   const code=text(body.lotValCode).toUpperCase(),all=await find('generic_records',{module:'lottable-validation'}),existing=all.find(x=>text(x.lot_val_code||x.code).toUpperCase()===code);
   if(req.method==='POST'&&existing)return res.status(409).json({error:'Lottable Validation Code already exists.'});
   if(req.method==='PUT'&&!existing)return res.status(404).json({error:'Lottable Validation was not found.'});
   if(body.isDefault)await updateWhere('generic_records',{module:'lottable-validation'},{is_default:false});
   const fields={module:'lottable-validation',code,lot_val_code:code,name:text(body.description),description:text(body.description),is_default:!!body.isDefault,lottables:body.lottables,modified_by:'super admin',modified_date:new Date().toISOString()};
   if(existing){const changed=await update('generic_records',existing.id,fields);return res.json({row:normalize(changed[0]),jsonMessage:'Data saved successfully.'});}
   const row=await insert('generic_records',{...fields,created_by:'super admin',created_date:new Date().toISOString()});return res.status(201).json({row:normalize(row),jsonMessage:'Data saved successfully.'});
  }
  return res.status(405).json({error:'Method not allowed'});
 }catch(error){console.error('Lottable Validation error:',error);return res.status(500).json({error:error.message});}
}
