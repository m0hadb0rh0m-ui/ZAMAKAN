import os
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH'),headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']+(['--proxy-server='+os.environ['ZAMAKAN_PROXY'],'--proxy-bypass-list=localhost;127.0.0.1'] if os.environ.get('ZAMAKAN_PROXY') else []))
 page=b.new_page(viewport={'width':1000,'height':750},ignore_https_errors=True)
 urls=[]; errors=[]
 page.on('request',lambda r:urls.append(r.url))
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(os.environ.get('ZAMAKAN_URL','http://127.0.0.1:4173'),wait_until='domcontentloaded')
 page.wait_for_selector('.maplibregl-ctrl-attrib a',timeout=35000)
 page.locator('#layersToggle').click()
 page.locator('#weatherGrid').click()
 page.wait_for_timeout(800)
 page.locator('#layersClose').click()
 page.locator('#settings').click()
 assert not page.locator('#mapKey').is_visible()
 assert page.locator('#openRealistic').is_disabled()
 page.locator('#settingsClose').click()
 page.locator('#searchinput').fill('New York')
 page.wait_for_timeout(1000)
 forbidden=[u for u in urls if any(x in u for x in ['api.open-meteo.com','photon.komoot.io','overpass-api.de'])]
 print('commercial fail-closed: forbidden calls',forbidden,'uncaught errors',errors)
 assert not forbidden and not errors
 b.close()
