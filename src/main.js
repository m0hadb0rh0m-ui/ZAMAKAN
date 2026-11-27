import {callApi,setupPrime} from './prime-client.js';
import {COMMERCIAL,CONFIGURED_ION,LIVE_BUILDINGS_BASE} from './release-config.js';
import {Capacitor} from '@capacitor/core';
import * as maplibregl from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
maplibregl.setWorkerUrl(new URL(workerUrl, location.href).href);
import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css';
import {ionToken} from './provider-config.js';
import {readPreferences,writePreferences,readPlaces,savePlaces,placeId,toggleSaved,availableModes,freshness} from './experience.js';
import {lookupHeight} from './building-height.js';
import {renderSurface,surfaceSamples} from './weather-surface.js';
import {WEATHER_FIELDS,sampleGrid,fetchWeatherGrid,renderWeatherLayer} from './weather-layer.js';
import {searchPlaces,coordinateQuery} from './search.js';
import {icon} from './icons.js';
import {MODES,isCommercialMode,MAPTILER_KEY,fetchStyle,restoreOverlays,addScientific,setBuildings,setTerrain,zoomFor,gpsZoom,motion as systemMotion} from './map-engine.js';
import {SOURCES,fetchSource,weatherParams,eventsAt,nearestHour,distance,validCoords,iso,gibsTiles} from './data.js';

const $=id=>document.getElementById(id);
const prefs=readPreferences();let savedPlaces=readPlaces(), destination='explore', settingsPage='account', selectedVisible=false;
const state={lang:prefs.lang,mode:'flat',base:'streets',buildings:false,terrain:false,tab:'earth',position:{lon:34.31,lat:31.35},results:{},events:[],layers:{earthquake:true,wildfires:true,other:true},at:Date.now(),offset:0,playing:false,measure:false,points:[],request:0};
let lowPower=prefs.quality==='save'||prefs.quality==='auto'&&(Boolean(navigator.hardwareConcurrency&&navigator.hardwareConcurrency<=4)||Boolean(matchMedia('(prefers-reduced-motion: reduce)').matches));
const motion=()=>prefs.motion?0:Math.min(systemMotion(),420);
const tr=(ar,en)=>state.lang==='ar'?ar:en;
const tabs=[['earth','◉','الأرض','Earth'],['weather','☁','الطقس','Weather'],['disasters','⚠','الكوارث','Disasters'],['space','✦','الفضاء','Space'],['air','◈','البيئة','Environment'],['marine','≈','المحيطات','Oceans'],['sources','▤','المصادر','Sources'],['analysis','∿','التحليل','Analysis']];
const colors={earthquake:'#ffb15e',wildfires:'#ff617a',other:'#67d5f4'};
const fmt=(v,unit='')=>typeof v==='number'&&Number.isFinite(v)?v.toLocaleString(state.lang==='ar'?'ar':'en',{maximumFractionDigits:1})+' '+unit:'—';
const date=t=>t?new Date(iso(t)).toLocaleString(state.lang==='ar'?'ar':'en',{dateStyle:'short',timeStyle:'short'}):'—';
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const link=(url,text)=>{try{const u=new URL(url);return u.protocol==='https:'?'<a href="'+safe(u.href)+'" target="_blank" rel="noopener noreferrer">'+safe(text)+'</a>':''}catch{return ''}};
const label=(id)=>({available:tr('متصل','Available'),cached:tr('مخزن مؤقتًا','Cached'),stale:tr('قديم','Stale'),unavailable:tr('غير متاح','Unavailable')})[state.results[id]?.state]||tr('قيد الاتصال','Connecting');
const status=id=>'<span class="status '+(state.results[id]?.state||'pending')+'">'+label(id)+'</span>';
const doc=id=>link(SOURCES[id].docs,SOURCES[id].name);
const empty=()=>'<p class="muted">'+tr('لا توجد بيانات موثوقة متاحة الآن.','No reliable data available now.')+'</p>';
const btn=(id,ic,label,cls='')=>'<button type="button" id="'+id+'" class="'+cls+'" aria-label="'+label+'" title="'+label+'">'+icon(ic)+'</button>';
$('app').innerHTML=`<main class="map-shell">
 <div class="maparea"><div id="map" aria-label="Interactive world map"></div><div id="maperror" role="status" hidden></div><a id="maptilerCredit" hidden href="https://www.maptiler.com/copyright/" target="_blank" rel="noopener noreferrer"><img data-src="https://api.maptiler.com/resources/logo.svg" alt="MapTiler"> © MapTiler</a></div>
 <header class="floating-header"><div class="brand" aria-label="ZAMAKAN"><img src="./icon.svg" alt=""><b>زَمَكان</b></div>
 <div class="searchbar"><form id="searchform"><input id="searchinput" maxlength="120" type="search" aria-label="Location search" autocomplete="off" placeholder="ابحث عن مكان أو عنوان"><button id="searchbutton" aria-label="Search" type="submit">${icon('search')}</button></form><div id="searchresults" aria-live="polite"></div></div>
 ${btn('settings','user','Account','square')}</header>
 <div class="map-controls" aria-label="Map controls">
  ${btn('layersToggle','layers','Layers','square')}
  ${btn('gps','locate','Location','square')}
  ${btn('compass','compass','Reset north','square')}
  <div class="control-group"><button id="flat" type="button">2D</button><button id="buildings" type="button">3D</button></div>
  <button id="globe" type="button" class="square" aria-label="Globe" title="Globe">${icon('earth')}</button>
  <div class="control-group zoom-controls">${btn('zoomIn','plus','Zoom in')}${btn('zoomOut','minus','Zoom out')}</div>
  ${btn('measure','measure','Measure distance','square')}
 </div>
 <button class="map-status" id="sourceStatus"><span class="live-dot"></span><span id="maptitle"></span><span id="zoomLevel" dir="ltr" class="sr-only"></span></button>
 <div id="mapNotice" role="status" hidden></div>
 <section id="layersPanel" class="floating-panel" hidden><div class="panel-heading"><div><h2 id="layerTitle"></h2></div>${btn('layersClose','close','Close layers')}</div><div id="baseStyles" class="style-grid"></div><div class="quick-layers"><button id="quickSatellite"></button><button id="quickWeather"></button><button id="quick3d"></button><button id="liveBuildings" hidden></button><button id="openRealistic" hidden></button></div><details id="advancedLayers"><summary id="moreLayers"></summary><div class="advanced-inner"><h3 id="overlayTitle"></h3><div class="legend" id="legend"></div><div class="layer-row"><button id="imagery" type="button"></button><input type="date" id="imageDate" aria-label="Scientific imagery date"></div><small id="imageStatus" aria-live="polite"></small><label class="dem-row"><input type="checkbox" id="terrain"><span id="terrainLabel"></span></label><p id="layerHelp" class="muted"></p><h3 id="weatherLayerTitle"></h3><label class="field"><select id="weatherField" aria-label="Weather field"></select></label><button id="weatherGrid" type="button"></button><button id="weatherClear" type="button"></button><label class="dem-row"><input type="checkbox" id="weatherSurface" checked><span id="surfaceLabel"></span></label><div id="weatherScale" class="weather-scale"></div><small id="weatherLayerStatus" class="muted" aria-live="polite"></small></div></details></section>
 <section id="settingsPanel" class="floating-panel account-panel" hidden><div class="panel-heading"><h2 id="settingsTitle"></h2>${btn('settingsClose','close','Close account')}</div><div id="accountContent"></div><div id="primeContent" hidden><button id="primeBack" class="plain-link">‹</button><h2>ZAMAKAN PRIME</h2><p id="primeStatus" role="status"></p><div id="primeAuth" hidden><label id="primeEmailLabel" for="primeEmail"></label><input id="primeEmail" type="email" autocomplete="email" maxlength="254"><label id="primePasswordLabel" for="primePassword"></label><input id="primePassword" type="password" autocomplete="current-password" maxlength="128"><div class="row"><button id="primeSignIn"></button><button id="primeSignUp"></button></div></div><div id="primeMember" hidden><div id="primePlans"></div><p id="primeRenewal" class="muted"></p><button id="primeRestore" hidden></button><a id="primeManage" href="https://play.google.com/store/account/subscriptions" target="_blank" rel="noopener"></a><button id="primeLogout"></button><button id="primeDelete"></button></div><section id="primeChange" hidden><h3 id="primeChangeTitle"></h3><p id="primeChangeHint" class="muted"></p><label id="primeBeforeLabel" for="primeBefore"></label><input id="primeBefore" type="file" accept="image/jpeg,image/png,image/webp"><input id="primeBeforeDate" type="date"><label id="primeAfterLabel" for="primeAfter"></label><input id="primeAfter" type="file" accept="image/jpeg,image/png,image/webp"><input id="primeAfterDate" type="date"><button id="primeAnalyze"></button><p id="primeAnalysisResult" role="status"></p></section></div><div id="settingsContent" hidden><button id="backAccount" class="plain-link"></button><input type="search" id="settingsSearch" placeholder="ابحث في الإعدادات"><div class="settings-list">
 <details class="setting-group" data-section="appearance"><summary id="appearanceTitle"></summary><div class="setting-row"><label id="languageLabel" for="lang"></label><button id="lang">EN</button></div><div class="setting-row"><label id="themeLabel" for="themeSelect"></label><select id="themeSelect"><option value="auto">تلقائي</option><option value="light">فاتح</option><option value="dark">داكن</option></select></div><label class="setting-row"><span id="motionLabel"></span><input id="reduceMotion" type="checkbox"></label></details>
 <details class="setting-group" data-section="map"><summary id="mapSettingsTitle"></summary><div class="setting-row"><label id="viewLabel" for="viewSelect"></label><select id="viewSelect"><option value="easy">سهل</option><option value="pro">احترافي</option></select></div><label class="setting-row"><span id="rememberLabel"></span><input id="remember" type="checkbox"></label><div class="setting-row"><label id="unitsLabel" for="units"></label><select id="units"><option value="metric">km / m</option><option value="imperial">mi / ft</option></select></div></details>
 <details class="setting-group" data-section="data"><summary id="dataTitle"></summary><div class="setting-row"><label id="qualityLabel" for="qualitySelect"></label><select id="qualitySelect"><option value="auto">ذكي</option><option value="save">توفير</option><option value="high">جودة عالية</option></select></div><button id="refresh" class="settings-action"></button><span id="utc" dir="ltr"></span></details>
 <details class="setting-group" data-section="privacy"><summary id="privacyTitle"></summary><p id="settingsHint" class="muted"></p><button id="clearSaved" class="settings-action"></button></details>
 <details class="setting-group" data-section="alerts"><summary id="alertsTitle"></summary><p id="alertsHint" class="muted"></p><button id="openEvents" class="settings-action"></button></details>
 <details class="setting-group" data-section="support"><summary id="supportTitle"></summary><button id="openSources" class="settings-action"></button><button id="resetPrefs" class="settings-action"></button><div id="footer"></div></details>
 </div></div></section>
 <section id="savedPanel" class="floating-panel" hidden><div class="panel-heading"><h2 id="savedTitle"></h2>${btn('savedClose','close','Close saved places')}</div><div id="savedContent"></div></section>
 <section class="selection-chip" id="coord" aria-live="polite" hidden></section>
 <section id="realityPanel" hidden aria-label="Photorealistic 3D viewer"><div id="realityCanvas"></div><div class="reality-toolbar"><button id="closeReality"></button><span id="realityStatus" role="status"></span></div></section>
 <div id="sheet" class="sheet" hidden><button id="sheetHandle" class="sheet-handle" aria-label="Resize information sheet" type="button"><span></span></button><div class="panel-heading"><div><small class="eyebrow">ZAMAKAN INTELLIGENCE</small><h2 id="sheetTitle"></h2></div>${btn('sheetClose','close','Close information')}</div><nav id="nav" aria-label="Science modules"></nav><div class="timeline"><div class="row"><span id="timelabel"></span><strong id="timelineDate"></strong><button id="play">▶</button><button id="now"></button></div><input id="time" type="range" min="-24" max="48" value="0" step="1" aria-label="UTC time offset"><div class="range"><span>−24h</span><span>0</span><span>+48h</span></div></div><aside id="panel" aria-live="polite"></aside></div>
 <nav class="bottom-nav" aria-label="Main navigation"><button id="explore">${icon('map')}<span></span></button><button id="observe">${icon('earth')}<span></span></button><button id="savedNav">${icon('bookmark')}<span></span></button><button id="accountNav">${icon('user')}<span></span></button></nav>
 </main>`;
function applyPrefs(){document.documentElement.classList.toggle('light',prefs.theme==='light'||prefs.theme==='auto'&&!matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('pro',prefs.view==='pro');document.documentElement.classList.toggle('reduce-motion',prefs.motion);writePreferences(prefs);}
applyPrefs();
let noticeTimer;
const notice=message=>{clearTimeout(noticeTimer);$('mapNotice').textContent=message;$('mapNotice').hidden=!message;if(message)noticeTimer=setTimeout(()=>{$('mapNotice').hidden=true;},4500);};
function closePanels(){for(const id of ['layersPanel','settingsPanel','savedPanel','sheet'])$(id).hidden=true;}
function go(where){closePanels();destination=where;if(where==='observe'){$('sheet').hidden=false;state.tab='earth';}if(where==='saved')$('savedPanel').hidden=false;if(where==='account'){$('settingsPanel').hidden=false;settingsPage='account';}render();}
const sheetOpen=()=>{closePanels();destination='observe';$('sheet').hidden=false;renderChrome();};
function togglePanel(id){const was=$(id).hidden;closePanels();destination='explore';if(was)$(id).hidden=false;renderChrome();}
$('layersToggle').onclick=()=>togglePanel('layersPanel');$('settings').onclick=()=>go('account');
$('layersClose').onclick=()=>go('explore');$('settingsClose').onclick=()=>go('explore');$('savedClose').onclick=()=>go('explore');
$('sheetClose').onclick=()=>go('explore');$('explore').onclick=()=>go('explore');$('observe').onclick=()=>go('observe');$('savedNav').onclick=()=>go('saved');$('accountNav').onclick=()=>go('account');
$('sourceStatus').onclick=()=>{state.tab='sources';sheetOpen();render();};
$('sheetHandle').onclick=()=>{if(!draggedSheet)$('sheet').classList.toggle('expanded');draggedSheet=false;};
let sheetStart=null,draggedSheet=false;
$('sheetHandle').onpointerdown=e=>{draggedSheet=false;sheetStart=e.clientY;e.currentTarget.setPointerCapture(e.pointerId);};
$('sheetHandle').onpointerup=e=>{if(sheetStart!==null&&Math.abs(e.clientY-sheetStart)>35){$('sheet').classList.toggle('expanded',e.clientY<sheetStart);draggedSheet=true;e.preventDefault();}sheetStart=null;};
$('baseStyles').onclick=e=>{const mode=e.target.closest('[data-mode]')?.dataset.mode;if(!mode||!availableModes(MODES,MAPTILER_KEY,isCommercialMode).includes(mode))return;notice('');changeStyle(mode);};
$('quickSatellite').onclick=()=>{if(MAPTILER_KEY)changeStyle('satellite');else{imagery=!imagery;setImagery();if(imagery)notice(tr('صور NASA العلمية · تاريخ '+$('imageDate').value,'NASA scientific imagery · '+$('imageDate').value));}go('explore');};
$('quickWeather').onclick=()=>{if(weatherGridData){$('weatherClear').click();go('explore');return;}$('advancedLayers').open=true;$('weatherGrid').click();};
$('quick3d').onclick=()=>{$('buildings').click();go('explore');};
let liveBuildingsOn=false;
function syncLiveBuildings(){
 if(!mapReady||!LIVE_BUILDINGS_BASE)return;
 if(map.getLayer('live-buildings'))map.removeLayer('live-buildings');
 if(map.getSource('live-buildings'))map.removeSource('live-buildings');
 if(!liveBuildingsOn)return;
 map.addSource('live-buildings',{type:'vector',tiles:[LIVE_BUILDINGS_BASE+'/{z}/{x}/{y}'],minzoom:13,maxzoom:20,attribution:'© OpenStreetMap contributors (replicated)'});
 map.addLayer({id:'live-buildings',type:'fill',source:'live-buildings','source-layer':'building',paint:{'fill-color':'#0EADC2','fill-opacity':0.4,'fill-outline-color':'#0EADC2'}},map.getLayer('event-clusters')?'event-clusters':undefined);
}
$('liveBuildings').onclick=()=>{liveBuildingsOn=!liveBuildingsOn;syncLiveBuildings();renderChrome();};
let weatherGridData=null,weatherGridAbort,weatherField='temperature_2m',weatherGridState='',surfaceEnabled=true;
function syncWeatherGrid(){
 if(!mapReady)return;
 const continuous=renderSurface(map,weatherGridData,weatherField,surfaceEnabled);
 renderWeatherLayer(map,weatherGridData,weatherField);
 if(weatherGridData){const time=(continuous?surfaceSamples(weatherGridData,weatherField)?.time:null)||weatherGridData.features[0]?.properties.time;$('weatherLayerStatus').textContent=(continuous?tr('سطح إقليمي مستوفى حسابيًا داخل العينات فقط (ليس رادارًا أو قياسات ميدانية). وقت النموذج: ','Regional interpolation within sample coverage (not radar or observations). Model time: '):tr('عينات نموذجية نقطية. وقت النموذج: ','Discrete model samples. Model time: '))+date(time);}
 $('weatherScale').innerHTML=WEATHER_FIELDS[weatherField].stops.map(([v,c])=>'<span><i style="background:'+c+'"></i>'+v+' '+WEATHER_FIELDS[weatherField].unit+'</span>').join('');
}
$('weatherField').onchange=e=>{weatherField=e.target.value;syncWeatherGrid();};
$('weatherSurface').onchange=e=>{surfaceEnabled=e.target.checked;syncWeatherGrid();};
$('weatherClear').onclick=()=>{weatherGridAbort?.abort();weatherGridData=null;syncWeatherGrid();$('weatherLayerStatus').textContent='';};
$('weatherGrid').onclick=async()=>{
 if(!mapReady)return;
 weatherGridAbort?.abort();const controller=new AbortController();weatherGridAbort=controller;$('weatherGrid').disabled=true;
 $('weatherLayerStatus').textContent=tr('جارٍ طلب عينات النموذج…','Fetching model samples…');
 try{
  if(map.getZoom()>8)map.jumpTo({zoom:8,pitch:0});
  const pts=sampleGrid(map.getBounds(),surfaceEnabled?5:3);const geo=await fetchWeatherGrid(pts,controller.signal);
  if(controller.signal.aborted)return;
  weatherGridData=geo.features.length?geo:null;syncWeatherGrid();if(!weatherGridData)$('weatherLayerStatus').textContent=tr('لا توجد بيانات','No data');
 }catch(e){if(!controller.signal.aborted)console.warn('Weather layer unavailable:',e?.message);if(!controller.signal.aborted)$('weatherLayerStatus').textContent=tr('تعذر تحميل العينات. اختر نطاقًا إقليميًا ثم أعد المحاولة.','Samples unavailable. Choose a regional view and retry.');}
 finally{if(weatherGridAbort===controller){$('weatherGrid').disabled=false;renderChrome();}}
};
let realityAbort,realityDestroy;
function closeReality(){
 realityAbort?.abort();realityDestroy?.();realityDestroy=null;$('realityPanel').hidden=true;$('openRealistic').disabled=false;$('realityCanvas').textContent='';$('map').style.visibility='';map?.resize();
}
$('closeReality').onclick=closeReality;
$('openRealistic').onclick=async()=>{
 let token;
 try{token=ionToken(CONFIGURED_ION);}catch{notice(tr('العرض الواقعي غير متاح حاليًا.','Photorealistic view is not available.'));return;}
 realityAbort?.abort();const ctl=new AbortController();realityAbort=ctl;$('openRealistic').disabled=true;
 $('realityPanel').hidden=false;$('map').style.visibility='hidden';map?.stop();
 $('realityStatus').textContent=tr('تحميل المجسمات من المزود المرخص…','Loading licensed photorealistic tiles…');
 try{
  const {openRealistic3D}=await import('./realistic-3d.js');
  if(ctl.signal.aborted)return;
  realityDestroy=await openRealistic3D($('realityCanvas'),{token,lon:state.position.lon,lat:state.position.lat,signal:ctl.signal,lowPower,onStatus:s=>{if(!ctl.signal.aborted)$('realityStatus').textContent=s==='visible'?tr('مجسمات Google عبر Cesium ion؛ التغطية حسب المزود.','Google photorealistic tiles via Cesium ion; coverage varies.'):tr('بعض المجسمات لم تُحمّل أو تعذر الرسم.','Some tiles or rendering are unavailable.');}});
 }catch{if(!ctl.signal.aborted){closeReality();notice(tr('العرض الواقعي غير متاح لهذه المنطقة.','Photorealistic view is unavailable for this area.'));}}
};
document.addEventListener('visibilitychange',()=>{if(document.hidden){map?.stop();if(!$('realityPanel').hidden)closeReality();}});
$('terrain').onchange=()=>{state.terrain=$('terrain').checked;if(mapReady)setTerrain(map,state.terrain);};
$('compass').onclick=()=>map?.easeTo({bearing:0,pitch:0,duration:motion()});
$('zoomIn').onclick=()=>map?.zoomIn({duration:motion()});$('zoomOut').onclick=()=>map?.zoomOut({duration:motion()});
$('buildings').onclick=()=>{state.buildings=!state.buildings;state.mode='flat';if(mapReady){map.setProjection({type:'mercator'});setBuildings(map,state.buildings);map.easeTo({pitch:state.buildings?55:0,zoom:state.buildings?Math.max(15,map.getZoom()):map.getZoom(),duration:motion()});}renderChrome();};
$('imageDate').value=new Date(Date.now()-2*86400000).toISOString().slice(0,10);$('imageDate').max=new Date().toISOString().slice(0,10);$('imageDate').min='2000-02-24';
let searchResults=[],searchSequence=0,imagery=false,searchAbort,searchTimer,reverseAbort;
let lastQuery='',lastLang='';
function clearSearch(){clearTimeout(searchTimer);searchAbort?.abort();++searchSequence;$('searchresults').textContent='';lastQuery='';}
async function runSearch(){
 const query=$('searchinput').value.trim();if(query.length<3&&!coordinateQuery(query)){clearSearch();return;}
 if(query===lastQuery&&state.lang===lastLang&&$('searchresults').textContent)return;
 searchAbort?.abort();searchAbort=new AbortController();const seq=++searchSequence;lastQuery=query;lastLang=state.lang;
 $('searchresults').textContent=tr('جارٍ البحث…','Searching…');
 try{
  const found=await searchPlaces(query,{language:state.lang,position:mapReady?{lon:map.getCenter().lng,lat:map.getCenter().lat}:undefined,signal:searchAbort.signal});
  if(seq!==searchSequence)return;searchResults=found;
  $('searchresults').innerHTML=found.length?found.map((x,i)=>'<button data-place="'+i+'">'+icon('pin')+'<span><b>'+safe(x.name)+'</b><small>'+safe([x.admin,x.country,x.source].filter(Boolean).join(' · '))+'</small></span></button>').join(''):tr('لا توجد نتائج موثوقة','No reliable matches');
 }catch(e){if(seq!==searchSequence)return;lastQuery='';$('searchresults').textContent=tr('تعذر الاتصال بخدمة البحث. حاول مجددًا.','Search service unavailable. Try again.');}
}
$('searchform').onsubmit=e=>{e.preventDefault();clearTimeout(searchTimer);runSearch();};
$('searchinput').addEventListener('input',()=>{clearSearch();searchTimer=setTimeout(runSearch,750);});
$('searchinput').addEventListener('keydown',e=>{if(e.key==='Escape')clearSearch();if(e.key==='ArrowDown'){$('searchresults').querySelector('button')?.focus();e.preventDefault();}});
$('searchresults').addEventListener('keydown',e=>{if(e.key==='Escape'){clearSearch();$('searchinput').focus();}else if(e.key==='ArrowDown'||e.key==='ArrowUp'){const a=[...$('searchresults').querySelectorAll('button')],i=a.indexOf(document.activeElement);a[Math.max(0,Math.min(a.length-1,i+(e.key==='ArrowDown'?1:-1)))]?.focus();e.preventDefault();}});
$('searchresults').addEventListener('click',e=>{let id=e.target.closest('[data-place]')?.dataset.place;if(id!==undefined&&searchResults[id]){const x=searchResults[id];selectPosition(x.lon,x.lat,x);if(mapReady)map.flyTo({center:[x.lon,x.lat],zoom:zoomFor(x.type),duration:motion()});$('searchinput').value=x.name;clearSearch();$('searchinput').blur();}});
document.addEventListener('pointerdown',e=>{if(!e.target.closest('.searchbar')&&$('searchresults').textContent)clearSearch();});
async function reverseSelected(){
 const pos=state.position;reverseAbort?.abort();reverseAbort=new AbortController();
 notice(tr('جارٍ البحث عن العنوان…','Looking up address…'));
 try{const [x]=await searchPlaces('',{language:state.lang,position:pos,reverse:true,signal:reverseAbort.signal});if(state.position!==pos)return;state.place=x||null;renderChrome();notice(x?'':tr('لا يوجد عنوان مسجل لهذه النقطة','No mapped address at this point'));}catch{if(state.position===pos)notice(tr('تعذر استرجاع العنوان','Address lookup unavailable'));}
}
let heightAbort;
const canInspectHeight=place=>['building','coordinate','address','poi'].includes(place?.type);
async function inspectHeight(){
 const selected=state.place,pos=state.position;if(!canInspectHeight(selected))return;
 heightAbort?.abort();const ctl=new AbortController();heightAbort=ctl;selected.heightState='loading';renderChrome();
 try{const result=await lookupHeight(pos.lon,pos.lat,selected.renderHeight,{signal:ctl.signal});if(state.place!==selected||ctl.signal.aborted)return;selected.height=result;selected.heightState='done';}
 catch{if(ctl.signal.aborted||state.place!==selected)return;selected.heightState='failed';}
 renderChrome();
}
function heightCard(place){
 if(!canInspectHeight(place))return '';
 const h=place.height;let detail='';
 if(place.heightState==='loading')detail=tr('جارٍ التحقق…','Checking building source…');
 else if(place.heightState==='failed')detail=tr('تعذر الوصول إلى المصدر؛ الارتفاع غير موثّق.','Source unavailable; height remains unverified.');
 else if(h){
  const labels={'municipal-record':tr('ارتفاع السقف في السجل البلدي الرسمي (ليس شهادة مساحية)','Official municipal roof-height record (not a survey certificate)'),recorded:tr('ارتفاع مسجل في OSM (ليس قياسًا مستقلاً)','Height recorded in OSM (not independently surveyed)'), 'estimated-levels':tr('تقدير من الطوابق × ٣ م','Estimated from levels × 3 m'),'render-only':tr('ارتفاع رسم غير موثّق','Unverified render height'),unknown:tr('لا يوجد ارتفاع مسجل','No recorded height'),ambiguous:tr('لم تُحدَّد مطابقة فريدة للمبنى','No unique building match')};
  detail=labels[h.kind]+(h.meters!=null?' · '+fmt(h.meters,'m'):'')+(h.source?' · '+h.source:'')+(h.edited?' · '+tr('آخر تعديل للسجل: ','Record last edited: ')+date(h.edited):'');
 }
 return '<div class="height-info">'+(detail?'<small class="height-detail">'+safe(detail)+'</small>':'')+(h?.sourceRecords?link(h.sourceRecords,h.kind==='municipal-record'?tr('السجل البلدي الرسمي','Official municipal record'):tr('سجل المبنى في OpenStreetMap','OpenStreetMap building record')):'')+'<button id="inspectHeight" '+(place.heightState==='loading'?'disabled':'')+'>'+tr('تحقق من مصدر الارتفاع','Check height provenance')+'</button></div>';
}
$('coord').addEventListener('click',e=>{if(e.target.closest('#reverse'))reverseSelected();if(e.target.closest('#inspectHeight'))inspectHeight();if(e.target.closest('#savePlace')){savedPlaces=toggleSaved(savedPlaces,state.position,state.place?.name);savePlaces(savedPlaces);renderChrome();}if(e.target.closest('#dismissPlace')){selectedVisible=false;renderChrome();}if(e.target.closest('#sharePlace'))shareSelected();});
function setImagery(){
 if(!mapReady)return;
 try{addScientific(map,imagery?gibsTiles($('imageDate').value):null);$('imageStatus').textContent=imagery?tr('رصد علمي MODIS — تاريخ الطلب ','MODIS scientific observation — requested date ')+$('imageDate').value:'';$('imagery').classList.toggle('active',imagery);}catch{$('imageStatus').textContent=tr('الصور غير متاحة','Imagery unavailable');}
}
$('imagery').onclick=()=>{imagery=!imagery;setImagery();};$('imageDate').onchange=()=>{if(imagery)setImagery();};
let map,mapReady=false,styleRequest,styleSequence=0;
function mapMessage(message){$('maperror').textContent=message;$('maperror').hidden=!message;}
window.addEventListener('offline',()=>notice(tr('لا يوجد اتصال؛ قد تتوقف الخرائط والبيانات الحية.','Offline; map tiles and live data may be unavailable.')));
window.addEventListener('online',()=>{notice('');if(!mapReady)changeStyle(state.base);});
async function changeStyle(mode){
 if(!map)return;
 styleRequest?.abort();styleRequest=new AbortController();const seq=++styleSequence;
 const timer=setTimeout(()=>styleRequest?.abort(),20000);
 mapMessage(tr('جارٍ تحميل الخريطة…','Loading map…'));
 try{
  const style=await fetchStyle(mode,styleRequest.signal);
  if(seq!==styleSequence)return;
  mapReady=false;
  map.setStyle(style,{diff:false});state.base=mode;if(prefs.remember){prefs.base=mode;writePreferences(prefs);}
 }catch(e){
  if(seq!==styleSequence)return;
  mapMessage(tr('تعذر الاتصال بمصدر الخريطة. اضغط تحديث للمحاولة مجددًا.','Map provider unavailable. Press refresh to retry.'));
 }finally{clearTimeout(timer);}
}
try{
 map=new maplibregl.Map({container:'map',style:{version:8,sources:{},layers:[{id:'background',type:'background',paint:{'background-color':'#dce7ed'}}]},center:[34.31,31.35],zoom:12.5,maxZoom:20,maxPitch:75,attributionControl:{compact:true},maxTileCacheSize:lowPower?64:128,pixelRatio:Math.min(devicePixelRatio||1,lowPower?1:1.75),fadeDuration:lowPower?80:250});
 map.addControl(new maplibregl.ScaleControl({maxWidth:100}),'bottom-left');
 map.on('move',()=>{$('zoomLevel').textContent='Z '+map.getZoom().toFixed(1);$('compass').style.setProperty('--bearing',-map.getBearing()+'deg');});
 map.on('style.load',()=>{
  if(!map.getStyle().sources||!Object.values(map.getStyle().sources).some(s=>s.type==='vector'||s.type==='raster'))return;
  restoreOverlays(map,imagery?gibsTiles($('imageDate').value):null);
  map.setProjection({type:state.mode==='globe'?'globe':'mercator'});
  setBuildings(map,state.buildings);
  setTerrain(map,state.terrain);
  mapReady=true;mapMessage('');syncWeatherGrid();syncLiveBuildings();$('zoomLevel').textContent='Z '+map.getZoom().toFixed(1);updateMap();setImagery();renderChrome();
 });
 map.on('error',e=>{if(!mapReady)mapMessage(tr('تعذر تحميل مصدر الخريطة؛ حاول التحديث.','Map source failed; try refreshing.'));else if(e.sourceId==='scientific')$('imageStatus').textContent=tr('بعض مربعات MODIS غير متاحة','Some MODIS tiles are unavailable');});
 map.on('click',async e=>{
  if(!mapReady||!validCoords(e.lngLat.lng,e.lngLat.lat))return;if(destination!=='explore')go('explore');
  const found=map.queryRenderedFeatures(e.point,{layers:['quakes','event-clusters']})[0];
  if(found&&!state.measure){
   if(found.properties.cluster){try{const zoom=await map.getSource('events').getClusterExpansionZoom(found.properties.cluster_id);map.easeTo({center:found.geometry.coordinates,zoom,duration:motion()});}catch{}return;}
   const item=state.events.find(x=>x.id===found.properties.id);if(item){showEvent(item);return;}
  }
  const baseFeature=!state.measure?map.queryRenderedFeatures(e.point).find(f=>['poi','transportation_name','place','housenumber','building'].includes(f.sourceLayer)&&(f.properties?.name||f.properties?.name_en||f.properties?.housenumber||f.sourceLayer==='building')):null;
  const p=baseFeature?.properties;
  const place=p?{name:p.name||p.name_en||p.housenumber||tr('مبنى مسجّل','Mapped building'),admin:baseFeature.sourceLayer==='building'&&Number.isFinite(p.render_height)?tr('ارتفاع الرسم (غير موثّق): ','Rendered height (unverified): ')+p.render_height+' m':String(p.class||''),source:'OpenMapTiles / OpenStreetMap',type:baseFeature.sourceLayer==='building'?'building':'poi',renderHeight:baseFeature.sourceLayer==='building'&&Number.isFinite(p.render_height)?p.render_height:null}:null;
  selectPosition(e.lngLat.lng,e.lngLat.lat,place);
 });
 changeStyle(prefs.remember&&availableModes(MODES,MAPTILER_KEY,isCommercialMode).includes(prefs.base)?prefs.base:'streets');
}catch(e){mapMessage('WebGL unavailable / تعذر تشغيل الخرائط');}
function visibleEvents(){return eventsAt(state.events,state.at).filter(e=>state.layers[e.category==='earthquake'?'earthquake':e.category==='wildfires'?'wildfires':'other']);}
function updateMap(){if(!mapReady)return;map.getSource('events').setData({type:'FeatureCollection',features:visibleEvents().map(e=>({type:'Feature',geometry:{type:'Point',coordinates:[e.lon,e.lat]},properties:{id:e.id,color:colors[e.category]||colors.other}}))});map.getSource('selection').setData({type:'FeatureCollection',features:[{type:'Feature',geometry:{type:'Point',coordinates:[state.position.lon,state.position.lat]},properties:{}}]});map.getSource('measure').setData({type:'FeatureCollection',features:state.points.length===2?[{type:'Feature',geometry:{type:'LineString',coordinates:state.points.map(p=>[p.lon,p.lat])},properties:{}}]:[]});}
let positionTimer,lastPositionKey='';
function selectPosition(lon,lat,place=null){heightAbort?.abort();if(!validCoords(lon,lat))return;reverseAbort?.abort();state.position={lon,lat};state.place=place;selectedVisible=true;if(state.measure){if(state.points.length===2)state.points=[];state.points.push({lon,lat});}updateMap();renderChrome();if(!state.measure){clearTimeout(positionTimer);positionTimer=setTimeout(loadPosition,300);}}
function showEvent(e){sheetOpen();state.tab='disasters';state.selected=e;selectPosition(e.lon,e.lat);if(mapReady)map.flyTo({center:[e.lon,e.lat],zoom:4,duration:700});render();}
function renderChrome(){
 document.documentElement.lang=state.lang;$('searchinput').placeholder=tr('ابحث عن مكان أو عنوان…','Search places or addresses…');document.documentElement.dir=state.lang==='ar'?'rtl':'ltr';$('lang').textContent=state.lang==='ar'?'EN':'ع';
 for(const [id,ar,en] of [['settings','حسابي','Account'],['gps','موقعي','My location'],['layersToggle','الطبقات','Layers'],['compass','البوصلة','Compass'],['sourceStatus','حالة المصادر','Source status']]){$(id).setAttribute('aria-label',tr(ar,en));$(id).title=tr(ar,en);}
 $('nav').innerHTML=tabs.map(([id,i,ar,en])=>'<button data-tab="'+id+'" class="'+(state.tab===id?'active':'')+'">'+icon(id)+tr(ar,en)+'</button>').join('');
 const fresh=freshness(state.results);$('maptitle').textContent=!navigator.onLine?tr('دون اتصال','Offline'):fresh.latest?(tr('آخر استرجاع · ','Last retrieved · ')+new Date(fresh.latest).toLocaleTimeString(state.lang==='ar'?'ar':'en',{hour:'2-digit',minute:'2-digit'})):tr('جارٍ الاتصال بالمصادر','Connecting to sources');$('sourceStatus').classList.toggle('degraded',fresh.degraded||!navigator.onLine||!fresh.available);
 const modeLabels={streets:['الشوارع','Streets'],light:['فاتحة','Light'],dark:['داكنة','Dark'],satellite:['قمر صناعي HD','Satellite HD'],hybrid:['هجين','Hybrid'],terrain:['تضاريس','Terrain'],topographic:['طبوغرافية','Topographic']};
 $('baseStyles').innerHTML=availableModes(MODES,MAPTILER_KEY,isCommercialMode).map(m=>'<button data-mode="'+m+'" class="style-choice '+(m===state.base?'active':'')+'" aria-pressed="'+(m===state.base)+'"><span class="map-swatch '+m+'"></span><b>'+tr(...modeLabels[m])+'</b>'+'</button>').join('');
 const weatherLabels={temperature_2m:['الحرارة','Temperature'],cloud_cover:['السحب','Cloud cover'],precipitation:['الأمطار','Precipitation'],wind_speed_10m:['سرعة الرياح','Wind speed'],surface_pressure:['الضغط','Pressure']};
 $('weatherField').innerHTML=Object.keys(WEATHER_FIELDS).map(k=>'<option value="'+k+'">'+tr(...weatherLabels[k])+'</option>').join('');$('weatherField').value=weatherField;
 $('weatherLayerTitle').textContent=tr('خرائط الطقس الإقليمية','Regional weather maps');$('surfaceLabel').textContent=tr('سطح مستمر مستوفى حسابيًا','Interpolated continuous surface');$('weatherSurface').checked=surfaceEnabled;$('weatherGrid').textContent=tr('تحميل المنطقة الظاهرة','Load visible region');$('weatherClear').textContent=tr('إزالة العينات','Clear samples');
 $('layerTitle').textContent=tr('أنماط الخريطة','Map styles');$('overlayTitle').textContent=tr('طبقات الرصد','Observation layers');
 $('imagery').textContent=tr('رصد NASA MODIS','NASA MODIS observation');$('terrainLabel').textContent=tr('ارتفاعات التضاريس DEM','DEM elevation');$('terrain').disabled=!MAPTILER_KEY;$('terrain').closest('label').hidden=!MAPTILER_KEY;$('terrain').checked=state.terrain;
 $('layerHelp').textContent=(['satellite','hybrid'].includes(state.base)?tr('تاريخ التقاط الصور غير متاح من النمط؛ قد تختلف الدقة والحداثة حسب المنطقة. ','Acquisition date not supplied by this style; imagery detail and age vary by area. '):'')+tr('ارتفاعات المباني من OpenMapTiles قد تكون محسوبة أو تقديرية؛ لا يمكن تأكيدها من هذا المصدر.','OpenMapTiles building heights may be derived or estimated; provenance is not supplied.');
 $('liveBuildings').hidden=!LIVE_BUILDINGS_BASE;$('liveBuildings').textContent=tr(liveBuildingsOn?'إخفاء طبقة المباني المتجددة':'المباني المتجددة',liveBuildingsOn?'Hide replicated buildings':'Replicated buildings');$('quickSatellite').innerHTML=icon('space')+tr(MAPTILER_KEY?'صور الأقمار':'صور الأرض NASA',MAPTILER_KEY?'Satellite imagery':'NASA Earth imagery');$('quickWeather').innerHTML=icon('weather')+tr(weatherGridData?'إخفاء الطقس':'خريطة الطقس',weatherGridData?'Hide weather':'Weather map');$('quick3d').innerHTML=icon('earth')+tr(state.buildings?'خريطة 2D':'مبانٍ 3D',state.buildings?'2D map':'3D buildings');$('moreLayers').textContent=tr('المزيد من الطبقات','More layers');
 $('closeReality').textContent=tr('العودة للخريطة','Back to map');$('openRealistic').hidden=!CONFIGURED_ION;$('openRealistic').textContent=tr('عرض واقعي 3D','Photorealistic 3D');
 const mt=isCommercialMode(state.base)&&Boolean(MAPTILER_KEY);$('maptilerCredit').hidden=!mt;if(mt){const logo=$('maptilerCredit').querySelector('img');if(!logo.src)logo.src=logo.dataset.src;}
 $('sheetTitle').textContent=tr('الرصد','Observe');$('sheet').querySelector('.timeline').hidden=!['weather','disasters','space'].includes(state.tab);
 for(const [id,key,ar,en] of [['explore','explore','استكشف','Explore'],['observe','observe','الرصد','Observe'],['savedNav','saved','محفوظاتي','Saved'],['accountNav','account','حسابي','Account']]){let b=$(id);b.querySelector('span').textContent=tr(ar,en);b.classList.toggle('active',destination===key);b.setAttribute('aria-current',destination===key?'page':'false');}
 renderAccount();renderSaved();
 $('coord').hidden=!selectedVisible||destination!=='explore'||!$('layersPanel').hidden;
 $('buildings').classList.toggle('active',state.buildings);
 $('flat').setAttribute('aria-pressed',!state.buildings&&state.mode==='flat');
 $('globe').classList.toggle('active',state.mode==='globe');$('flat').classList.toggle('active',state.mode==='flat'&&!state.buildings);$('measure').classList.toggle('active',state.measure);
 $('coord').innerHTML='<b>'+tr('النقطة المحددة','Selected location')+'</b>'+(state.place?'<strong>'+safe(state.place.name)+'</strong><small>'+safe([state.place.admin,state.place.country,state.place.source].filter(Boolean).join(' · '))+'</small>':'')+'<div dir="ltr">'+state.position.lat.toFixed(4)+'°, '+state.position.lon.toFixed(4)+'°</div>'+(state.measure?'<small>'+ (state.points.length===2?fmt(distance(...state.points)*(prefs.units==='imperial'?0.621371:1),prefs.units==='imperial'?'mi':'km'):tr('حدد نقطتين للقياس','Select two points'))+'</small>':(!state.place?'<button id="reverse">'+tr('استرجاع العنوان','Find address')+'</button>':''))+heightCard(state.place)+'<div class="place-actions"><button id="savePlace">'+icon('bookmark')+tr(savedPlaces.some(p=>p.id===placeId(state.position))?'محفوظ':'حفظ',savedPlaces.some(p=>p.id===placeId(state.position))?'Saved':'Save')+'</button><button id="sharePlace">'+icon('share')+tr('مشاركة','Share')+'</button><button id="dismissPlace">'+icon('close')+'</button></div>';

 $('legend').innerHTML=Object.entries(colors).map(([k,c])=>'<label><input type="checkbox" data-layer="'+k+'" '+(state.layers[k]?'checked':'')+'><i style="background:'+c+'"></i>'+tr({earthquake:'زلازل',wildfires:'حرائق',other:'أحداث أخرى'}[k],{earthquake:'Earthquakes',wildfires:'Wildfires',other:'Other events'}[k])+'</label>').join('');
 $('timelabel').textContent=tr('التوقيت المحلي','Local time');$('now').textContent=tr('الآن','Now');$('timelineDate').textContent=date(state.at);$('play').textContent=state.playing?'Ⅱ':'▶';$('time').value=state.offset;
 $('footer').textContent=tr('زمكان • ليست خدمة إنذار رسمية','ZAMAKAN • Not an official warning service');
}
function renderAccount(){
 const strings={settingsTitle:['حسابي','Account'],backAccount:['‹ الحساب','‹ Account'],appearanceTitle:['المظهر واللغة','Appearance & language'],languageLabel:['اللغة','Language'],themeLabel:['المظهر','Appearance'],motionLabel:['تقليل الحركة','Reduce motion'],mapSettingsTitle:['الخريطة','Map'],viewLabel:['وضع الاستخدام','Experience'],rememberLabel:['تذكر الخريطة','Remember map'],unitsLabel:['الوحدات','Units'],dataTitle:['البيانات والإنترنت','Data & internet'],qualityLabel:['جودة العرض','Display quality'],privacyTitle:['الموقع والخصوصية','Location & privacy'],alertsTitle:['التنبيهات','Alerts'],supportTitle:['الدعم والمصادر','Help & sources'],clearSaved:['حذف المحفوظات المحلية','Clear local saved places'],openEvents:['عرض الأحداث','View events'],openSources:['حالة مصادر البيانات','Data source status'],resetPrefs:['استعادة الإعدادات الافتراضية','Reset preferences'],refresh:['تحديث البيانات','Refresh data'],settingsHint:['لا يُطلب موقعك إلا عند اختيار موقعي. قد ترسل البحث والخرائط الإحداثيات إلى مزودي الخدمة.','Location is requested only when you choose My location. Search and maps may share coordinates with providers.'],alertsHint:['عرض الأحداث العامة متاح مجانًا. الإشعارات الخلفية غير مفعلة في هذا الإصدار.','Public events are free. Background notifications are not enabled in this release.']};
 for(const [id,label] of Object.entries(strings))$(id).textContent=tr(...label);
 $('settingsTitle').textContent=settingsPage==='account'?tr('حسابي','Account'):settingsPage==='prime'?'PRIME':tr('الإعدادات','Settings');
 $('settingsSearch').placeholder=tr('ابحث في الإعدادات','Search settings');
 $('accountContent').hidden=settingsPage!=='account';$('settingsContent').hidden=settingsPage!=='settings';$('primeContent').hidden=settingsPage!=='prime';
 $('accountContent').innerHTML='<div class="account-intro"><img src="./icon.svg" alt=""><b>ZAMAKAN</b><small>'+tr('استكشف الأرض بلا حساب إلزامي','Explore Earth without an account')+'</small></div><section class="prime-card"><span class="prime-label">ZAMAKAN PRIME</span><h2>'+tr('اكتشف أكثر','Explore more')+'</h2><p>'+tr('مقارنة صور الأرض وتحليلها بالذكاء الاصطناعي.','AI-powered comparison of Earth imagery.')+'</p><small>'+tr('الاشتراك وإدارة الحساب','Subscribe and manage account')+'</small><button id="openPrime" class="prime-cta">'+tr('عرض PRIME','View PRIME')+'</button></section><button id="openSettings" class="account-action">'+icon('settings')+tr('الإعدادات','Settings')+icon('chevron')+'</button><button id="accountSources" class="account-action">'+icon('sources')+tr('حالة البيانات والمصادر','Data & sources')+icon('chevron')+'</button>';
 $('themeSelect').value=prefs.theme;$('viewSelect').value=prefs.view;$('qualitySelect').value=prefs.quality;$('units').value=prefs.units;$('remember').checked=prefs.remember;$('reduceMotion').checked=prefs.motion;
 for(const [id,labels] of [['themeSelect',[['تلقائي','System'],['فاتح','Light'],['داكن','Dark']]],['viewSelect',[['سهل','Easy'],['احترافي','Professional']]],['qualitySelect',[['ذكي','Automatic'],['توفير','Data saver'],['جودة عالية','High quality']]]])Array.from($(id).options).forEach((o,i)=>o.textContent=tr(...labels[i]));
}
function renderSaved(){
 $('savedTitle').textContent=tr('محفوظاتي','Saved places');
 $('savedContent').innerHTML='<p class="muted">'+tr('أماكنك المحفوظة على هذا الجهاز','Places saved on this device')+'</p>'+(savedPlaces.length?savedPlaces.map(p=>'<div class="saved-row"><button data-saved="'+safe(p.id)+'">'+icon('pin')+'<span><b>'+safe(p.name)+'</b><small dir="ltr">'+p.lat.toFixed(4)+', '+p.lon.toFixed(4)+'</small></span></button><button data-remove="'+safe(p.id)+'" aria-label="'+tr('حذف','Remove')+'">'+icon('close')+'</button></div>').join(''):'<div class="empty-saved">'+icon('bookmark')+'<h3>'+tr('احفظ مكانك الأول','Save your first place')+'</h3><p>'+tr('اختر مكانًا على الخريطة ثم اضغط حفظ.','Select a place on the map and tap Save.')+'</p></div><button id="savedExplore" class="primary-action">'+tr('استكشف الخريطة','Explore map')+'</button>');
}
async function shareSelected(){const text=state.place?.name||tr('موقع في زمكان','Location in ZAMAKAN'),url='https://www.openstreetmap.org/?mlat='+state.position.lat+'&mlon='+state.position.lon+'#map=16/'+state.position.lat+'/'+state.position.lon;try{if(navigator.share)await navigator.share({title:text,url});else if(navigator.clipboard){await navigator.clipboard.writeText(url);notice(tr('تم نسخ الرابط','Link copied'));}else notice(url);}catch(e){if(e.name!=='AbortError')notice(tr('تعذرت المشاركة','Sharing unavailable'));}}
let primeInitialized=false;
function primeLabels(){
 const strings={primeBack:['‹ الحساب','‹ Account'],primeEmailLabel:['البريد الإلكتروني','Email'],primePasswordLabel:['كلمة المرور','Password'],primeSignIn:['تسجيل الدخول','Sign in'],primeSignUp:['إنشاء حساب','Create account'],primeRestore:['استعادة الشراء','Restore purchase'],primeManage:['إدارة الاشتراك في Google Play','Manage on Google Play'],primeLogout:['تسجيل الخروج','Sign out'],primeDelete:['حذف حسابي','Delete account'],primeRenewal:['يتجدد الاشتراك تلقائيًا وفق السعر والفترة في متجر Google Play. يمكنك الإلغاء من المتجر.','Renews automatically at the price and period shown in Google Play. Cancel in the store.'],primeChangeTitle:['مقارنة الصور بالذكاء الاصطناعي','AI image comparison'],primeChangeHint:['اختر صورتين مصرحًا باستخدامهما لنفس المنطقة بدقة وزاوية متقاربتين. سترسل الصورتان إلى خدمة الذكاء الاصطناعي. النتيجة تقديرية وليست قياسًا هندسيًا.','Choose two authorized images of the same area with similar resolution and viewing angle. Images are sent to the AI service. Results are not a survey.'],primeBeforeLabel:['الصورة السابقة وتاريخها','Before image and date'],primeAfterLabel:['الصورة الأحدث وتاريخها','After image and date'],primeAnalyze:['تحليل التغيرات','Analyze changes']};
 for(const [id,v] of Object.entries(strings))$(id).textContent=tr(...v);
}
$('primeBack').onclick=()=>{settingsPage='account';renderAccount();};
$('accountContent').onclick=e=>{if(e.target.closest('#openPrime')){settingsPage='prime';renderAccount();primeLabels();if(!primeInitialized){primeInitialized=true;setupPrime($('primeContent'),tr).catch(()=>{$('primeStatus').textContent=tr('الخدمة غير متاحة حاليًا','Service unavailable');});}}if(e.target.closest('#openSettings')){settingsPage='settings';renderAccount();}if(e.target.closest('#accountSources'))$('sourceStatus').click();};
$('backAccount').onclick=()=>{settingsPage='account';renderAccount();};$('openSources').onclick=()=>$('sourceStatus').click();$('openEvents').onclick=()=>{state.tab='disasters';sheetOpen();render();};
$('settingsSearch').oninput=e=>{const q=e.target.value.trim().toLowerCase();document.querySelectorAll('.setting-group').forEach(g=>{g.hidden=Boolean(q&&!g.textContent.toLowerCase().includes(q));if(q&&!g.hidden)g.open=true;});};
for(const [id,prop] of [['themeSelect','theme'],['viewSelect','view'],['qualitySelect','quality'],['units','units'],['remember','remember'],['reduceMotion','motion']])$(id).onchange=e=>{prefs[prop]=e.target.type==='checkbox'?e.target.checked:e.target.value;applyPrefs();lowPower=prefs.quality==='save'||(prefs.quality==='auto'&&navigator.hardwareConcurrency<=4);if(map)map.setPixelRatio(Math.min(devicePixelRatio||1,lowPower?1:1.75));renderChrome();};
$('clearSaved').onclick=()=>{if(confirm(tr('حذف جميع الأماكن المحلية؟','Delete all locally saved places?'))){savedPlaces=[];savePlaces(savedPlaces);renderChrome();}};
$('resetPrefs').onclick=()=>{if(confirm(tr('استعادة الإعدادات؟','Reset preferences?'))){localStorage.removeItem('zamakan.experience.v1');Object.assign(prefs,readPreferences());state.lang=prefs.lang;applyPrefs();render();}};
$('savedContent').onclick=e=>{const id=e.target.closest('[data-saved]')?.dataset.saved,remove=e.target.closest('[data-remove]')?.dataset.remove;if(remove){savedPlaces=savedPlaces.filter(p=>p.id!==remove);savePlaces(savedPlaces);renderSaved();}if(id){const p=savedPlaces.find(x=>x.id===id);if(p){go('explore');selectPosition(p.lon,p.lat,{name:p.name,type:'coordinate'});mapReady&&map.flyTo({center:[p.lon,p.lat],zoom:16,duration:motion()});}}if(e.target.closest('#savedExplore'))go('explore');};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&destination!=='explore')go('explore');});
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
let osmLive=null,osmError=false;
async function loadOsm(){try{osmLive=await callApi('osm/live');osmError=false;if(liveBuildingsOn&&mapReady)syncLiveBuildings();}catch{osmError=true;}if(state.tab==='earth'&&!$('sheet').hidden)render();}
function buildingEdits(){const a=osmLive;if(!a)return '<section class="card"><h2>'+tr('تحديثات المباني','Building map edits')+'</h2><p class="muted">'+(osmError?tr('مصدر التحديث غير متصل بالخادم','Replication worker is not connected'):tr('جارٍ التحقق من المصدر','Checking replication source'))+'</p></section>';
 const counts=a.lastBatch||{};return '<section class="card"><h2>'+tr('تعديلات بيانات المباني','Building map edits')+'</h2><p class="tag">OpenStreetMap · '+(a.stale||osmError?tr('بيانات قديمة','Stale data'):tr('آخر دفعة معالجة','Latest processed batch'))+' · '+date(a.processedTimestamp)+'</p><div class="metrics">'+metric(tr('مضاف','Added'),Number(counts.create)||0)+metric(tr('معدل','Modified'),Number(counts.modify)||0)+'</div><p class="muted">'+tr('تعديلات خرائط وليست صورًا مباشرة؛ تشمل الوسوم الصريحة فقط.','Map edits, not live imagery; explicit building tags only.')+'</p><div class="eventlist">'+(a.events||[]).slice(-5).reverse().map(x=>'<div class="registry">'+link('https://www.openstreetmap.org/'+(x.osmType==='relation'?'relation':'way')+'/'+Number(x.id),tr('عرض التعديل','View edit')+' #'+Number(x.id))+' · '+safe(x.operation)+'<br><small>'+date(x.editedAt)+'</small></div>').join('')+'</div></section>';}
function summary(){return '<section class="card"><h2>'+tr('حول العالم','Around the world')+'</h2><div class="metrics"><button data-tab="disasters" class="metric"><small>'+tr('زلازل ضمن التغذية','Earthquakes in feed')+'</small><strong>'+count('earthquake')+'</strong></button><button data-tab="disasters" class="metric"><small>'+tr('حرائق EONET','EONET wildfires')+'</small><strong>'+count('wildfires')+'</strong></button></div><div class="sourceflow">'+['earthquakes','hazards','space','weather'].map(k=>'<div class="row">'+doc(k)+status(k)+'</div>').join('')+'</div></section>';}
function analysisCard(){let e=state.events.filter(x=>x.category==='earthquake'&&x.magnitude!=null&&Date.parse(x.time)<=state.at),max=e.reduce((a,b)=>!a||b.magnitude>a.magnitude?b:a,null);return '<section class="card"><h2>'+tr('تحليل زَمَكان','ZAMAKAN analysis')+'</h2><p class="tag">'+tr('تحليل حسابي محلي — ليس ذكاءً توليديًا','Local deterministic analysis — not generative AI')+'</p><p>'+tr('لا يصدر تنبؤات بالزلازل أو إنذارات إخلاء.','Does not predict earthquakes or issue evacuation warnings.')+'</p>'+sourceMeta('earthquakes')+(max?'<p>'+tr('أعلى مقدار في عينة التغذية المعروضة','Highest magnitude in displayed feed sample')+': <strong>'+fmt(max.magnitude)+'</strong> · '+safe(max.title)+' · '+date(max.time)+'</p>':empty())+weatherCard()+spaceCard()+'</section>';}
function render(){renderChrome();const panel=$('panel');panel.innerHTML=state.tab==='earth'?summary()+buildingEdits()+weatherCard()+spaceCard():state.tab==='weather'?weatherCard():state.tab==='disasters'?eventCard():state.tab==='space'?spaceCard():state.tab==='air'?extraCard('air'):state.tab==='marine'?extraCard('marine'):state.tab==='analysis'?analysisCard():'<section class="card"><h2>'+tr('سجل المصادر','Data source registry')+'</h2>'+Object.keys(SOURCES).map(k=>'<div class="registry">'+sourceMeta(k)+'<small>'+safe(SOURCES[k].kind)+' · TTL '+SOURCES[k].ttl/1000+' s</small></div>').join('')+'<p>'+tr('Open-Meteo المجاني للاستخدام غير التجاري؛ التفاصيل في وثائق المشروع.','Open-Meteo free API is non-commercial only; see project documentation.')+'</p></section>';}
async function loadGlobal(){await Promise.all(['earthquakes','hazards','space'].map(async k=>{state.results[k]=await fetchSource(k);if(state.offset===0)state.at=Date.now();state.events=[...(state.results.earthquakes?.data||[]),...(state.results.hazards?.data||[])];updateMap();render();}));}
async function loadPosition(){const ticket=++state.request;const posKey=state.position.lon.toFixed(3)+','+state.position.lat.toFixed(3);if(posKey!==lastPositionKey){for(const k of ['weather','air','marine'])delete state.results[k];lastPositionKey=posKey;render();}let keys=['weather'];if(state.tab==='air')keys.push('air');if(state.tab==='marine')keys.push('marine');await Promise.all(keys.map(async k=>{let r=await fetchSource(k,weatherParams(state.position.lon,state.position.lat,k));if(ticket===state.request){state.results[k]=r;render();}}));}
document.addEventListener('click',e=>{const tab=e.target.closest('[data-tab]')?.dataset.tab,ev=e.target.closest('[data-event]')?.dataset.event;if(tab){state.tab=tab;sheetOpen();render();if(['air','marine','weather'].includes(tab))loadPosition();}if(ev){let item=state.events.find(x=>x.id===ev);if(item)showEvent(item);}});
$('legend').addEventListener('change',e=>{if(e.target.dataset.layer){state.layers[e.target.dataset.layer]=e.target.checked;updateMap();render();}});
$('lang').onclick=()=>{state.lang=prefs.lang=state.lang==='ar'?'en':'ar';applyPrefs();render();};
$('globe').onclick=()=>{state.mode='globe';state.buildings=false;if(mapReady){setBuildings(map,false);map.setProjection({type:'globe'});map.flyTo({zoom:2.2,pitch:0,duration:motion()});}renderChrome();};$('flat').onclick=()=>{state.mode='flat';state.buildings=false;if(mapReady){map.setProjection({type:'mercator'});setBuildings(map,false);map.easeTo({pitch:0,duration:motion()});}renderChrome();};
$('refresh').onclick=()=>{if(!mapReady||!$('maperror').hidden)changeStyle(state.base);loadGlobal();loadPosition();notice(tr('جارٍ تحديث البيانات المتاحة','Refreshing available data'));};$('gps').onclick=async()=>{
 notice(tr('جارٍ تحديد الموقع…','Finding your location…'));$('gps').disabled=true;
 try{
  const opts={timeout:15000,enableHighAccuracy:true,maximumAge:10000};
  let position;
  if(Capacitor.isNativePlatform()){
   const {Geolocation}=await import('@capacitor/geolocation');
   let permissions=await Geolocation.checkPermissions();
   if(permissions.location!=='granted'&&permissions.coarseLocation!=='granted')permissions=await Geolocation.requestPermissions({permissions:['location']});
   if(permissions.location!=='granted'&&permissions.coarseLocation!=='granted')throw Error('Location permission denied');
   position=await Geolocation.getCurrentPosition(opts);
  }else{
   if(!navigator.geolocation)throw Error('Geolocation unavailable');
   position=await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,opts));
  }
  const {longitude,latitude,accuracy}=position.coords;
  notice('');selectPosition(longitude,latitude);
  if(mapReady)map.flyTo({center:[longitude,latitude],zoom:gpsZoom(accuracy),duration:motion()});
 }catch{notice(tr('لم يتم منح إذن الموقع أو تعذر تحديده','Location permission denied or unavailable'));}
 finally{$('gps').disabled=false;}
};

$('measure').onclick=()=>{state.measure=!state.measure;state.points=[];updateMap();renderChrome();};
function timeOffset(v){state.offset=Number(v);state.at=Date.now()+state.offset*3600000;updateMap();render();}
$('time').oninput=e=>timeOffset(e.target.value);$('now').onclick=()=>{state.playing=false;timeOffset(0);};$('play').onclick=()=>{state.playing=!state.playing;renderChrome();};
setInterval(()=>{ $('utc').textContent=new Date().toISOString().slice(11,19)+' UTC';if(state.playing&&!document.hidden){if(state.offset>=48){state.playing=false;renderChrome();}else timeOffset(state.offset+1);} },1000);
setInterval(()=>{if(!document.hidden){loadGlobal();loadPosition();}},180000);
render();loadGlobal();loadPosition();loadOsm();setInterval(()=>{if(!document.hidden)loadOsm();},60000);
if(import.meta.env.PROD&&!Capacitor.isNativePlatform()&&'serviceWorker'in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>{});
