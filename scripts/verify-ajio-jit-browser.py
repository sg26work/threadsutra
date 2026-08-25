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


def click(text):
    found = evaluate(f"(() => {{ const b = [...document.querySelectorAll('button')].find(x => x.innerText.includes({json.dumps(text)})); if (!b) return false; b.click(); return true; }})()")
    assert found, f'button not found: {text}'
    time.sleep(.4)


def check(expected):
    body = evaluate('document.body.innerText') or ''
    missing = [value for value in expected if value not in body]
    assert not missing, f'missing {missing}; body={body[:1000]!r}'


def spa(path):
    evaluate(f"history.pushState({{}}, '', '{path}'); dispatchEvent(new PopStateEvent('popstate'))")
    time.sleep(1.2)


def capture(name):
    png = call('Page.captureScreenshot', {'format': 'png', 'captureBeyondViewport': False})['data']
    path = f'/tmp/ajio-jit-browser-{name}.png'
    with open(path, 'wb') as output:
        output.write(base64.b64decode(png))
    print(f'SCREENSHOT {path}')


call('Page.enable')
call('Runtime.enable')
call('Emulation.setDeviceMetricsOverride', {'width': 2560, 'height': 1440, 'deviceScaleFactor': 1, 'mobile': False})
call('Page.navigate', {'url': 'http://localhost:5173/'})
time.sleep(1.1)
evaluate("localStorage.setItem('vin_user', JSON.stringify({username:'demo-admin'}))")
call('Page.reload')
time.sleep(1)

spa('/app/channels')
check(['Manage Channels', 'Channel Enquiry', 'Add New', 'Ajio Seller', 'ABR'])
print('PASS Sales > Manage Channels AJIO entry point')
click('Add New')
check(['Select Marketplace to Integrate', 'AJIO B2C', 'AJIO Business', 'AJIO Business UAT', 'AJIO JIT', 'AJIO JIT UAT'])
print('PASS Add New exposes documented AJIO marketplace choices')
click('AJIO JIT')
check(['Channel Maintenance', 'AJIO JIT', 'Channel Detail', 'Orders', 'Channel SKU', 'Inventory', 'Configuring Interface'])
assert '/app/fulfillment/ajio' in evaluate('location.pathname'), 'AJIO JIT marketplace choice did not open Channel Maintenance'
print('PASS AJIO JIT choice opens Channel Maintenance')

spa('/app/channels')
click('ABR')
check(['Channel Maintenance', 'AJIO JIT', 'Channel Detail', 'Orders', 'Channel SKU', 'Inventory', 'Configuring Interface'])
assert '/app/fulfillment/ajio' in evaluate('location.pathname'), 'AJIO row did not open dedicated maintenance route'
print('PASS AJIO row opens Channel Maintenance')
capture('channel-maintenance')

check(['Channel Code', 'Channel Name', 'Order Fulfillment WH', 'Channel SLA(in hrs)', 'Order Sync', 'Order Sync From Date', 'Return Order Sync', 'PrePack Enabled', 'Mark ReadyToShip At', 'Use Marketplace Shipping Label', 'Inventory Sync', 'Enable Inventory Recon'])
print('PASS Channel Detail, Orders, Channel SKU and Inventory fields')
click('Configuring Interface')
check(['Channel Configure', 'Seller Credentials', 'UserName', 'Password', 'Is B2B', 'Enable E-Invoicing', 'E Invoicing UserName', 'E Invoicing Password', 'OK', 'Close'])
print('PASS Channel Configure conditional credential modal')
capture('configure-interface')
click('Close')

click('2. Product & Inventory')
check(['Product Creation, SKU Pull and Inventory Sync', 'ChannelSKUCode', 'ChannelProductId', 'Pull with Moderate creation', 'Synchronize Inventory', 'Reconcile Inv'])
print('PASS exact AJIO JIT channel mapping columns and inventory controls')
capture('channel-mappings')

click('5a. Manage Picking')
check(['Manage Picking', 'Prefetch Label', 'Prefetch Shipment Label', 'Delivery Split', 'Pending SKUs'])
print('PASS PrePack label-prefetch control integrated with Manage Picking')
ws.close()
