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


def navigate(path):
    call('Page.navigate', {'url': 'http://localhost:5173' + path})
    time.sleep(1.2)


def evaluate(expression):
    result = call('Runtime.evaluate', {'expression': expression, 'returnByValue': True})
    return result.get('result', {}).get('value')


def spa_navigate(path):
    evaluate(f"history.pushState({{}}, '', '{path}'); dispatchEvent(new PopStateEvent('popstate'))")
    time.sleep(1.2)


def capture(name):
    png = call('Page.captureScreenshot', {'format': 'png', 'captureBeyondViewport': False})['data']
    path = f'/tmp/procurement-browser-{name}.png'
    with open(path, 'wb') as image_file:
        image_file.write(base64.b64decode(png))
    print(f'SCREENSHOT {path}')


call('Page.enable')
call('Runtime.enable')
call('Emulation.setDeviceMetricsOverride', {'width': 2560, 'height': 1440, 'deviceScaleFactor': 1, 'mobile': False})
navigate('/')
evaluate("localStorage.setItem('vin_user', JSON.stringify({username:'demo-admin'}))")
call('Page.reload')
time.sleep(1)

checks = {
    '/app/procurement/category-buyers': ['Category Buyers', 'Buyer Code', 'Buyer Name', 'Add New'],
    '/app/procurement/po-enquiry': ['PO Enquiry', 'PO Code', 'PO Date', 'Status'],
    '/app/procurement/po/multiple': ['Multiple Location', 'Manage Allocation', 'Add SKU', 'PO Method'],
    '/app/procurement/vendor-invoices': ['Vendor Invoice Enquiry', 'Invoice Number', 'Vendor Code', 'Add New'],
    '/app/procurement/otb': ['OTB Enquiry', 'OpenToBuy', 'Total Budget', 'Add New'],
    '/app/procurement/po/back-orders': ['From Back Orders', 'Order Date', 'Create PO'],
    '/app/grn': ['ASN', 'Pending Confirmation'],
}

for path, expected in checks.items():
    spa_navigate(path)
    text = evaluate('document.body.innerText') or ''
    missing = [value for value in expected if value not in text]
    if missing:
        current = evaluate('location.href')
        raise AssertionError(f'{path}: at {current}, missing {missing}, body={text[:500]!r}')
    print(f'PASS {path}: {", ".join(expected)}')

spa_navigate('/app/procurement/category-buyers')
evaluate("[...document.querySelectorAll('button')].find(b => b.innerText.includes('Add New')).click()")
time.sleep(.3)
buyer_modal = evaluate("document.body.innerText.includes('Category Buyer Create/Edit') && document.body.innerText.includes('User Defined Fields')")
assert buyer_modal, 'Category Buyer modal/tabs did not open'
print('PASS Category Buyer Add New modal and UDF tab')
capture('category-buyer')

spa_navigate('/app/procurement/po/multiple')
evaluate("[...document.querySelectorAll('button')].find(b => b.innerText.includes('Manage Allocation')).click()")
time.sleep(.3)
allocation_modal = evaluate("document.body.innerText.includes('Loc Code') && document.body.innerText.includes('Loc Name') && document.body.innerText.includes('Next')")
assert allocation_modal, 'Manage Allocation modal did not open'
print('PASS Multi Location Manage Allocation modal')
capture('allocation')

spa_navigate('/app/procurement/otb')
evaluate("[...document.querySelectorAll('button')].find(b => b.innerText.includes('Add New')).click()")
time.sleep(.3)
otb_editor = evaluate("document.body.innerText.includes('OTB Detail') && document.body.innerText.includes('Operand Type')")
assert otb_editor, 'OTB editor did not open'
print('PASS OTB Add New editor')

capture('otb')
ws.close()
