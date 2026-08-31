import { chromium } from 'playwright';
const b=await chromium.connectOverCDP('http://127.0.0.1:9222');
try {
 const p=b.contexts().flatMap(c=>c.pages()).find(x=>x.url().includes('selCompanyLocationBS.action'));
 if(!p) throw Error('LIVE shell unavailable');
 await p.evaluate(()=>window.openScreen('Vendor Master','showVendorEnquiryBS','fa fa-arrow-circle-right'));
 await p.waitForTimeout(900);
 const q=p.frames().filter(f=>f.url().includes('showVendorEnquiryBS')).at(-1);
 if(!q) throw Error('Vendor enquiry unavailable');
 await q.locator('button').filter({hasText:'Add New'}).click();
 await p.waitForTimeout(1000);
 const f=p.frames().filter(x=>x.url().includes('showVendorMaintenanceBS')).at(-1);
 if(!f) throw Error('Vendor editor unavailable');
 const snap=async()=>f.locator('body').evaluate(root=>{const v=e=>{const r=e.getBoundingClientRect();return r.width&&r.height&&getComputedStyle(e).display!=='none'}; const a=[...root.querySelectorAll('input:not([type=hidden]),select,textarea,button')].filter(v).map(e=>{const r=e.getBoundingClientRect();return{tag:e.tagName,id:e.id,name:e.getAttribute('name'),type:e.type,text:(e.innerText||e.textContent||'').replace(/\s+/g,' ').trim(),value:e.value,max:e.maxLength,disabled:e.disabled,readonly:e.readOnly,r:[r.x,r.y,r.width,r.height],opts:e.tagName==='SELECT'?[...e.options].map(o=>[o.value,o.text.trim()]):undefined}});return{text:root.innerText.replace(/\s+/g,' ').trim().slice(0,7000),controls:a,labels:[...root.querySelectorAll('label')].filter(v).map(e=>e.innerText.trim())}});
 const tabs={}; for(const n of ['Vendor Master','Address','User Defined Fields','Attached Document','Terms and Conditions','Seller Details','Other Details']){const x=f.getByText(n,{exact:true}).first();if(await x.count()){await x.click();await f.waitForTimeout(150);tabs[n]=await snap();}}
 console.log(JSON.stringify({url:f.url(),tabs},null,2));
} finally {await b.close()}
