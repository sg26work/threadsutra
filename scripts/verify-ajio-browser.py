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
        result = json.loads(ws.recv())
        if result.get('id') == request_id:
            if 'error' in result:
                raise RuntimeError(result['error'])
            return result.get('result', {})


def evaluate(expression):
    result = call('Runtime.evaluate', {'expression': expression, 'returnByValue': True})
    return result.get('result', {}).get('value')


def click(text):
    found = evaluate(f"(() => {{ const b = [...document.querySelectorAll('button')].find(x => x.innerText.includes({json.dumps(text)})); if (!b) return false; b.click(); return true; }})()")
    assert found, f'button not found: {text}'
    time.sleep(.35)


def check(expected):
    body = evaluate('document.body.innerText') or ''
    missing = [text for text in expected if text not in body]
    assert not missing, f'missing {missing}; body={body[:800]!r}'


def capture(name):
    png = call('Page.captureScreenshot', {'format': 'png', 'captureBeyondViewport': False})['data']
    path = f'/tmp/ajio-browser-{name}.png'
    with open(path, 'wb') as output:
        output.write(base64.b64decode(png))
    print(f'SCREENSHOT {path}')


call('Page.enable')
call('Runtime.enable')
call('Emulation.setDeviceMetricsOverride', {'width': 2560, 'height': 1440, 'deviceScaleFactor': 1, 'mobile': False})
call('Page.navigate', {'url': 'http://localhost:5173/'})
time.sleep(1.2)
evaluate("localStorage.setItem('vin_user', JSON.stringify({username:'demo-admin'}))")
call('Page.reload')
time.sleep(1)
evaluate("history.pushState({}, '', '/app/fulfillment/ajio'); dispatchEvent(new PopStateEvent('popstate'))")
time.sleep(1.4)

check(['AJIO Process Workflow', 'Channel Maintenance', 'AJIO JIT', 'Channel Name', 'Order Sync', 'B2B Invoice Series', 'Shipping Label', 'Configuring Interface'])
assert evaluate("[...document.querySelectorAll('input, select')].some(i => i.value === 'ShippingLabel_AJIO')"), 'AJIO shipping label report value missing'
print('PASS AJIO JIT channel maintenance and configuration surface')
capture('configuration')

click('2. Product & Inventory')
check(['Product Creation, SKU Pull and Inventory Sync', 'AJIO Article', 'SKU Mapping', 'Published Inventory', 'Synchronize Inventory'])
print('PASS AJIO product mapping and inventory sync surface')

click('3. Backorder Pull')
check(['Back Order Inventory Pull', 'Fetch Backorder Inventory', 'Reservation', 'Customer orders generate AJIO order pendency'])
print('PASS AJIO backorder reservation surface')

click('4. PO & Order Creation')
check(['AJIO PO Release and Order Creation', 'RESERVED PO PENDENCIES', 'AJIO SALES ORDERS', 'Generate Picklist'])
print('PASS AJIO PO-to-sales-order surface')

click('5a. Manage Picking')
check(['Manage Picking', 'Scan Picklist / Delivery', 'To LPN / Box ID', 'Scan SKU', 'Pick All', 'Delivery Split', 'Pending SKUs', 'Boxes'])
print('PASS AJIO LPN picking and delivery-split surface')
capture('manage-picking')

click('5b. Order Packing')
check(['Order Packing', 'Master AWB', 'Child AWBs', 'Order Pack', 'Shipping Label'])
print('PASS AJIO order packing and AWB surface')
capture('order-packing')

click('6. Order Shipment')
check(['Order Shipment', 'Request Manifest', 'Download Marketplace Manifest', 'MANIFEST DOCUMENTS', '3PL will not pick a partial shipment'])
print('PASS AJIO shipment and manifest surface')
capture('order-shipment')
ws.close()
