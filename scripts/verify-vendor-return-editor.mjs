import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const base=process.env.ERETAIL_BASE_URL||'http://127.0.0.1:3011';
const meta=await(await fetch(base+'/api/vendor-return-editor')).json();
assert.deepEqual(meta.sources,[['-1','--- Select ---'],['3','With GRN'],['1','With PO'],['2','Without PO']]);
assert.deepEqual(meta.locations,[['-1','--- Select ---'],['UWH','JX Karawaci']]);
assert.deepEqual(meta.returnTypes.map(x=>x[1]),['--- Select ---','Normal Return','Dispose','Inbound QC','Damage Return']);
assert.deepEqual(meta.processing.map(x=>x[1]),['--- Select ---','B2B Flow','B2C Flow']);
const b=await chromium.launch({headless:true}),p=await b.newPage({viewport:{width:1700,height:1050}}),errors=[];
p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>m.type()==='error'&&errors.push(m.text()));
try{
 await p.goto(base);const cap=(await p.locator('.font-mono').textContent()).trim();
 await p.getByPlaceholder('Username').fill('rtv');await p.getByPlaceholder('Password').fill('local');await p.getByPlaceholder('Enter captcha').fill(cap);await p.getByRole('button',{name:'Login'}).click();await p.waitForURL('**/app/dashboard');await p.goto(base+'/app/returns/vendor-return');
 assert.deepEqual(await p.getByLabel('RTV Source').locator('option').allTextContents(),meta.sources.map(x=>x[1]));
 assert.equal(await p.getByLabel('Site Location').inputValue(),'UWH');assert.equal(await p.getByLabel('Return Type').inputValue(),'10');assert.equal(await p.getByLabel('Order Processing').inputValue(),'0');
 await p.getByText('User Defined Fields',{exact:true}).click();assert.equal(await p.getByLabel(/^UDF\d+$/).count(),10);
 await p.getByText('Vendor Details',{exact:true}).click();await p.getByLabel('RTV Source').selectOption('2');await p.getByRole('button',{name:'...',exact:true}).click();await p.getByRole('dialog',{name:'Select Vendor'}).getByText(/VEN001/).click();await p.getByRole('button',{name:'Add SKU'}).click();await p.getByRole('dialog',{name:'ADD SKUs'}).getByText(/BACKPACK-GRY/).click();
 await p.getByRole('button',{name:'Save',exact:true}).click();await p.getByText(/RTV .* saved/).waitFor();await p.waitForURL('**id=*');const id=new URL(p.url()).searchParams.get('id');assert.ok(id);
 p.once('dialog',d=>d.accept());await p.getByRole('button',{name:'Confirm',exact:true}).click();await p.getByText('RTV confirmed successfully').waitFor();let rec=await(await fetch(base+'/api/vendor-return-editor?id='+id)).json();assert.equal(rec.status,'Confirmed');assert.equal(rec.rtv_qty,1);
 await p.reload();await p.getByText('Activity and Remarks',{exact:true}).click();await p.getByLabel('Add Comments').fill('Verifier comment');await p.getByRole('button',{name:'Submit Comments'}).click();await p.getByText('Verifier comment').waitFor();rec=await(await fetch(base+'/api/vendor-return-editor?id='+id)).json();assert.equal(rec.comments[0].comment,'Verifier comment');
 await p.getByRole('button',{name:'Toggle Dropdown'}).click();await p.getByRole('button',{name:'RTV Tags',exact:true}).click();await p.getByLabel('RTV Tags').fill('Priority');await p.getByRole('button',{name:'Add Tags'}).click();await p.getByRole('button',{name:'Save Tags'}).click();await p.getByText('RTV Tags saved successfully').waitFor();rec=await(await fetch(base+'/api/vendor-return-editor?id='+id)).json();assert.deepEqual(rec.tags,['Priority']);
 await p.getByRole('button',{name:'Toggle Dropdown'}).click();for(const x of ['Attachments','RTV Tags','E-Way Bill'])assert.ok(await p.getByRole('button',{name:x,exact:true}).count());assert.deepEqual(errors,[]);
 console.log('PASS Vendor Return Create/Edit: exact catalogs/defaults, five tabs, 10 UDFs, nested pickers, persisted Save/Confirm/comments/tags, dropdown workflows, reload, and clean console.');
}finally{await b.close()}
