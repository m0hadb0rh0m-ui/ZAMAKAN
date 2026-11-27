import json, os, pathlib
from playwright.sync_api import sync_playwright
BASE=os.environ.get('ZAMAKAN_URL','http://127.0.0.1:4173')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH'),headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':1440,'height':900})
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(BASE,wait_until='domcontentloaded',timeout=30000)
 page.wait_for_selector('#map canvas',timeout=20000)
 page.wait_for_timeout(2000)
 assert page.locator('#maptitle').inner_text()=='محرك الأرض العالمي'
 page.locator('#flat').click()
 assert 'active' in page.locator('#flat').get_attribute('class')
 page.locator('#globe').click()
 page.locator('#lang').click()
 assert page.locator('html').get_attribute('dir')=='ltr'
 page.locator('[data-tab="space"]').first.click()
 assert 'Space weather' in page.locator('#panel').inner_text()
 page.locator('#time').fill('12')
 assert page.locator('#time').input_value()=='12'
 page.locator('#now').click()
 assert page.locator('#time').input_value()=='0'
 page.locator('[data-tab="earth"]').first.click()
 page.wait_for_timeout(1500)
 page.screenshot(path='/tmp/zamakan-desktop.png')
 page.set_viewport_size({'width':390,'height':844})
 page.wait_for_timeout(800)
 assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
 page.screenshot(path='/tmp/zamakan-mobile.png')
 print(json.dumps({'browser':'Chromium','checks':'globe canvas, projection controls, English RTL/LTR, space tab, timeline, mobile overflow','page_errors':errors,'status':page.locator('#panel').inner_text()[:1000]},ensure_ascii=False))
 assert not errors, errors
 b.close()
