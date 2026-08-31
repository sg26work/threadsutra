import assert from'node:assert/strict';
import{chromium}from'playwright';
const base=process.env.ERETAIL_BASE_URL||'http://127.0.0.1:3002';
const send=async body=>{const r=await fetch(`${base}/api/inventory`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});return{r,j:await r.json()}};
const meta=await(await fetch(`${base}/api/inventory?meta=true`)).json();
assert.deepEqual(meta.pageSizes,[20,50,100,200]);
for(const size of meta.pageSizes){const x=await send({action:'search',REQ_SEARCH_FLAG:true,tab:'sku',rows:size,page:1,sidx:'sku',sord:'desc'});assert.equal(x.r.status,200);assert.equal(x.j.page,1);assert.ok(x.j.rows.length<=size);assert.equal(typeof x.j.records,'number')}
const b=await chromium.launch({headless:true}),p=await b.newPage({viewport:{width:1440,height:1000}}),errors=[];
p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>m.type()==='error'&&errors.push(m.text()));
try{
 await p.addInitScript(()=>localStorage.setItem('vin_user',JSON.stringify({username:'inventory-verifier'})));await p.goto(`${base}/app/inventory`,{waitUntil:'domcontentloaded'});const module=p.locator('[data-screen-frame][aria-hidden="false"] main').last();
 for(const tab of['By SKU','By SKU BIN','By SKU LOT','By SKU BIN LOT','By SKU IMEI','By SKU UNIQUE NO','Market Place Inventory','By SKU BOM'])await module.getByRole('button',{name:tab,exact:true}).waitFor();
 assert.deepEqual(await module.getByLabel('Page size').locator('option').allTextContents(),['20','50','100','200']);
 for(const h of['SKU Code','Style','Mfg SKU Code','Hierarchy Code','Size','Inv Bucket','Total Qty','Available Qty','Commited Qty','Picked Qty','Transit Qty','Open Qty','Brand Code','Vendor Code','Site Location','On Hold','WAC','Primary UPC/EAN','Blocked Qty'])await module.getByRole('columnheader',{name:h,exact:true}).waitFor();
 await module.getByRole('button',{name:'Search',exact:true}).click();await module.getByText(/View 1 -|No records to view/).waitFor();
 await module.getByRole('button',{name:'By SKU BIN',exact:true}).click();await module.getByLabel('BIN Code',{exact:true}).waitFor();
 await module.getByRole('button',{name:'By SKU IMEI',exact:true}).click();await module.getByLabel('IMEI',{exact:true}).waitFor();
 await module.getByRole('button',{name:'By SKU UNIQUE NO',exact:true}).click();await module.getByLabel('SKU Unique No',{exact:true}).waitFor();
 await module.getByRole('button',{name:'Market Place Inventory',exact:true}).click();await module.getByLabel('Channel',{exact:true}).waitFor();
 await module.getByRole('button',{name:'By SKU BOM',exact:true}).click();await module.getByLabel('Inventory Type',{exact:true}).waitFor();
 await module.getByRole('button',{name:'Reset',exact:true}).click();assert.equal(await p.locator('vite-error-overlay').count(),0);assert.deepEqual(errors,[]);
 console.log('PASS Inventory View: eight live tabs, API search/paging contract, 20/50/100/200 sizes, exact primary grid, filters, reset, and clean browser state.');
}finally{await b.close()}
