#!/usr/bin/env python3
import base64
import json
import time
import urllib.request
import websocket

targets = json.load(urllib.request.urlopen('http://127.0.0.1:9222/json/list'))
target = next(item for item in targets if item['type'] == 'page')
ws = websocket.create_connection(target['webSocketDebuggerUrl'], timeout=10)
counter = 0


def call(method, params=None):
    global counter
    counter += 1
    request_id = counter
    ws.send(json.dumps({'id': request_id, 'method': method, 'params': params or {}}))
    while True:
        response = json.loads(ws.recv())
        if response.get('id') == request_id:
            if 'error' in response:
                raise RuntimeError(response['error'])
            return response.get('result', {})


def evaluate(expression):
    result = call('Runtime.evaluate', {'expression': expression, 'returnByValue': True})
    return result.get('result', {}).get('value')


def click(text, exact=False):
    comparator = "x.innerText.trim().split('\\n').at(-1).trim() === target" if exact else 'x.innerText.includes(target)'
    found = evaluate(f"(() => {{ const target={json.dumps(text)}; const b=[...document.querySelectorAll('button')].find(x => {comparator}); if(!b)return false; b.click(); return true; }})()")
    assert found, f'button not found: {text}'
    time.sleep(.65)


def click_in_row(row_text, button_text):
    found = evaluate(f"(() => {{ const row=[...document.querySelectorAll('tr')].find(x => x.innerText.includes({json.dumps(row_text)})); if(!row)return false; const b=[...row.querySelectorAll('button')].find(x => x.innerText.includes({json.dumps(button_text)})); if(!b)return false; b.click(); return true; }})()")
    assert found, f'button {button_text!r} not found in row {row_text!r}'
    time.sleep(.75)


def set_row_inputs(row_text, values):
    result = evaluate(f"(() => {{ const row=[...document.querySelectorAll('tr')].find(x => x.innerText.includes({json.dumps(row_text)})); if(!row)return 0; const inputs=[...row.querySelectorAll('input[type=number]')]; const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; const values={json.dumps(values)}; inputs.forEach((input,index)=>{{setter.call(input,String(values[index])); input.dispatchEvent(new Event('input',{{bubbles:true}})); input.dispatchEvent(new Event('change',{{bubbles:true}}));}}); return inputs.length; }})()")
    assert result == len(values), f'expected {len(values)} dimension inputs, found {result}'
    time.sleep(.3)


def set_row_select(row_text, value):
    result = evaluate(f"(() => {{ const row=[...document.querySelectorAll('tr')].find(x => x.innerText.includes({json.dumps(row_text)})); if(!row)return false; const select=row.querySelector('select'); if(!select)return false; const setter=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set; setter.call(select,{json.dumps(value)}); select.dispatchEvent(new Event('change',{{bubbles:true}})); return select.value; }})()")
    assert result == value, f'could not select {value} in row {row_text}'
    time.sleep(.3)


def check_row(row_text):
    found = evaluate(f"(() => {{ const row=[...document.querySelectorAll('tr')].find(x => x.innerText.includes({json.dumps(row_text)})); if(!row)return false; const box=row.querySelector('input[type=checkbox]'); if(!box)return false; box.click(); return true; }})()")
    assert found, f'checkbox not found in row {row_text}'
    time.sleep(.25)


def fill_row_text(row_text, index, value):
    found = evaluate(f"(() => {{ const row=[...document.querySelectorAll('tr')].find(x => x.innerText.includes({json.dumps(row_text)})); if(!row)return false; const input=[...row.querySelectorAll('input[type=text], input:not([type])')][{index}]; if(!input)return false; const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; setter.call(input,{json.dumps(value)}); input.dispatchEvent(new Event('input',{{bubbles:true}})); input.dispatchEvent(new Event('change',{{bubbles:true}})); return true; }})()")
    assert found, f'text input {index} not found in row {row_text}'
    time.sleep(.25)


def check(expected):
    body = evaluate('document.body.innerText') or ''
    missing = [value for value in expected if value not in body]
    assert not missing, f'missing {missing}; body={body[:1200]!r}'


def spa(path):
    evaluate(f"history.pushState({{}}, '', '{path}'); dispatchEvent(new PopStateEvent('popstate'))")
    time.sleep(1.25)


def capture(name):
    png = call('Page.captureScreenshot', {'format': 'png', 'captureBeyondViewport': False})['data']
    path = f'/tmp/amazon-mfn-browser-{name}.png'
    with open(path, 'wb') as output:
        output.write(base64.b64decode(png))
    print(f'SCREENSHOT {path}')


call('Page.enable')
call('Runtime.enable')
call('Emulation.setDeviceMetricsOverride', {'width': 2560, 'height': 1440, 'deviceScaleFactor': 1, 'mobile': False})
call('Page.navigate', {'url': 'http://127.0.0.1:5173/'})
time.sleep(1.1)
evaluate("localStorage.setItem('vin_user', JSON.stringify({username:'demo-admin'}))")
call('Page.reload')
time.sleep(1)

spa('/app/channels')
check(['Manage Channels', 'Channel Enquiry', 'AMF', 'Amazon India MFN', 'Add New'])
print('PASS Sales > Manage Channels Amazon MFN entry')
click('Add New', exact=True)
check(['Select Marketplace to Integrate', 'Amazon FBA India', 'Amazon Australia', 'Amazon Canada', 'Amazon UAE', 'Amazon US', 'Amazon Flex India', 'Amazon India'])
print('PASS documented Amazon marketplace selector inventory')
click('Amazon India', exact=True)
check(['Amazon MFN Integration', 'Channel Maintenance', 'Amazon India', 'Channel Detail', 'Orders', 'Channel SKU', 'Inventory', 'Configuring Interface'])
assert '/app/fulfillment/amazon-mfn' in evaluate('location.pathname'), 'Amazon India tile did not open Amazon MFN Channel Maintenance'
print('PASS Amazon India tile opens dedicated Channel Maintenance')
capture('channel-maintenance')

check(['Channel Name', 'Order Fulfillment WH', 'Channel SLA(in hrs)', 'Order Sync From Date', 'Return Sync From Date', 'PrePack Enabled', 'Mark ReadyToShip At', 'Use Marketplace Shipping Label', 'Sync Method', 'Enable Inventory Recon'])
print('PASS Amazon Channel Maintenance fields and grouped controls')
click('Configuring Interface')
check(['Channel Configure', 'Seller Credentials', 'Amazon India', 'Amazon UAE', 'Amazon US, Canada, Europe, UK, Australia, Mexico', 'Seller Id', 'Access Key', 'Marketplace Id', 'Secret Key', 'Panel User Id', 'Panel Password', 'No Slot on Sunday(1/0)', 'Need Invoice', 'Enable Easy Ship', 'MWS Token', 'DeveloperId', 'Developer Name'])
print('PASS region-specific Amazon India credential surface')
click('Amazon UAE', exact=True)
check(['Amazon UAE', 'Seller Id', 'Access Key', 'Secret Key', 'Marketplace Id', 'MWS Token', 'DeveloperId'])
assert 'Panel User Id' not in (evaluate('document.body.innerText') or ''), 'Amazon UAE incorrectly retained India panel fields'
click('Amazon India', exact=True)
capture('configure-interface')
click('Close', exact=True)

click('2. Channel Mappings')
check(['Channel Mappings and Inventory Sync', 'Merchant SKU', 'ASIN', 'ChannelSKUCode', 'ChannelProductId', 'Vin SKU', 'Inventory Feed', 'Published Inventory', 'Synchronize Inventory', 'Reconcile Inv'])
set_row_select('AMZ-BACKPACK-GRY', 'BACKPACK-GRY')
click_in_row('AMZ-BACKPACK-GRY', 'Map SKU')
check(['BACKPACK-GRY', 'Mapped'])
check_row('AMZ-TSHIRT-BLK-M')
click('Synchronize Inventory')
print('PASS Merchant SKU/ASIN mapping and asynchronous Inventory Feed submission')
capture('channel-mappings')

click('6. MP Inventory Log')
check(['MP Inventory Log', 'Submitted', 'Feed submitted to Amazon.', 'Process Feed'])
click_in_row('AMZ-TSHIRT-BLK-M', 'Process Feed')
check(['Success', 'Inventory updated on Amazon Website.'])
print('PASS MP Inventory Log Submitted to Success transition')

click('3. Orders')
check(['Amazon Order Pull and Create', 'Pending', 'Un-Shipped', 'Not Pulled', 'Order Pull'])
click('Order Pull')
check(['Pending', 'Allocated', 'Unavailable while Pending', 'Reserved', 'Confirm on Amazon'])
click_in_row('408-7111111-1000001', 'Confirm on Amazon')
check_row_text = evaluate("[...document.querySelectorAll('tr')].find(x=>x.innerText.includes('408-7111111-1000001'))?.innerText") or ''
assert 'Allocated' in check_row_text and 'Amazon Buyer' in check_row_text, 'Pending order did not become Allocated with customer information'
print('PASS Pending reservation and Un-Shipped/Allocated order transition')

click('4. Order Pack')
check(['Order Pack — Invoice and Shipping Label', 'Weight (kg)', 'Length (cm)', 'Width (cm)', 'Height (cm)', 'Feed Submission Results not ready.', 'Weight of dimension cannot be zero.', '30 calls per hour'])
set_row_inputs('408-7111111-1000001', [1.2, 30, 20, 10])
click_in_row('408-7111111-1000001', 'Prefetch')
check(['Processing', 'Prefetch Scheduled', 'Process Scheduled Pack'])
click_in_row('408-7111111-1000001', 'Process Scheduled Pack')
check(['Prefetched', 'Invoice / Ship Label'])
click_in_row('408-7111111-1000001', 'Order Pack')
check(['Packed', 'Waiting for Pick-Up'])
print('PASS PrePack, scheduled feed processing, invoice/label and Waiting for Pick-Up')
capture('order-pack')

click('5. Shipment & Returns')
check(['Order Shipment and Return Pull', '408-7111111-1000001', 'Transporter Name', 'Tracking No.', 'Return Order Sync', 'Pending Pull'])
fill_row_text('408-7111111-1000001', 0, 'Amazon Transportation Services')
click_in_row('408-7111111-1000001', 'Ship')
check(['Shipped'])
transporter_value = evaluate("[...document.querySelectorAll('tr')].find(x=>x.innerText.includes('408-7111111-1000001'))?.querySelector('input')?.value")
assert transporter_value == 'Amazon Transportation Services', 'shipment transporter was not retained after Amazon status update'
click('Return Order Sync')
check(['Confirmed', 'Pending Inbound'])
print('PASS Shipment transporter/tracking/status push and Confirmed Return Pull')
capture('shipment-returns')
ws.close()
