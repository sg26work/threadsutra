import { chromium } from 'playwright';
const browser=await chromium.connectOverCDP('http://127.0.0.1:9222');
try{
 const page=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url().includes('selCompanyLocationBS.action'));
 await page.evaluate(()=>window.openScreen('CustomerGroup Create/Edit','customerGroupDisplay'));
 await page.waitForTimeout(700);
 const candidates=await Promise.all(page.frames().filter(f=>/customerGroupDisplay/i.test(f.url())).map(async frame=>({frame,visible:await frame.frameElement().then(e=>e.isVisible()).catch(()=>false)})));
 const frame=candidates.filter(x=>x.visible).at(-1)?.frame;if(!frame)throw Error('Customer Group editor unavailable');
 const out=await frame.locator('body').evaluate(root=>{const vis=e=>{const b=e.getBoundingClientRect();return b.width>0&&b.height>0};const controls=[...root.querySelectorAll('input:not([type=hidden]),select,textarea,button,a')].filter(vis).map(e=>({tag:e.tagName,id:e.id,name:e.getAttribute('name'),type:e.getAttribute('type'),text:e.tagName==='SELECT'?'':(e.innerText||'').trim(),value:e.value,maxlength:e.getAttribute('maxlength'),title:e.getAttribute('title'),onclick:e.getAttribute('onclick'),disabled:!!e.disabled,readonly:!!e.readOnly,options:e.tagName==='SELECT'?[...e.options].map(o=>({text:o.text,value:o.value})):undefined}));const names=['saveCustGroupData','addNew','openCustPL','validation'];return{text:[...root.querySelectorAll('label,legend,h1,h2,h3,h4,h5,.panel-title')].filter(vis).map(e=>(e.textContent||'').replace(/\s+/g,' ').trim()).filter(Boolean),controls,headers:[...root.querySelectorAll('.ui-jqgrid-htable th')].filter(vis).map(e=>(e.textContent||'').replace(/\s+/g,' ').trim()),functions:Object.fromEntries(names.map(n=>[n,typeof window[n]==='function'?String(window[n]):null]))}});
 console.log(JSON.stringify({url:frame.url(),...out},null,2));
}finally{await browser.close()}
