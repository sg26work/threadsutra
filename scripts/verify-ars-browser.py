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


def spa_navigate(path):
    evaluate(f"history.pushState({{}}, '', '{path}'); dispatchEvent(new PopStateEvent('popstate'))")
    time.sleep(1.1)


def capture(name):
    png = call('Page.captureScreenshot', {'format': 'png', 'captureBeyondViewport': False})['data']
    path = f'/tmp/ars-browser-{name}.png'
    with open(path, 'wb') as image_file:
        image_file.write(base64.b64decode(png))
    print(f'SCREENSHOT {path}')


call('Page.enable')
call('Runtime.enable')
call('Emulation.setDeviceMetricsOverride', {'width': 2560, 'height': 1440, 'deviceScaleFactor': 1, 'mobile': False})
call('Page.navigate', {'url': 'http://localhost:5173/'})
time.sleep(1.2)
evaluate("localStorage.setItem('vin_user', JSON.stringify({username:'demo-admin'}))")
call('Page.reload')
time.sleep(1)

checks = {
    '/app/procurement/ars/sku-location': ['ARS SKU-Location Link', 'Bulk Import', 'Bulk Update', 'Fulfilment Method', 'Stock Cover'],
    '/app/procurement/ars/rules': ['ARS Rules', 'Product Set', 'Rule ID', 'Last Run Date', 'Add New'],
    '/app/procurement/ars/logs': ['ARS Execution Log', 'Generated Orders', 'Evaluated SKUs', 'Refresh'],
    '/app/procurement/ars/settings': ['B2B Configuration', 'Enable ARS', 'ROS Calculation Hour', 'Calculate ROS'],
}

for path, expected in checks.items():
    spa_navigate(path)
    body = evaluate('document.body.innerText') or ''
    missing = [value for value in expected if value not in body]
    if missing:
        raise AssertionError(f'{path}: missing {missing}, body={body[:600]!r}')
    print(f'PASS {path}: {", ".join(expected)}')

spa_navigate('/app/procurement/ars/sku-location')
evaluate("[...document.querySelectorAll('button')].find(b => b.innerText.includes('Add New')).click()")
time.sleep(.3)
assert evaluate("document.body.innerText.includes('Create/Update ARS Sku-Location') && document.body.innerText.includes('WH Lead Time(In Days)')"), 'SKU-location editor did not open'
print('PASS SKU-location Add New editor')
capture('sku-location-editor')
evaluate("[...document.querySelectorAll('button')].find(b => b.innerText.trim() === 'Close').click()")
time.sleep(.2)
evaluate("[...document.querySelectorAll('button')].find(b => b.innerText.includes('Bulk Update')).click()")
time.sleep(.3)
assert evaluate("document.body.innerText.includes('Bulk Update ARS SKU-Location') && document.body.innerText.includes('SKU Group')"), 'Bulk Update modal did not open'
print('PASS SKU-location Bulk Update modal')

spa_navigate('/app/procurement/ars/rules')
evaluate("[...document.querySelectorAll('button')].find(b => b.innerText.includes('Add New')).click()")
time.sleep(.3)
assert evaluate("document.body.innerText.includes('ARS Create/Edit') && document.body.innerText.includes('Vendor Type') && document.body.innerText.includes('Add SKU Set')"), 'ARS Rule editor did not open'
evaluate("[...document.querySelectorAll('select')].find(s => [...s.options].some(o => o.text === 'Min-Max')).value='Min-Max'; [...document.querySelectorAll('select')].find(s => [...s.options].some(o => o.text === 'Min-Max')).dispatchEvent(new Event('change',{bubbles:true}))")
time.sleep(.2)
assert evaluate("[...document.querySelectorAll('input')].some(i => i.type === 'number' && !i.disabled)"), 'Min-Max fields did not activate'
evaluate("[...document.querySelectorAll('button')].find(b => b.innerText.includes('Add SKU Set')).click()")
time.sleep(.2)
assert evaluate("document.querySelectorAll('tbody tr').length > 0 && document.body.innerText.includes('Operand')"), 'SKU Set row was not added'
print('PASS ARS Rule editor conditional fields and SKU Set row')
capture('rule-editor')

spa_navigate('/app/procurement/ars/settings')
capture('settings')
ws.close()
