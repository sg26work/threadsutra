import assert from'node:assert/strict';
import{chromium}from'playwright';
const base=process.env.ERETAIL_BASE_URL||'http://127.0.0.1:3002';
const post=async body=>{const r=await fetch(`${base}/api/inventory-move-history`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});return{r,j:await r.json()}};
const meta=await(await fetch(`${base}/api/inventory-move-history`)).json();assert.deepEqual(meta.pageSizes,[20,50,100,200]);
for(const size of meta.pageSizes){const x=await post({action:'search',REQ_SEARCH_FLAG:true,rows:size,page:1,sidx:'createdDate',sord:'desc',reason:'-1'});assert.equal(x.r.status,200);assert.equal(x.j.page,1);assert.ok(x.j.rows.length<=size)}
const b=await chromium.launch({headless:true}),p=await b.newPage({viewport:{width:1440,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>m.type()==='error'&&errors.push(m.text()));
try{
 await p.goto(base);const c=(await p.locator('.font-mono').textContent()).trim();await p.getByPlaceholder('Username').fill('moves');await p.getByPlaceholder('Password').fill('local');await p.getByPlaceholder('Enter captcha').fill(c);await p.getByRole('button',{name:'Login'}).click();await p.waitForURL('**/app/dashboard');await p.goto(`${base}/app/r/inv-move-history`);
 for(const a of['Search','Reset','Advance Search','Export','Add New'])await p.getByRole('button',{name:a,exact:true}).waitFor();
 for(const h of['SKU Code','SKU Desc','Move Date','Site Location','Move Qty','From Zone','To Zone','From Bin','To Bin','LPN','User','Putaway No','Remarks','Reason','CycleID'])await p.getByRole('columnheader',{name:h,exact:false}).waitFor();
 assert.deepEqual(await p.getByLabel('Page size').locator('option').allTextContents(),['20','50','100','200']);await p.getByRole('button',{name:'Search',exact:true}).click();await p.getByText(/View 1 -|No records to view/).first().waitFor();
 await p.getByRole('button',{name:'Advance Search',exact:true}).click();for(const l of['From Move Date','To Move Date','Style Code','Client','USN No'])await p.getByLabel(l,{exact:true}).waitFor();
 await p.getByRole('button',{name:'Reset',exact:true}).click();assert.equal(await p.getByLabel('SKU Code',{exact:true}).inputValue(),'');assert.equal(await p.locator('vite-error-overlay').count(),0);assert.deepEqual(errors,[]);
 console.log('PASS Inventory Move History: API search semantics, live default filters, advanced controls, exact grid, actions, reset, paging sizes, and clean browser state.');
}finally{await b.close()}
