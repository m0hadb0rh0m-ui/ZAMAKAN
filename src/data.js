import {COMMERCIAL,weatherEndpoint,weatherKinds} from './release-config.js';
export const SOURCES = {
 earthquakes:{name:'USGS',url:'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson',docs:'https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php',kind:'observed',ttl:90000},
 hazards:{name:'NASA EONET',url:'https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=100',docs:'https://eonet.gsfc.nasa.gov/docs/v3',kind:'reported',ttl:900000},
 space:{name:'NOAA SWPC',url:'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json',docs:'https://services.swpc.noaa.gov/products/',kind:'estimated',ttl:300000},
 weather:{name:'Open-Meteo',url:'https://api.open-meteo.com/v1/forecast',docs:'https://open-meteo.com/en/docs',kind:'forecast',ttl:900000},
 air:{name:'Open-Meteo / CAMS',url:'https://air-quality-api.open-meteo.com/v1/air-quality',docs:'https://open-meteo.com/en/docs/air-quality-api',kind:'forecast',ttl:900000},
 marine:{name:'Open-Meteo',url:'https://marine-api.open-meteo.com/v1/marine',docs:'https://open-meteo.com/en/docs/marine-weather-api',kind:'forecast',ttl:900000}
};
export const validCoords=(lon,lat)=>Number.isFinite(lon)&&Number.isFinite(lat)&&Math.abs(lon)<=180&&Math.abs(lat)<=90;
export const iso=t=>{const d=new Date(typeof t==='string'&&!/[Zz]|[+-]\d\d:\d\d$/.test(t)?t.replace(' ','T')+'Z':t);return t!=null&&Number.isFinite(+d)?d.toISOString():null};
const num=v=>v!==null&&v!==''&&v!==undefined&&Number.isFinite(Number(v))?Number(v):null;
export function earthquakes(raw){
 if(!Array.isArray(raw?.features))throw Error('Invalid USGS response');
 return raw.features.flatMap(f=>{const p=f.properties||{},c=f.geometry?.coordinates||[],time=iso(p.time);if(!validCoords(c[0],c[1])||!time)return [];
 return [{id:'usgs:'+f.id,title:String(p.place||f.id),lon:c[0],lat:c[1],depth:num(c[2]),magnitude:num(p.mag),time,updated:iso(p.updated),category:'earthquake',source:'USGS',status:p.status||'unknown',kind:'observed',url:p.url,tsunami:p.tsunami===1}];});
}
export function hazards(raw){
 if(!Array.isArray(raw?.events))throw Error('Invalid EONET response');
 return raw.events.flatMap(e=>{const g=[...(e.geometry||[])].filter(x=>x.type==='Point'&&validCoords(...(x.coordinates||[]))&&iso(x.date)).sort((a,b)=>Date.parse(b.date)-Date.parse(a.date))[0];if(!g)return [];
 const cat=e.categories?.[0]?.id||'other';return [{id:'eonet:'+e.id,title:String(e.title||e.id),lon:g.coordinates[0],lat:g.coordinates[1],time:iso(g.date),category:cat,source:'NASA EONET',status:'reported',kind:'reported',magnitude:num(g.magnitudeValue),unit:g.magnitudeUnit||null,url:e.link}];});
}
export function kp(raw){
 if(!Array.isArray(raw))throw Error('Invalid SWPC response');
 if(raw.length===0)return [];
 if(!Array.isArray(raw[0])) return raw.flatMap(r=>{const time=iso(r.time_tag),value=num(r.Kp??r.kp);return time&&value!==null&&value>=0&&value<=9?[{time,value}]:[]}).sort((a,b)=>Date.parse(a.time)-Date.parse(b.time));
 const h=raw[0].map(x=>String(x).toLowerCase()),ti=h.indexOf('time_tag'),ki=h.indexOf('kp');
 if(ti<0||ki<0)throw Error('Missing Kp columns');
 return raw.slice(1).flatMap(r=>{const time=iso(r[ti]),value=num(r[ki]);return time&&value!==null&&value>=0&&value<=9?[{time,value}]:[]}).sort((a,b)=>Date.parse(a.time)-Date.parse(b.time));
}
export function weatherParams(lon,lat,kind='weather'){
 if(!validCoords(lon,lat))throw Error('Invalid coordinates');
 const p=new URLSearchParams({latitude:lat.toFixed(3),longitude:lon.toFixed(3),timezone:'GMT'});
 if(kind==='weather'){p.set('current','temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m,cloud_cover,weather_code');p.set('hourly','temperature_2m,dew_point_2m,precipitation_probability,precipitation,wind_speed_10m,visibility,uv_index');p.set('forecast_days','3');p.set('past_days','1');}
 if(kind==='air')p.set('current','pm10,pm2_5,european_aqi,dust');
 if(kind==='marine')p.set('current','wave_height,wave_direction,wave_period');
 return p.toString();
}
export function model(raw){if(!raw?.current||!iso(raw.current.time))throw Error('Invalid model response');return raw;}
const memory=new Map(),inflight=new Map();
export async function fetchSource(key,query='',fetcher=globalThis.fetch){
 const s=SOURCES[key];if(!s)throw Error('Unknown source');
 const id=key+'?'+query,old=memory.get(id),now=Date.now();
 if(old&&now-old.retrieved<s.ttl)return {...old,state:'cached'};
 if(inflight.has(id))return inflight.get(id);
 const task=(async()=>{try{
 const url=weatherKinds.includes(key)?weatherEndpoint(key):s.url;
 const res=await fetcher(url+(query?(url.includes('?')?'&':'?')+query:''),{signal:AbortSignal.timeout(18000),credentials:'omit',referrerPolicy:'no-referrer'});
 if(!res.ok)throw Error('HTTP '+res.status);
 const raw=await res.json();
 const data=key==='earthquakes'?earthquakes(raw):key==='hazards'?hazards(raw):key==='space'?kp(raw):model(raw);
 const result={data,state:'available',retrieved:Date.now(),source:s.name,kind:s.kind};memory.set(id,result);if(memory.size>48)memory.delete(memory.keys().next().value);return result;
 }catch(e){return old?{...old,state:'stale',error:String(e.message)}:{data:null,state:'unavailable',retrieved:null,source:s.name,kind:s.kind,error:String(e.message)};}
 finally{inflight.delete(id);}})();
 inflight.set(id,task);return task;
}
export function distance(a,b){const r=Math.PI/180,dlat=(b.lat-a.lat)*r,dlon=(b.lon-a.lon)*r,x=Math.sin(dlat/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dlon/2)**2;return 6371.0088*2*Math.asin(Math.sqrt(Math.min(1,x)));}
export function eventsAt(events,at){return events.filter(e=>Date.parse(e.time)<=at);}
export function nearestHour(data,at){const hours=data?.hourly?.time;if(!hours?.length||!Number.isFinite(at))return null;let i=-1,best=Infinity;for(let j=0;j<hours.length;j++){const t=iso(hours[j]);if(!t)continue;const delta=Math.abs(Date.parse(t)-at);if(delta<best){best=delta;i=j;}}return i<0||best>1800000?null:{time:iso(hours[i]),values:Object.fromEntries(Object.entries(data.hourly).filter(([k,v])=>k!=='time'&&Array.isArray(v)).map(([k,v])=>[k,v[i]]))};}
export async function geocode(name,language='ar',fetcher=globalThis.fetch){
 if(COMMERCIAL)throw Error('Use licensed geocoding in commercial builds');
 const q=String(name).trim();if(q.length<2||q.length>80)throw Error('Invalid search term');
 const params=new URLSearchParams({name:q,count:'6',language:language==='ar'?'ar':'en',format:'json'});
 const r=await fetcher('https://geocoding-api.open-meteo.com/v1/search?'+params,{credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(18000)});
 if(!r.ok)throw Error('Geocode HTTP '+r.status);
 const d=await r.json();if(d.error)throw Error('Geocode API error');
 return (d.results||[]).filter(x=>validCoords(x.longitude,x.latitude)).map(x=>({name:String(x.name),country:String(x.country||x.country_code||''),admin:String(x.admin1||''),lon:x.longitude,lat:x.latitude}));
}
export function gibsTiles(day){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!iso(day+'T00:00:00Z')||day>new Date().toISOString().slice(0,10)||day<'2000-02-24')throw Error('Invalid imagery date');
 return ['https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/'+day+'/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg'];
}
