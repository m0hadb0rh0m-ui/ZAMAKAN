"""Tests only capability UI with deliberately nonworking fixture credentials.
Real map tiles are still streamed from the public provider; no paid calls."""
import os
from playwright.sync_api import sync_playwright
BASE=os.environ.get('ZAMAKAN_URL','http://127.0.0.1:4175')
with sync_playwright() as p:
 args=['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']
 if os.environ.get('ZAMAKAN_PROXY'):args+=['--proxy-server='+os.environ['ZAMAKAN_PROXY'],'--proxy-bypass-list=localhost;127.0.0.1']
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH'),headless=True,args=args)
 page=b.new_page(viewport={'width':390,'height':844},ignore_https_errors=True)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(BASE,wait_until='domcontentloaded')
 page.locator('#layersToggle').click()
 page.wait_for_selector('[data-mode=satellite]',timeout=15000)
 assert page.locator('#openRealistic').is_visible()
 assert page.locator('#terrainRow').is_visible()
 assert 'مفتاح' not in page.locator('#layersPanel').inner_text()
 page.locator('#layersClose').click();page.locator('#settings').click()
 assert not page.locator('input[type=password]').count()
 assert 'test-public-key' not in page.locator('body').inner_text()
 assert 'eytest.payload.signature' not in page.locator('body').inner_text()
 # Simulate owner revocation response on refresh, without any paid requests.
 page.route('**/api/client-config',lambda route:route.fulfill(json={'version':1,'mapTilerPublicKey':'','cesiumPublicToken':'','weatherEnabled':False}))
 page.locator('#refresh').click();page.locator('#settingsClose').click();page.locator('#layersToggle').click()
 page.locator('[data-mode=satellite]').wait_for(state='detached',timeout=15000)
 assert not page.locator('#openRealistic').is_visible()
 assert not page.locator('#terrainRow').is_visible()
 assert not errors,errors
 print('Owner config: automatic feature enable/revoke, no key inputs or visible credentials, no uncaught JS errors.')
 b.close()
