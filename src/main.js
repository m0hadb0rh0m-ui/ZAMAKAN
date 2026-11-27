import * as maplibregl from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
maplibregl.setWorkerUrl(new URL(workerUrl, location.href).href);
import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css';
import {MAPTILER_KEY,fetchStyle,restoreOverlays,addScientific,setBuildings,setTerrain,zoomFor,gpsZoom,motion} from './map-engine.js';
import {SOURCES,fetchSource,weatherParams,eventsAt,nearestHour,distance,validCoords,iso,geocode,gibsTiles} from './data.js';

const $=id=>document.getElementById(id);
const state={lang:'ar',mode:'flat',base:'streets',buildings:false,terrain:false,tab:'earth',position:{lon:34.31,lat:31.35},results:{},events:[],layers:{earthquake:true,wildfires:true,other:true},at:Date.now(),offset:0,playing:false,measure:false,points:[],request:0};
const tr=(ar,en)=>state.lang==='ar'?ar:en;
const tabs=[['earth','◉','الأرض','Earth'],['weather','☁','الطقس','Weather'],['disasters','⚠','الكوارث','Disasters'],['space','✦','الفضاء','Space'],['air','◈','البيئة','Environment'],['marine','≈','المحيطات','Oceans'],['sources','▤','المصادر','Sources'],['analysis','∿','التحليل','Analysis']];
const colors={earthquake:'#ffb15e',wildfires:'#ff617a',other:'#67d5f4'};
const fmt=(v,unit='')=>typeof v==='number'&&Number.isFinite(v)?v.toLocaleString(state.lang==='ar'?'ar':'en',{maximumFractionDigits:1})+' '+unit:'—';
const date=t=>t?new Date(iso(t)).toLocaleString(state.lang==='ar'?'ar':'en',{timeZone:'UTC',dateStyle:'short',timeStyle:'short'})+' UTC':'—';
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const link=(url,text)=>{try{const u=new URL(url);return u.protocol==='https:'?'<a href="'+safe(u.href)+'" target="_blank" rel="noopener noreferrer">'+safe(text)+'</a>':''}catch{return ''}};
const label=(id)=>({available:tr('متصل','Available'),cached:tr('مخزن مؤقتًا','Cached'),stale:tr('قديم','Stale'),unavailable:tr('غير متاح','Unavailable')})[state.results[id]?.state]||tr('قيد الاتصال','Connecting');
const status=id=>'<span class="status '+(state.results[id]?.state||'pending')+'">'+label(id)+'</span>';
const doc=id=>link(SOURCES[id].docs,SOURCES[id].name);
const empty=()=>'<p class="muted">'+tr('لا توجد بيانات موثوقة متاحة الآن.','No reliable data available now.')+'</p>';
$('app').innerHTML='<header><div class="brand"><img src="./icon.svg" alt=""><div><b>زَمَكان <span>ZAMAKAN</span></b><small>EARTH & SPACE INTELLIGENCE</small></div></div><div class="top"><span id="utc"></span><button id="refresh" title="Refresh">↻</button><button id="lang">EN</button><button id="theme" title="Theme">☀</button></div></header><main><nav id="nav" aria-label="Modules"></nav><section class="workspace"><div class="maphead"><div><small class="eyebrow">GLOBAL OBSERVATORY / 01</small><h1 id="maptitle"></h1></div><div class="controls"><button id="globe">3D</button><button id="flat">2D</button><button id="gps" title="GPS">⌖ GPS</button><button id="measure">↔</button></div></div><div class="maparea"><div id="map" aria-label="Interactive world map"></div><div id="maperror" hidden></div><div class="overlay"><div class="glass" id="coord"></div><div class="glass legend" id="legend"></div></div></div><div class="timeline"><div class="row"><span id="timelabel"></span><strong id="timelineDate"></strong><button id="play">▶</button><button id="now"></button></div><input id="time" type="range" min="-24" max="48" value="0" step="1" aria-label="UTC time offset"><div class="range"><span>−24h</span><span>UTC 0</span><span>+48h</span></div></div></section><aside id="panel" aria-live="polite"></aside></main><footer id="footer"></footer>';
const toolBar=document.createElement('div');toolBar.className='searchbar';toolBar.innerHTML='<form id="searchform"><input id="searchinput" maxlength="80" type="search" aria-label="Location search" required minlength="2"><button id="searchbutton" type="submit">⌕</button></form><button id="imagery">NASA</button><input type="date" id="imageDate" aria-label="Satellite imagery date"><div id="searchresults" aria-live="polite"></div><small id="imageStatus" aria-live="polite"></small>';document.querySelector('.maphead').after(toolBar);
$('imageDate').value=new Date(Date.now()-2*86400000).toISOString().slice(0,10);$('imageDate').max=new Date().toISOString().slice(0,10);$('imageDate').min='2000-02-24';
let searchResults=[],searchSequence=0,imagery=false;
$('searchform').onsubmit=async e=>{e.preventDefault();let seq=++searchSequence;$('searchresults').textContent=tr('جارٍ البحث…','Searching…');try{const found=await geocode($('searchinput').value,state.lang);if(seq!==searchSequence)return;searchResults=found;$('searchresults').innerHTML=found.length?found.map((x,i)=>'<button data-place="'+i+'">'+safe([x.name,x.admin,x.country].filter(Boolean).join(' · '))+'</button>').join(''):tr('لا نتائج','No matches');}catch{$('searchresults').textContent=tr('تعذر البحث','Search unavailable');}};
$('searchresults').addEventListener('click',e=>{let id=e.target.closest('[data-place]')?.dataset.place;if(id!==undefined&&searchResults[id]){let x=searchResults[id];selectPosition(x.lon,x.lat);if(mapReady)map.flyTo({center:[x.lon,x.lat],zoom:zoomFor(x.type||'city'),duration:motion()});$('searchresults').textContent='';}});
function setImagery(){
 if(!mapReady)return;
 try{addScientific(map,imagery?gibsTiles($('imageDate').value):null);$('imageStatus').textContent=imagery?tr('رصد علمي MODIS — تاريخ الطلب ','MODIS scientific observation — requested date ')+$('imageDate').value:'';$('imagery').classList.toggle('active',imagery);}catch{$('imageStatus').textContent=tr('الصور غير متاحة','Imagery unavailable');}
}
$('imagery').onclick=()=>{imagery=!imagery;setImagery();};$('imageDate').onchange=()=>{if(imagery)setImagery();};
let map,mapReady=false,styleRequest,styleSequence=0,activeStyle='streets';
function mapMessage(message){$('maperror').textContent=message;$('maperror').hidden=!message;}
async function changeStyle(mode){
 if(!map)return;
 styleRequest?.abort();styleRequest=new AbortController();const seq=++styleSequence;
 const timer=setTimeout(()=>styleRequest?.abort(),20000);
 mapMessage(tr('جارٍ تحميل الخريطة…','Loading map…'));
 try{
  const style=await fetchStyle(mode,styleRequest.signal);
  if(seq!==styleSequence)return;
  mapReady=false;activeStyle=mode;
  map.setStyle(style,{diff:false});state.base=mode;
 }catch(e){
  if(seq!==styleSequence)return;
  mapMessage(tr('تعذر الاتصال بمصدر الخريطة. اضغط تحديث للمحاولة مجددًا.','Map provider unavailable. Press refresh to retry.'));
 }finally{clearTimeout(timer);}
}
try{
 map=new maplibregl.Map({container:'map',style:{version:8,sources:{},layers:[{id:'background',type:'background',paint:{'background-color':'#dce7ed'}}]},center:[34.31,31.35],zoom:10.5,maxZoom:20,maxPitch:75,attributionControl:{compact:true},maxTileCacheSize:160});
 map.addControl(new maplibregl.ScaleControl({maxWidth:100}),'bottom-left');
 map.on('style.load',()=>{
  if(!map.getStyle().sources||!Object.values(map.getStyle().sources).some(s=>s.type==='vector'||s.type==='raster'))return;
  restoreOverlays(map,imagery?gibsTiles($('imageDate').value):null);
  map.setProjection({type:state.mode==='globe'?'globe':'mercator'});
  setBuildings(map,state.buildings);
  setTerrain(map,state.terrain);
  mapReady=true;mapMessage('');updateMap();setImagery();renderChrome();
 });
 map.on('error',e=>{if(!mapReady)mapMessage(tr('تعذر تحميل مصدر الخريطة؛ حاول التحديث.','Map source failed; try refreshing.'));else if(e.sourceId==='scientific')$('imageStatus').textContent=tr('بعض مربعات MODIS غير متاحة','Some MODIS tiles are unavailable');});
 map.on('click',async e=>{
  if(!mapReady||!validCoords(e.lngLat.lng,e.lngLat.lat))return;
  const found=map.queryRenderedFeatures(e.point,{layers:['quakes','event-clusters']})[0];
  if(found&&!state.measure){
   if(found.properties.cluster){try{const zoom=await map.getSource('events').getClusterExpansionZoom(found.properties.cluster_id);map.easeTo({center:found.geometry.coordinates,zoom,duration:motion()});}catch{}return;}
   const item=state.events.find(x=>x.id===found.properties.id);if(item){showEvent(item);return;}
  }
  selectPosition(e.lngLat.lng,e.lngLat.lat);
 });
 changeStyle('streets');
}catch(e){mapMessage('WebGL unavailable / تعذر تشغيل الخرائط');}
function visibleEvents(){return eventsAt(state.events,state.at).filter(e=>state.layers[e.category==='earthquake'?'earthquake':e.category==='wildfires'?'wildfires':'other']);}
function updateMap(){if(!mapReady)return;map.getSource('events').setData({type:'FeatureCollection',features:visibleEvents().map(e=>({type:'Feature',geometry:{type:'Point',coordinates:[e.lon,e.lat]},properties:{id:e.id,color:colors[e.category]||colors.other}}))});map.getSource('selection').setData({type:'FeatureCollection',features:[{type:'Feature',geometry:{type:'Point',coordinates:[state.position.lon,state.position.lat]},properties:{}}]});map.getSource('measure').setData({type:'FeatureCollection',features:state.points.length===2?[{type:'Feature',geometry:{type:'LineString',coordinates:state.points.map(p=>[p.lon,p.lat])},properties:{}}]:[]});}
function selectPosition(lon,lat){if(!validCoords(lon,lat))return;state.position={lon,lat};if(state.measure){if(state.points.length===2)state.points=[];state.points.push({lon,lat});}updateMap();renderChrome();loadPosition();}
function showEvent(e){state.tab='disasters';state.selected=e;selectPosition(e.lon,e.lat);if(mapReady)map.flyTo({center:[e.lon,e.lat],zoom:4,duration:700});render();}
function renderChrome(){
 document.documentElement.lang=state.lang;$('searchinput').placeholder=tr('ابحث عن مدينة…','Search city…');$('searchbutton').textContent=tr('بحث','Search');document.documentElement.dir=state.lang==='ar'?'rtl':'ltr';$('lang').textContent=state.lang==='ar'?'EN':'ع';
 $('nav').innerHTML=tabs.map(([id,i,ar,en])=>'<button data-tab="'+id+'" class="'+(state.tab===id?'active':'')+'"><span>'+i+'</span>'+tr(ar,en)+'</button>').join('');
 $('maptitle').textContent=tr('محرك الأرض العالمي','Global Earth Engine');$('globe').classList.toggle('active',state.mode==='globe');$('flat').classList.toggle('active',state.mode==='flat');$('measure').classList.toggle('active',state.measure);
 $('coord').innerHTML='<b>'+tr('النقطة المحددة','Selected location')+'</b><div dir="ltr">'+state.position.lat.toFixed(4)+'°, '+state.position.lon.toFixed(4)+'°</div>'+(state.measure?'<small>'+ (state.points.length===2?fmt(distance(...state.points),'km'):tr('حدد نقطتين للقياس','Select two points'))+'</small>':'');
 $('legend').innerHTML=Object.entries(colors).map(([k,c])=>'<label><input type="checkbox" data-layer="'+k+'" '+(state.layers[k]?'checked':'')+'><i style="background:'+c+'"></i>'+tr({earthquake:'زلازل',wildfires:'حرائق',other:'أحداث أخرى'}[k],{earthquake:'Earthquakes',wildfires:'Wildfires',other:'Other events'}[k])+'</label>').join('');
 $('timelabel').textContent=tr('الزمان / UTC','Timeline / UTC');$('now').textContent=tr('الآن','Now');$('timelineDate').textContent=date(state.at);$('play').textContent=state.playing?'Ⅱ':'▶';$('time').value=state.offset;
 $('footer').textContent=tr('منصة علمية أولية • ليست خدمة إنذار رسمي • الإحداثيات الافتراضية: خان يونس','Research platform • Not an official warning service • Default location: Khan Younis');
}
function sourceMeta(id){let r=state.results[id];return '<div class="meta">'+doc(id)+' · '+status(id)+'<br>'+tr('الاسترجاع','Retrieved')+': '+date(r?.retrieved)+'</div>';}
function metric(label,value,unit){return '<div class="metric"><small>'+label+'</small><strong>'+fmt(value,unit)+'</strong></div>';}
function weatherCard(){const r=state.results.weather,d=r?.data;const c=d?.current;if(!c)return '<section class="card"><h2>'+tr('الطقس','Weather')+'</h2>'+sourceMeta('weather')+empty()+'</section>';const u=d.current_units||{};const selected=state.offset===0?null:nearestHour(d,state.at);
 const rows=[['temperature_2m','الحرارة','Temperature'],['apparent_temperature','المحسوسة','Feels like'],['relative_humidity_2m','الرطوبة','Humidity'],['surface_pressure','الضغط','Pressure'],['wind_speed_10m','الرياح','Wind'],['wind_direction_10m','الاتجاه','Direction'],['wind_gusts_10m','الهبات','Gusts'],['cloud_cover','السحب','Clouds'],['precipitation','الهطول','Precipitation']];
 return '<section class="card"><h2>'+tr('الطقس','Weather')+'</h2><p class="tag">'+tr('ناتج نموذج جوي — ليس قياس محطة','Model output — not station observation')+'</p>'+sourceMeta('weather')+'<div class="muted">'+date(c.time)+'</div><div class="metrics">'+rows.map(([k,a,b])=>metric(tr(a,b),c[k],u[k]||'')).join('')+'</div>'+(state.offset===0?'':'<h3>'+tr('ساعة الشريط الزمني','Timeline forecast hour')+'</h3>'+(selected?'<div>'+date(selected.time)+'</div><div class="metrics">'+Object.entries(selected.values).map(([k,v])=>metric(k,v,d.hourly_units?.[k]||'')).join('')+'</div>':empty()))+hourChart(d)+'</section>';}
function hourChart(d){let h=d.hourly;if(!h?.time||!h.temperature_2m)return '';let vals=h.temperature_2m.map((v,i)=>({v,t:h.time[i]})).filter(x=>typeof x.v==='number'&&Number.isFinite(x.v)).slice(0,72);if(vals.length<2)return '';let min=Math.min(...vals.map(x=>x.v)),max=Math.max(...vals.map(x=>x.v));let pts=vals.map((x,i)=>[8+i/(vals.length-1)*284,90-(x.v-min)/Math.max(1,max-min)*74].join(',')).join(' ');return '<h3>'+tr('السلسلة الزمنية للحرارة','Temperature time series')+'</h3><svg viewBox="0 0 300 105" role="img" aria-label="Temperature model curve"><path d="M8 90H292M8 50H292M8 15H292" stroke="currentColor" opacity=".2"/><polyline points="'+pts+'" fill="none" stroke="#54e2cc" stroke-width="2.5"/></svg><small>'+fmt(min,'°C')+' — '+fmt(max,'°C')+' · '+date(vals[0].t)+' → '+date(vals.at(-1).t)+'</small>';}
function eventCard(){let ev=visibleEvents().sort((a,b)=>Date.parse(b.time)-Date.parse(a.time));let e=state.selected;return '<section class="card"><h2>'+tr('الأحداث الطبيعية','Natural events')+'</h2>'+sourceMeta('earthquakes')+sourceMeta('hazards')+'<p class="muted">'+tr('EONET يعرض الأحداث المبلغ عنها ذات الإحداثيات النقطية؛ ليست جميع البؤر أو تحذيرات الإخلاء.','EONET shows reported point events, not all hotspots or evacuation alerts.')+'</p>'+(e?'<div class="detail"><b>'+safe(e.title)+'</b><p>'+safe(e.category)+' · '+safe(e.source)+' · '+safe(e.status)+'</p><p>'+date(e.time)+' · '+fmt(e.magnitude,e.unit||'')+' '+(e.depth!=null?' / '+fmt(e.depth,'km'):'')+'</p>'+link(e.url,tr('السجل الرسمي','Source record'))+'</div>':'')+'<div class="eventlist">'+(ev.length?ev.slice(0,100).map(x=>'<button class="event" data-event="'+safe(x.id)+'"><i style="background:'+(colors[x.category]||colors.other)+'"></i><div><b>'+safe(x.title)+'</b><small>'+safe(x.source)+' · '+date(x.time)+'</small></div><strong>'+fmt(x.magnitude,x.unit||'')+'</strong></button>').join(''):empty())+'</div></section>';}
function spaceCard(){const series=state.results.space?.data?.filter(x=>Date.parse(x.time)<=state.at)||[],last=series.at(-1);return '<section class="card"><h2>'+tr('الطقس الفضائي','Space weather')+'</h2>'+sourceMeta('space')+'<p class="tag">'+tr('مؤشر Kp الكوكبي التقديري','Estimated planetary Kp index')+'</p>'+(last?'<div class="kp"><strong>'+fmt(last.value)+'</strong><span> / 9</span></div><meter min="0" max="9" value="'+last.value+'"></meter><p>'+date(last.time)+'</p><p>'+tr('Kp من 5 فأعلى يشير إلى مستوى عاصفة مغناطيسية أرضية على مقياس NOAA.','Kp 5 or greater corresponds to geomagnetic storm levels on the NOAA scale.')+'</p>':empty())+'</section>';}
function extraCard(id){const d=state.results[id]?.data;return '<section class="card"><h2>'+tr(id==='air'?'جودة الهواء':'حالة البحر',id==='air'?'Air quality':'Marine conditions')+'</h2>'+sourceMeta(id)+'<p class="tag">'+tr('بيانات نموذجية عند وقت النموذج الحالي وليست قياسات ميدانية','Current model-time values; not field measurements')+'</p>'+(d?'<p>'+date(d.current.time)+'</p><div class="metrics">'+Object.entries(d.current).filter(([k])=>k!=='time'&&k!=='interval').map(([k,v])=>metric(k,v,d.current_units?.[k]||'')).join('')+'</div>':empty())+'</section>';}
function count(cat){const relevant=cat==='earthquake'?'earthquakes':'hazards';return state.results[relevant]?.data?visibleEvents().filter(x=>x.category===cat).length:'—';}
function summary(){return '<section class="card"><div class="row"><small class="eyebrow">OPERATIONS CENTER</small><span class="pulse"></span></div><h2>'+tr('مركز العمليات','Operations center')+'</h2><div class="metrics"><button data-tab="disasters" class="metric"><small>'+tr('زلازل ضمن التغذية','Earthquakes in feed')+'</small><strong>'+count('earthquake')+'</strong></button><button data-tab="disasters" class="metric"><small>'+tr('حرائق EONET','EONET wildfires')+'</small><strong>'+count('wildfires')+'</strong></button></div><div class="sourceflow">'+['earthquakes','hazards','space','weather'].map(k=>'<div class="row">'+doc(k)+status(k)+'</div>').join('')+'</div></section>';}
function analysisCard(){let e=state.events.filter(x=>x.category==='earthquake'&&x.magnitude!=null&&Date.parse(x.time)<=state.at),max=e.reduce((a,b)=>!a||b.magnitude>a.magnitude?b:a,null);return '<section class="card"><h2>'+tr('تحليل زَمَكان','ZAMAKAN analysis')+'</h2><p class="tag">'+tr('تحليل حسابي محلي — ليس ذكاءً توليديًا','Local deterministic analysis — not generative AI')+'</p><p>'+tr('لا يصدر تنبؤات بالزلازل أو إنذارات إخلاء.','Does not predict earthquakes or issue evacuation warnings.')+'</p>'+sourceMeta('earthquakes')+(max?'<p>'+tr('أعلى مقدار في عينة التغذية المعروضة','Highest magnitude in displayed feed sample')+': <strong>'+fmt(max.magnitude)+'</strong> · '+safe(max.title)+' · '+date(max.time)+'</p>':empty())+weatherCard()+spaceCard()+'</section>';}
function render(){renderChrome();const panel=$('panel');panel.innerHTML=state.tab==='earth'?summary()+weatherCard()+spaceCard():state.tab==='weather'?weatherCard():state.tab==='disasters'?eventCard():state.tab==='space'?spaceCard():state.tab==='air'?extraCard('air'):state.tab==='marine'?extraCard('marine'):state.tab==='analysis'?analysisCard():'<section class="card"><h2>'+tr('سجل المصادر','Data source registry')+'</h2>'+Object.keys(SOURCES).map(k=>'<div class="registry">'+sourceMeta(k)+'<small>'+safe(SOURCES[k].kind)+' · TTL '+SOURCES[k].ttl/1000+' s</small></div>').join('')+'<p>'+tr('Open-Meteo المجاني للاستخدام غير التجاري؛ التفاصيل في وثائق المشروع.','Open-Meteo free API is non-commercial only; see project documentation.')+'</p></section>';}
async function loadGlobal(){await Promise.all(['earthquakes','hazards','space'].map(async k=>{state.results[k]=await fetchSource(k);if(state.offset===0)state.at=Date.now();state.events=[...(state.results.earthquakes?.data||[]),...(state.results.hazards?.data||[])];updateMap();render();}));}
async function loadPosition(){const ticket=++state.request;for(const k of ['weather','air','marine'])delete state.results[k];render();let keys=['weather'];if(state.tab==='air')keys.push('air');if(state.tab==='marine')keys.push('marine');await Promise.all(keys.map(async k=>{let r=await fetchSource(k,weatherParams(state.position.lon,state.position.lat,k));if(ticket===state.request){state.results[k]=r;render();}}));}
document.addEventListener('click',e=>{const tab=e.target.closest('[data-tab]')?.dataset.tab,ev=e.target.closest('[data-event]')?.dataset.event;if(tab){state.tab=tab;render();if(['air','marine'].includes(tab))loadPosition();}if(ev){let item=state.events.find(x=>x.id===ev);if(item)showEvent(item);}});
$('legend').addEventListener('change',e=>{if(e.target.dataset.layer){state.layers[e.target.dataset.layer]=e.target.checked;updateMap();render();}});
$('lang').onclick=()=>{state.lang=state.lang==='ar'?'en':'ar';render();};$('theme').onclick=()=>document.documentElement.classList.toggle('light');
$('globe').onclick=()=>{state.mode='globe';if(mapReady)map.setProjection({type:'globe'});renderChrome();};$('flat').onclick=()=>{state.mode='flat';if(mapReady)map.setProjection({type:'mercator'});renderChrome();};
$('refresh').onclick=()=>{if(!mapReady||!$('maperror').hidden)changeStyle(state.base);loadGlobal();loadPosition();};$('gps').onclick=()=>{if(!navigator.geolocation){alert(tr('GPS غير متاح','GPS unavailable'));return;}navigator.geolocation.getCurrentPosition(p=>{selectPosition(p.coords.longitude,p.coords.latitude);if(mapReady)map.flyTo({center:[p.coords.longitude,p.coords.latitude],zoom:gpsZoom(p.coords.accuracy),duration:motion()});},()=>alert(tr('لم يتم منح إذن الموقع أو تعذر تحديده','Location permission denied or unavailable')),{timeout:12000,enableHighAccuracy:false});};
$('measure').onclick=()=>{state.measure=!state.measure;state.points=[];updateMap();renderChrome();};
function timeOffset(v){state.offset=Number(v);state.at=Date.now()+state.offset*3600000;updateMap();render();}
$('time').oninput=e=>timeOffset(e.target.value);$('now').onclick=()=>{state.playing=false;timeOffset(0);};$('play').onclick=()=>{state.playing=!state.playing;renderChrome();};
setInterval(()=>{ $('utc').textContent=new Date().toISOString().slice(11,19)+' UTC';if(state.playing){if(state.offset>=48){state.playing=false;renderChrome();}else timeOffset(state.offset+1);} },1000);
setInterval(()=>{if(!document.hidden){loadGlobal();if(state.tab!=='marine'&&state.tab!=='air')loadPosition();}},180000);
render();loadGlobal();loadPosition();
if(import.meta.env.PROD&&'serviceWorker'in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>{});
