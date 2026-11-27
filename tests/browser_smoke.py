"""Live map browser smoke test. Network providers are required; no fake geographic fixtures."""
import json, os, pathlib, re, time
from playwright.sync_api import sync_playwright
BASE=os.environ.get('ZAMAKAN_URL','http://127.0.0.1:4173')
OUT=pathlib.Path(os.environ.get('ZAMAKAN_SCREENSHOTS','/tmp/zamakan-screenshots'))
OUT.mkdir(parents=True,exist_ok=True)
def wait_until(predicate, timeout=30):
 deadline=time.monotonic()+timeout
 while time.monotonic()<deadline:
  if predicate(): return
  time.sleep(.25)
 raise AssertionError('Condition did not become true')
with sync_playwright() as p:
 args=['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage']
 if os.environ.get('ZAMAKAN_PROXY'):
  args+=['--proxy-server='+os.environ['ZAMAKAN_PROXY'],'--proxy-bypass-list=localhost;127.0.0.1']
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH'),headless=True,args=args)
 context=b.new_context(viewport={'width':1440,'height':900},geolocation={'latitude':31.346,'longitude':34.303,'accuracy':18},permissions=['geolocation'],ignore_https_errors=bool(os.environ.get('ZAMAKAN_PROXY')))
 page=context.new_page()
 errors=[]; tiles=[]; console_errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('console', lambda m:console_errors.append(m.text) if m.type=='error' else None)
 page.on('response',lambda r:tiles.append(r.url) if 'tiles.openfreemap.org' in r.url and r.ok else None)
 page.goto(BASE,wait_until='domcontentloaded',timeout=30000)
 page.wait_for_selector('#map canvas',timeout=20000)
 page.wait_for_selector('.maplibregl-ctrl-attrib a',timeout=35000)
 wait_until(lambda: not page.locator('#maperror').is_visible())
 page.wait_for_timeout(3500)
 assert any(re.search(r'/(?:\d+/){2}\d+\.(?:pbf|mvt)',u) for u in tiles),tiles[:10]
 page.screenshot(path=OUT/'desktop.png')
 page.locator('#gps').click()
 wait_until(lambda: float(page.locator('#zoomLevel').inner_text()[2:]) >= 17,15)
 page.wait_for_timeout(2500)
 page.screenshot(path=OUT/'street-detail.png')
 page.locator('#reverse').click()
 wait_until(lambda: page.locator('#coord strong').count()>0 or 'تعذر' in page.locator('#mapNotice').inner_text(),25)
 assert page.locator('#coord strong').count()>0,'Reverse geocoding failed'
 page.locator('#buildings').click()
 assert 'active' in page.locator('#buildings').get_attribute('class')
 page.wait_for_timeout(2500)
 page.screenshot(path=OUT/'3d-buildings.png')
 page.locator('#flat').click()
 page.locator('#globe').click()
 wait_until(lambda: float(page.locator('#zoomLevel').inner_text()[2:]) < 4,15)
 page.locator('#flat').click()
 page.locator('#searchinput').fill('Khan Yunis')
 page.wait_for_selector('[data-place]',timeout=25000)
 assert 'Photon' in page.locator('#searchresults').inner_text() or 'MapTiler' in page.locator('#searchresults').inner_text()
 page.screenshot(path=OUT/'search.png')
 page.locator('[data-place]').first.click()
 wait_until(lambda: float(page.locator('#zoomLevel').inner_text()[2:]) >= 10,15)
 selected=page.locator('#coord strong').inner_text()
 page.locator('#layersToggle').click()
 page.locator('[data-mode=dark]').click()
 wait_until(lambda: 'active' in page.locator('[data-mode=dark]').get_attribute('class') and not page.locator('#maperror').is_visible(),35)
 assert page.locator('#coord strong').inner_text()==selected
 page.wait_for_timeout(1600)
 page.screenshot(path=OUT/'dark-map.png')
 page.locator('[data-mode=streets]').click()
 wait_until(lambda: 'active' in page.locator('[data-mode=streets]').get_attribute('class') and not page.locator('#maperror').is_visible(),35)
 page.screenshot(path=OUT/'layers.png')
 page.locator('#weatherGrid').click()
 wait_until(lambda: 'وقت النموذج' in page.locator('#weatherLayerStatus').inner_text() or 'تعذر' in page.locator('#weatherLayerStatus').inner_text(),30)
 print('Weather grid:',page.locator('#weatherLayerStatus').inner_text(),flush=True)
 assert 'سطح إقليمي' in page.locator('#weatherLayerStatus').inner_text(),'Continuous surface failed'
 assert page.locator('#weatherScale').is_visible()
 page.locator('#layersClose').click()
 page.wait_for_timeout(1800)
 page.screenshot(path=OUT/'weather-grid.png')
 print('Console errors:',console_errors[-15:],flush=True)
 page.locator('#layersToggle').click()
 page.locator('#weatherClear').click()
 page.locator('#layersClose').click()
 page.locator('.bottom-nav [data-tab=weather]').click()
 assert 'الطقس' in page.locator('#panel').inner_text()
 page.screenshot(path=OUT/'science.png')
 page.locator('#settings').click()
 page.screenshot(path=OUT/'provider-settings.png')
 assert not page.locator('input[type=password]').count()
 assert 'مفتاح' not in page.locator('#settingsPanel').inner_text()
 assert not page.locator('#openRealistic').is_visible()
 page.locator('#lowPower').check()
 page.locator('#lowPower').uncheck()
 page.locator('#lang').click()
 assert page.locator('html').get_attribute('dir')=='ltr'
 page.locator('#settingsClose').click()
 page.locator('#nav [data-tab=space]').click()
 assert 'Space weather' in page.locator('#panel').inner_text()
 page.locator('#time').fill('12')
 assert page.locator('#time').input_value()=='12'
 page.locator('#now').click()
 assert page.locator('#time').input_value()=='0'
 page.locator('#sheetClose').click()
 page.locator('#searchinput').fill('31.346, 34.303')
 page.wait_for_selector('[data-place]',timeout=10000)
 page.locator('[data-place]').first.click()
 wait_until(lambda: float(page.locator('#zoomLevel').inner_text()[2:]) >= 17,15)
 page.set_viewport_size({'width':390,'height':844})
 page.wait_for_timeout(2000)
 assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
 page.screenshot(path=OUT/'mobile.png')
 print(json.dumps({'browser':'Chromium','network_tile_responses':len(tiles),'checks':'real vector tiles, GPS, 3D, globe, live address search, mode switching, preserved selection, science, timeline, RTL/LTR, responsive mobile','page_errors':errors},ensure_ascii=False))
 assert not errors,errors
 b.close()
