import { cors,find,insert,update,updateWhere } from './mongo.js';
const text=v=>String(v??'').trim(),has=(v,q)=>!text(q)||text(v).toLowerCase().includes(text(q).toLowerCase());
const boolKeys=['receiveMoreThanPO','isDefault','allowOtherThanPOSKUs','lineLevelInvoiceQty','headerLevelInvoiceQty','matchMRP','invoiceDateMandatory','invoiceAmountMandatory','invoiceTaxMandatory','materialRcvdDate','allowExcessQty','generateAdvUSN','allowVirtualBom','attachmentMandatory','invoiceAmountValidation','challanNoMandatory','mrpValidation','reasonMandatory','marginValidation','withOutMarginValidation','restrictShortReceiving'];
const normalize=row=>{const out={...row,receivingValidationCode:row.receiving_validation_code||row.code||'',description:row.description||row.name||'',percentage:row.percentage??'',varianceAllowed:row.variance_allowed??'',mrpVarianceAllowed:row.mrp_variance_allowed??'',marginVarianceAllowed:row.margin_variance_allowed??'',withOutMarginVarianceAllowed:row.without_margin_variance_allowed??'',shortReceivingTolerance:row.short_receiving_tolerance??''};for(const k of boolKeys)out[k]=!!row[k];return out};
const validate=b=>{
 if(!text(b.receivingValidationCode))return 'Please Enter Receipt Validation Code';
 if(!text(b.description))return 'Please Enter Description';
 if(!/^[a-zA-Z0-9]+$/.test(text(b.receivingValidationCode)))return 'Please Enter Only AlphaNumerics';
 if(text(b.percentage)&&!/^\d*[aA]?[\-.]?\d*[aA]?[\-.]?\d*$/.test(text(b.percentage)))return 'Please Enter Valid Percentage';
 if(b.invoiceAmountValidation&&!/^\+?\d+$/.test(text(b.varianceAllowed)))return 'Variance Allowed is mandatory';
 if(b.mrpValidation&&!text(b.mrpVarianceAllowed))return 'Variance Allowed for MRP is mandatory';
 if(b.mrpValidation&&!/^\+?\d+$/.test(text(b.mrpVarianceAllowed)))return 'Only Numeric Value is allowed in Variance Allowed for MRP';
 if(b.marginValidation&&!text(b.marginVarianceAllowed))return 'Margin Variance Allowed for Margin is mandatory';
 if(b.withOutMarginValidation&&!text(b.withOutMarginVarianceAllowed))return 'Without Margin Variance Allowed for Without Margin is mandatory';
 if(b.restrictShortReceiving&&!text(b.shortReceivingTolerance))return 'Less Receiving Tolerance is Mandatory.';
 if(b.restrictShortReceiving&&Number(b.shortReceivingTolerance)>100)return 'Less Receiving Tolerance Percentage cant be greater than 100';
 return '';
};
export default async function handler(req,res){
 if(cors(req,res))return;
 try{const b=req.body||{};
  if(req.method==='POST'&&(b.REQ_SEARCH_FLAG||b.action==='search')){
   let rows=(await find('generic_records',{module:'receipt-validation'})).map(normalize).filter(r=>has(r.receivingValidationCode,b.receivingValidationCode)&&has(r.description,b.description));
   for(const k of boolKeys)if(b[k]===true||b[k]==='true')rows=rows.filter(r=>r[k]);
   rows.sort((a,c)=>text(a.receivingValidationCode).localeCompare(text(c.receivingValidationCode))*(text(b.sord)==='asc'?1:-1));
   const size=[20,50,100,200].includes(Number(b.rows))?Number(b.rows):20,page=Math.max(1,Number(b.page)||1),records=rows.length,total=Math.ceil(records/size),gridModel=rows.slice((page-1)*size,page*size);return res.json({gridModel,rows:gridModel,page,records,total});
  }
  if((req.method==='POST'&&b.action==='save')||req.method==='PUT'){
   const error=validate(b);if(error)return res.status(400).json({error});const code=text(b.receivingValidationCode).toUpperCase(),all=await find('generic_records',{module:'receipt-validation'}),existing=all.find(x=>text(x.receiving_validation_code||x.code).toUpperCase()===code);
   if(req.method==='POST'&&existing)return res.status(409).json({error:'Receipt Validation Code already exists.'});if(req.method==='PUT'&&!existing)return res.status(404).json({error:'Receipt Validation was not found.'});if(b.isDefault)await updateWhere('generic_records',{module:'receipt-validation'},{isDefault:false});
   const fields={module:'receipt-validation',code,receiving_validation_code:code,name:text(b.description),description:text(b.description),percentage:text(b.percentage||'0'),variance_allowed:text(b.varianceAllowed),mrp_variance_allowed:text(b.mrpVarianceAllowed),margin_variance_allowed:text(b.marginVarianceAllowed),without_margin_variance_allowed:text(b.withOutMarginVarianceAllowed),short_receiving_tolerance:text(b.shortReceivingTolerance),modified_by:'super admin',modified_date:new Date().toISOString()};for(const k of boolKeys)fields[k]=!!b[k];
   if(existing){const changed=await update('generic_records',existing.id,fields);return res.json({row:normalize(changed[0]),jsonMessage:'Data saved successfully.'});}const row=await insert('generic_records',{...fields,created_by:'super admin',created_date:new Date().toISOString()});return res.status(201).json({row:normalize(row),jsonMessage:'Data saved successfully.'});
  }return res.status(405).json({error:'Method not allowed'});
 }catch(error){console.error('Receipt Validation error:',error);return res.status(500).json({error:error.message});}
}
