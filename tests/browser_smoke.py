import json, os, pathlib
from datetime import datetime, timezone, timedelta
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright
BASE=os.environ.get('ZAMAKAN_URL','http://127.0.0.1:4173')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH'),headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':1440,'height':900})
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 # Deterministic network fixtures for integration behavior; not live source verification.
 def mock_forecast(route):
  q=parse_qs(urlparse(route.request.url).query)
  latitudes=q.get('latitude',['31.35'])[0].split(',')
  longitudes=q.get('longitude',['34.31'])[0].split(',')
  now=datetime.now(timezone.utc).replace(minute=0,second=0,microsecond=0)
  time=[(now+timedelta(hours=i)).strftime('%Y-%m-%dT%H:%M') for i in range(-24,73)]
  def row(i,lat,lon):
   return {'latitude':float(lat),'longitude':float(lon),'location_id':i,'current':{'time':now.strftime('%Y-%m-%dT%H:%M'),'temperature_2m':20,'wind_speed_10m':9,'wind_direction_10m':180},'current_units':{'temperature_2m':'°C','wind_speed_10m':'km/h','wind_direction_10m':'°'},'hourly':{'time':time,'temperature_2m':[20]*len(time),'wind_speed_10m':[5]*len(time),'wind_direction_10m':[180]*len(time),'precipitation':[0]*len(time),'surface_pressure':[1010]*len(time)},'hourly_units':{'temperature_2m':'°C','wind_speed_10m':'m/s' if q.get('wind_speed_unit')==['ms'] else 'km/h','wind_direction_10m':'°','precipitation':'mm','surface_pressure':'hPa'}}
  data=[row(i,lat,lon) for i,(lat,lon) in enumerate(zip(latitudes,longitudes))]
  route.fulfill(json=data if len(data)>1 else data[0])
 page.route('https://api.open-meteo.com/v1/forecast?**',mock_forecast)
 page.route('https://api.weather.gov/alerts/active',lambda route:route.fulfill(json={'type':'FeatureCollection','features':[]}))
 page.goto(BASE,wait_until='domcontentloaded',timeout=30000)
 assert page.locator('#nav button').count()==5
 assert page.locator('#map').is_hidden()
 page.locator('#nav [data-tab=map]').click()
 page.wait_for_selector('#map canvas',timeout=20000)
 page.wait_for_timeout(2000)
 assert page.locator('#maptitle').inner_text()=='محرك الأرض العالمي'
 page.locator('#flat').click()
 assert 'active' in page.locator('#flat').get_attribute('class')
 page.locator('#globe').click()
 page.locator('#lang').click()
 assert page.locator('html').get_attribute('dir')=='ltr'
 def go(tab):
  group={'space':'observe','radar':'observe','weather':'observe','fft':'lab','models':'lab','cap':'lab','twin':'map','status':'more','ai':'more'}.get(tab,tab)
  page.locator('#nav [data-tab='+group+']').click()
  if group!=tab: page.locator('#panel [data-tab='+tab+']').first.click()
 go('space')
 assert page.locator('#map').is_hidden()
 assert 'Space weather' in page.locator('#panel').inner_text()
 go('map')
 page.locator('#time').fill('12')
 assert page.locator('#time').input_value()=='12'
 page.locator('#now').click()
 assert page.locator('#time').input_value()=='0'
 go('fft')
 page.get_by_role('button',name='Synthetic example').click()
 page.get_by_role('button',name='Calculate spectrum').click()
 page.get_by_text('8.0000 Hz',exact=True).wait_for(timeout=15000)
 assert 'WebAssembly' in page.locator('#panel').inner_text()
 page.get_by_role('button',name='Calculate spectrogram').click()
 page.get_by_text('Relative PSD',exact=False).wait_for()
 go('radar')
 page.get_by_role('button',name='Load and animate field').click()
 page.locator('.wind-overlay').wait_for(timeout=15000)
 page.wait_for_timeout(500)
 assert 'active' in page.locator('#flat').get_attribute('class')
 page.get_by_role('button',name='Stop wind field').click()
 assert page.locator('.wind-overlay').count()==0
 go('models')
 page.get_by_role('button',name='Compare IFS / GFS / ICON').click()
 page.get_by_text('Max model spread',exact=True).wait_for(timeout=15000)
 assert 'ECMWF IFS' in page.locator('#panel').inner_text()
 go('twin')
 building={'type':'FeatureCollection','features':[{'type':'Feature','properties':{'height':20},'geometry':{'type':'Polygon','coordinates':[[[34.31,31.35],[34.311,31.35],[34.311,31.351],[34.31,31.35]]]}}]}
 page.locator('#panel input[type=file]').set_input_files({'name':'test.geojson','mimeType':'application/geo+json','buffer':json.dumps(building).encode()})
 page.get_by_text('1 buildings · imported',exact=True).wait_for(timeout=15000)
 page.get_by_role('button',name='Remove layer').click()
 go('cap')
 cap_xml='<alert xmlns="urn:oasis:names:tc:emergency:cap:1.2"><identifier>fixture</identifier><sender>example.test</sender><sent>2026-01-01T00:00:00-00:00</sent><status>Test</status><msgType>Alert</msgType><scope>Public</scope><info><category>Met</category><event>Fixture only</event><urgency>Expected</urgency><severity>Moderate</severity><certainty>Likely</certainty></info></alert>'
 page.locator('#panel input[type=file]').set_input_files({'name':'test.xml','mimeType':'application/xml','buffer':cap_xml.encode()})
 page.get_by_text('Fixture only',exact=True).wait_for()
 assert 'Structural / semantic checks passed' in page.locator('#panel').inner_text()
 assert 'Unverified' in page.locator('#panel').inner_text()
 page.get_by_role('button',name='Load NWS alerts').click()
 page.get_by_text('Valid active feed entries',exact=True).wait_for()
 go('status')
 page.get_by_text('GDACS',exact=True).wait_for(timeout=20000)
 assert 'MOCK / synthetic fixtures' in page.locator('#panel').inner_text()
 assert 'Delayed' in page.locator('#panel').inner_text()
 go('weather')
 page.get_by_text('Data lineage',exact=True).first.wait_for()
 assert page.locator('#map').is_hidden()
 page.get_by_text('24-hour forecast',exact=True).wait_for()
 go('ai')
 page.get_by_text('Disabled — run local server',exact=False).wait_for()
 assert page.get_by_role('button',name='Ask assistant').is_disabled()
 page.locator('#settings').click()
 assert page.get_by_role('dialog').is_visible()
 page.get_by_label('Text size').select_option('large')
 assert page.locator('html').evaluate("e=>e.classList.contains('large-text')")
 page.get_by_label('Text size').select_option('standard')
 page.get_by_label('Application language').select_option('ar')
 assert page.locator('html').get_attribute('dir')=='rtl'
 page.get_by_label('لغة التطبيق').select_option('en')
 page.get_by_role('button',name='Close',exact=True).click()
 go('map')
 page.locator('#focus').click()
 assert page.locator('#panel').is_hidden()
 page.locator('#focus').click()
 assert page.locator('#panel').is_visible()
 page.locator('#globe').click()
 page.locator('#homeview').click()
 go('earth')
 page.wait_for_timeout(2000)
 page.screenshot(path='/tmp/zamakan-desktop.png')
 page.set_viewport_size({'width':390,'height':844})
 page.wait_for_timeout(800)
 assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
 page.screenshot(path='/tmp/zamakan-mobile.png')
 print(json.dumps({'browser':'Chromium','checks':'globe canvas, projection controls, RTL/LTR, timeline, FFT worker, grid particles and comparison (fixtures), imported 3D building, CAP XML and feed (fixture), AI disabled state, language settings, text sizes, map focus, mobile overflow','page_errors':errors,'status':page.locator('#panel').inner_text()[:1000]},ensure_ascii=False))
 assert not errors, errors
 b.close()
