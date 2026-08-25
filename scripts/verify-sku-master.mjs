import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const base=process.env.ERETAIL_BASE_URL||'http://127.0.0.1:3011';
const payload={_search:true,page:1,sidx:'sku',sord:'desc',sku:'',style:'',skuName:'',tempSkuCode:'',classification:'-1',size:'',color:'',vendorCode:'',brandCode:'',hierarchyCode:'',attributeSet:'-1',sizeGroup:'',status:'-1',createdBy:'-1',createdDate:'',updatedBy:'-1',updatedDate:'',backOrder:'-1',magentoStatus:'-1',REQ_SEARCH_FLAG:true};
for(const rows of [50,100,200]){const response=await fetch(`${base}/api/skus`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...payload,rows})});assert.equal(response.status,200);const result=await response.json();assert.ok(result.rows.length<=rows);assert.equal(result.page,1)}
const browser=await chromium.launch({headless:true}),page=await browser.newPage(),errors=[];
page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text())});
try{
 await page.goto(base);const captcha=(await page.locator('.font-mono').textContent()).trim();await page.getByPlaceholder('Username').fill('sku-master');await page.getByPlaceholder('Password').fill('local-only');await page.getByPlaceholder('Enter captcha').fill(captcha);await page.getByRole('button',{name:'Login'}).click();await page.waitForURL('**/app/dashboard');await page.goto(`${base}/app/skus`);
 for(const action of ['Search','Reset','Advance Search','Import','Export','MetaData Export','Add New'])await page.getByRole('button',{name:action,exact:true}).waitFor();
 await Promise.all([page.waitForResponse(r=>r.url().endsWith('/api/skus')&&r.request().method()==='POST'),page.getByRole('button',{name:'Search',exact:true}).click()]);
 for(const size of ['50','100','200'])await Promise.all([page.waitForResponse(r=>r.url().endsWith('/api/skus')&&r.request().method()==='POST'),page.getByLabel('Records per Page').selectOption(size)]);
 await page.getByRole('button',{name:'Reset'}).click();await page.getByText('No records to view',{exact:true}).waitFor();await page.getByRole('button',{name:'Advance Search'}).click();await page.locator('label').filter({hasText:/^Style$/}).waitFor();await page.getByRole('button',{name:'Add New'}).click();await page.locator('.fixed.inset-0.z-50').getByText('SKU Code',{exact:true}).waitFor();
 assert.deepEqual(errors,[]);console.log('PASS SKU Master: live server enquiry contract, controls, page sizes, reset, advanced search, editor, and clean browser state.');
}finally{await browser.close()}
