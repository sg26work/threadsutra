import { cors } from './mongo.js';
const text=v=>String(v??'').trim();
export default async function handler(req,res){
 if(cors(req,res))return;
 try{if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});const b=req.body||{};
  if(!text(b.labelId)||text(b.labelId)==='-1')return res.status(400).json({error:'Please select a Label Type'});
  if(!text(b.data))return res.status(400).json({error:'Please Enter Valid Data'});
  const lines=text(b.data).split(/\r?\n/).filter(x=>text(x));if(lines.length>100)return res.status(400).json({error:'Max 100 lines are allowed at a time'});
  const valid=[],failed=[];for(const line of lines){const cells=line.split(',').map(text);if(cells.length<2||cells.length>7){failed.push(line);continue}const qty=Number(cells[1]);if(!Number.isFinite(qty)||!Number.isInteger(qty)||qty<=0){failed.push(`${line} Not a valid sku.`);continue}valid.push({sku:cells[0],qty,uomCode:cells[2]||'',skuBarcode:cells[3]||'',params:cells.slice(4)})}
  if(!valid.length)return res.status(400).json({error:'Please Enter Valid Data',failed});return res.json({printed:valid.reduce((n,x)=>n+x.qty,0),rows:valid.length,failed,message:failed.length?'Operation successfully performed with some error':'Operation successfully performed',format:b.pdf?'pdf':'printer'});
 }catch(error){console.error('SKU Label Print error:',error);return res.status(500).json({error:error.message});}
}
