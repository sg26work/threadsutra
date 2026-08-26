import { find, findOne, insert, update, cors } from './mongo.js';
const text=(v)=>String(v??'').trim(), types=['validation','routing','return','seller','shipping','allocation'];
const endpoints={validation:'jsonSaveOrderValidationRule',routing:'jsonSaveOrderRoutingRule',return:'jsonSaveReturnRoutingRule',seller:'jsonSaveSellerPanelOrderRule',shipping:'jsonSaveShippingRule',allocation:'jsonSaveAllocRule'};
const validate=(b)=>{
 if(!text(b.name))return b.rule_type==='validation'?'Rule Name is mandatory':'Rule Name is Mandatory.';
 if(!text(b.status))return b.rule_type==='validation'?'Rule Status is mandatory':'Status is Mandatory.';
 if(['validation','routing','return'].includes(b.rule_type)&&!(b.locations||[]).length)return b.rule_type==='validation'?'Location is mandatory':'common.shippingrule.applicableLocations is Mandatory.';
 if(b.rule_type==='validation'&&!text(b.event))return 'Event is mandatory';
 if(b.rule_type==='routing'&&!text(b.priority_type))return 'Location Filter Criterion is Mandatory.';
 if(b.rule_type==='routing'&&b.priority_type==='Location Type'&&!text(b.location_type))return 'Location Type is Mandatory.';
 if(b.rule_type==='routing'&&b.priority_type==='Location Tags'&&!(b.location_tags||[]).length)return 'Location Tags is Mandatory.';
 if(b.rule_type==='shipping'&&!(b.locations||[]).length)return 'common.shippingrule.applicableLocations is Mandatory.';
 if(['shipping','allocation'].includes(b.rule_type)&&!text(b.client))return 'Client is mandatory';
 if(b.rule_type==='shipping'&&!text(b.rule_direction))return 'Rule Type is Mandatory.';
 if(b.rule_type==='allocation'&&!text(b.warehouse))return 'Warehouse is Mandatory.';
 if(b.rule_type==='allocation'&&!(b.actions||[]).some((x)=>text(x.operand)))return 'No Action defined (Allocation strategy)';
 return '';
};
export default async function handler(req,res){if(cors(req,res))return;try{
 if(req.method==='GET'){
  const type=text(req.query?.type),active=text(req.query?.active),page=Math.max(1,Number(req.query?.page)||1),size=20;
  let rows=(await find('oms_rules',{}, {sort:{priority:1}})).filter(r=>(!type||r.rule_type===type)&&(active!=='true'||r.status==='Active'));
  const records=rows.length,total=Math.max(1,Math.ceil(records/size)); rows=rows.slice((page-1)*size,page*size);
  return res.status(200).json({rows,page,total,records,clients:['0-DummyClient'],locations:await find('generic_records',{module:'location'}),channels:await find('channels',{}),endpoints});
 }
 if(req.method==='POST'||req.method==='PUT'){
  const b=req.body,ruleType=text(b.rule_type); if(!types.includes(ruleType))return res.status(400).json({error:'Invalid OMS rule type.'}); const error=validate(b);if(error)return res.status(400).json({error});
  const current=req.method==='PUT'?await findOne('oms_rules',{id:Number(b.id)}):null;if(req.method==='PUT'&&!current)return res.status(404).json({error:'OMS Rule not found.'});
  const doc={code:current?.code||`OMS-${Date.now()}`,rule_type:ruleType,name:text(b.name),priority:Math.max(1,Number(b.priority)||1),status:text(b.status),channel_type:text(b.channel_type),locations:Array.isArray(b.locations)?b.locations:[],event:text(b.event),apply_to_all:Boolean(b.apply_to_all),check_inventory:Boolean(b.check_inventory),priority_type:text(b.priority_type),location_type:text(b.location_type),location_tags:Array.isArray(b.location_tags)?b.location_tags:[],client:text(b.client),warehouse:text(b.warehouse),document_type:text(b.document_type),rule_direction:text(b.rule_direction),all_conditions:Array.isArray(b.all_conditions)?b.all_conditions:[],any_conditions:Array.isArray(b.any_conditions)?b.any_conditions:[],actions:Array.isArray(b.actions)?b.actions:[],save_endpoint:endpoints[ruleType],updated_at:new Date().toISOString()};
  const saved=req.method==='POST'?await insert('oms_rules',doc):(await update('oms_rules',current.id,doc))[0];return res.status(req.method==='POST'?201:200).json({row:saved,message:req.method==='POST'?(ruleType==='allocation'?'Allocation Rules Saved Succesfully':'Rule Saved Successfully'):'Rule Updated Successfully'});
 }
 if(req.method==='PATCH'){
  const current=await findOne('oms_rules',{id:Number(req.body.id)});if(!current)return res.status(404).json({error:'OMS Rule not found.'});const fields={};if(req.body.priority!==undefined)fields.priority=Math.max(1,Number(req.body.priority)||current.priority);if(req.body.active!==undefined)fields.status=req.body.active?'Active':'Inactive';return res.status(200).json((await update('oms_rules',current.id,fields))[0]);
 }
 return res.status(405).json({error:'Method not allowed'});
}catch(error){console.error('oms rules error:',error);return res.status(500).json({error:error.message})}}
