// Independent server probes: fixed public URLs, no user location or request-derived destinations.
const time=v=>{const t=typeof v==='number'?v:Date.parse(typeof v==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(v)?v+'Z':v);return Number.isFinite(t)?t:null;};
const latest=rows=>rows.map(time).filter(v=>v!==null).reduce((a,b)=>Math.max(a,b),0)||null;
const current=d=>{if(!d?.current||!Number.isFinite(time(d.current.time)))throw Error('schema');return time(d.current.time);};
const feature=d=>{if(d?.type!=='FeatureCollection'||!Array.isArray(d.features))throw Error('schema');return null;};
const series=d=>{if(!Array.isArray(d)||!d.length)throw Error('schema');const t=latest(d.map(r=>r.time_tag));if(t===null)throw Error('timestamp');return t;};
const observedSeries=(d,fields,active=false)=>{if(!Array.isArray(d))throw Error('schema');const rows=d.filter(r=>(!active||r.active===true)&&fields.some(k=>Number.isFinite(r[k])));return series(rows);};
const forecast='?latitude=0&longitude=0&timezone=GMT&current=temperature_2m';
export const PROBES=[
 ['usgs','USGS','https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson',180000,d=>{feature(d);if(!Number.isFinite(d.metadata?.generated))throw Error('timestamp');return d.metadata.generated;}],
 ['gdacs','GDACS','https://www.gdacs.org/xml/rss_24h.xml',900000,d=>{if(typeof d!=='string'||/<!DOCTYPE|<!ENTITY/i.test(d)||!/<rss(?:\s|>)/i.test(d)||!/<channel>/i.test(d)||!/<\/rss>/i.test(d))throw Error('schema');const channel=d.split(/<item(?:\s|>)/i,1)[0];return time(/<lastBuildDate>([^<]+)<\/lastBuildDate>/i.exec(channel)?.[1]||/<pubDate>([^<]+)<\/pubDate>/i.exec(channel)?.[1]||'');},'text'],
 ['openmeteo','Open-Meteo','https://api.open-meteo.com/v1/forecast'+forecast,3600000,current],
 ['air','Open-Meteo / CAMS','https://air-quality-api.open-meteo.com/v1/air-quality?latitude=0&longitude=0&timezone=GMT&current=pm2_5',7200000,current],
 ['marine','Open-Meteo Marine','https://marine-api.open-meteo.com/v1/marine?latitude=0&longitude=0&timezone=GMT&current=wave_height',7200000,current],
 ['geocoding','Open-Meteo Geocoding','https://geocoding-api.open-meteo.com/v1/search?name=London&count=1&language=en&format=json',null,d=>{if(!Array.isArray(d?.results)||!d.results.length)throw Error('schema');return null;}],
 ['eonet','NASA EONET','https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=1',null,d=>{if(!Array.isArray(d?.events))throw Error('schema');return null;}],
 ['nws','NWS','https://api.weather.gov/alerts/active',null,feature,'json',12000000],
 ['noaa-kp','NOAA SWPC Kp','https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json',21600000,d=>{if(!Array.isArray(d)||!d.length)throw Error('schema');const t=latest(d.map(r=>Array.isArray(r)?r[0]:r.time_tag));if(!t)throw Error('timestamp');return t;}],
 ['noaa-wind','NOAA SWPC wind','https://services.swpc.noaa.gov/json/rtsw/rtsw_wind_1m.json',600000,d=>observedSeries(d,['proton_speed','proton_density','proton_temperature'],true),'json',6000000],
 ['noaa-mag','NOAA SWPC magnetic','https://services.swpc.noaa.gov/json/rtsw/rtsw_mag_1m.json',600000,d=>observedSeries(d,['bt','bz_gsm'],true),'json',6000000],
 ['goes','NOAA GOES','https://services.swpc.noaa.gov/json/goes/primary/xrays-6-hour.json',600000,d=>observedSeries(d,['flux'])],
 ['radar','RainViewer','https://api.rainviewer.com/public/weather-maps.json',1200000,d=>{if(!Array.isArray(d?.radar?.past))throw Error('schema');const t=latest(d.radar.past.map(r=>r.time*1000));if(!t)throw Error('timestamp');return t;}],
 ['orbits','CelesTrak ISS','https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=JSON',172800000,d=>{if(!Array.isArray(d)||!d[0]?.EPOCH)throw Error('schema');return time(d[0].EPOCH+'Z')??time(d[0].EPOCH);}],
 ['buildings','OpenFreeMap','https://tiles.openfreemap.org/planet',null,d=>{if(!Array.isArray(d?.tiles))throw Error('schema');return null;}]
];
async function readBounded(response,limit=2000000){
 const reader=response.body.getReader(),chunks=[];let total=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>limit)throw Error('payload too large');chunks.push(value);}}
 finally{await reader.cancel().catch(()=>{});}
 return Buffer.concat(chunks,total).toString('utf8');
}
export function createSourceMonitor({fetcher=fetch,now=Date.now,mode='live',ttl=60000}={}){
 let snapshot=null,pending=null;
 async function probe([id,name,url,maxAge,parse,format,limit]){
  const start=now();try{
   const response=await fetcher(url,{signal:AbortSignal.timeout(12000),redirect:'error',headers:{'User-Agent':'ZAMAKAN research source monitor','Accept':format==='text'?'application/xml,text/xml':'application/json'}});
   if(!response.ok)throw Error('HTTP '+response.status);
   const text=await readBounded(response,limit),timestamp=parse(format==='text'?text:JSON.parse(text)),checkedAt=now();
   if(timestamp!==null&&(!Number.isFinite(timestamp)||timestamp>checkedAt+3600000))throw Error('timestamp');
   const ageSeconds=timestamp===null?null:Math.max(0,Math.floor((checkedAt-timestamp)/1000));
   return {id,name,url,checkedAt,latencyMs:Math.max(0,checkedAt-start),sourceTime:timestamp,ageSeconds,state:timestamp===null?'reachable':maxAge!==null&&checkedAt-timestamp>maxAge?'delayed':'healthy',error:null};
  }catch(e){const checkedAt=now();return {id,name,url,checkedAt,latencyMs:Math.max(0,checkedAt-start),sourceTime:null,ageSeconds:null,state:'unavailable',error:/^HTTP \d{3}$/.test(e.message)?e.message:'Probe failed (network, format, or timeout)'};}
 }
 return {async get({force=false}={}){
  if(!force&&snapshot&&now()-snapshot.checkedAt<ttl)return snapshot;
  if(pending)return pending;
  pending=Promise.all(PROBES.map(probe)).then(sources=>(snapshot={mode,checkedAt:now(),sources})).finally(()=>{pending=null;});return pending;
 }};
}
