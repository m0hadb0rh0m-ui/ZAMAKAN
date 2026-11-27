import {iso} from './data.js';
import {json2satrec} from 'satellite.js';
export const SPACE_FEEDS={
 wind:{url:'https://services.swpc.noaa.gov/json/rtsw/rtsw_wind_1m.json',fields:[['proton_speed','km/s'],['proton_density','cm⁻³'],['proton_temperature','K']],ttl:120000},
 mag:{url:'https://services.swpc.noaa.gov/json/rtsw/rtsw_mag_1m.json',fields:[['bt','nT'],['bz_gsm','nT']],ttl:120000},
 xray:{url:'https://services.swpc.noaa.gov/json/goes/primary/xrays-6-hour.json',fields:[['flux','W/m²']],ttl:120000}
};
export function parseSpaceFeed(raw,type){
 const desc=SPACE_FEEDS[type];if(!desc||!Array.isArray(raw))throw Error('Invalid NOAA feed');
 const rows=raw.filter(r=>r&&typeof r==='object'&&(type==='xray'?r.energy==='0.1-0.8nm'||r.energy==='0.1-0.8 nm':r.active===true)).flatMap(r=>{
  const time=iso(r.time_tag);if(!time)return [];
  const values=Object.fromEntries(desc.fields.filter(([k])=>Number.isFinite(r[k])).map(([k,u])=>[k,{value:r[k],unit:u}]));
  return Object.keys(values).length?[{time,values,source:String(r.source??r.satellite??'NOAA').slice(0,80)}]:[];
 }).sort((a,b)=>Date.parse(a.time)-Date.parse(b.time));
 if(!rows.length)throw Error('No valid NOAA records');
 return rows.slice(-180);
}
const cache=new Map(),requests=new Map();
export async function fetchSpace(type,fetcher=globalThis.fetch){
 const conf=SPACE_FEEDS[type],old=cache.get(type);if(!conf)throw Error('Unknown space feed');
 if(old&&Date.now()-old.retrieved<conf.ttl)return {...old,status:'cached'};
 if(requests.has(type))return requests.get(type);
 const task=(async()=>{try{const r=await fetcher(conf.url,{signal:AbortSignal.timeout(15000),credentials:'omit',referrerPolicy:'no-referrer'});if(!r.ok)throw Error('HTTP '+r.status);const rows=parseSpaceFeed(await r.json(),type),data={rows,retrieved:Date.now(),status:'available'};cache.set(type,data);return data;}catch{return old?{...old,status:'stale'}:{rows:[],retrieved:null,status:'unavailable'};}finally{requests.delete(type);}})();
 requests.set(type,task);return task;
}
export const CIVIL_SATELLITES=[['25544','ISS'],['25994','Terra'],['27424','Aqua'],['43013','NOAA-20'],['54234','NOAA-21']];
export function parseOMM(raw,id){
 const v=Array.isArray(raw)?raw.find(r=>String(r.NORAD_CAT_ID)===String(id)):null;
 if(!v||!CIVIL_SATELLITES.some(([n])=>n===String(id))||v.TIME_SYSTEM&&v.TIME_SYSTEM!=='UTC'||v.MEAN_ELEMENT_THEORY&&v.MEAN_ELEMENT_THEORY!=='SGP4')throw Error('Invalid or unsupported OMM record');
 const epoch=Date.parse(iso(v.EPOCH));if(!Number.isFinite(epoch)||Math.abs(Date.now()-epoch)>7*86400000)throw Error('Stale or invalid orbital epoch');
 const required=['MEAN_MOTION','ECCENTRICITY','INCLINATION','RA_OF_ASC_NODE','ARG_OF_PERICENTER','MEAN_ANOMALY','BSTAR','MEAN_MOTION_DOT','MEAN_MOTION_DDOT'];
 if(required.some(k=>v[k]===null||v[k]===''||!Number.isFinite(Number(v[k]))))throw Error('Invalid orbital elements');
 const sat=json2satrec({...v,EPOCH:iso(v.EPOCH)});if(sat.error||!Number.isFinite(sat.no)||sat.no<=0)throw Error('SGP4 initialization failed');
 return {sat,epoch,name:CIVIL_SATELLITES.find(([n])=>n===String(id))[1]};
}
const orbitCache=new Map(),orbitRequests=new Map();
export async function fetchCivilOrbit(id,fetcher=globalThis.fetch){
 if(!CIVIL_SATELLITES.some(([n])=>n===id))throw Error('Unknown civil satellite');
 const old=orbitCache.get(id);
 if(old&&Date.now()-old.retrieved<7200000)return old;
 if(orbitRequests.has(id))return orbitRequests.get(id);
 const task=(async()=>{try{const r=await fetcher('https://celestrak.org/NORAD/elements/gp.php?'+new URLSearchParams({CATNR:id,FORMAT:'JSON'}),{signal:AbortSignal.timeout(15000),credentials:'omit',referrerPolicy:'no-referrer'});if(!r.ok)throw Error('CelesTrak HTTP '+r.status);const record=parseOMM(await r.json(),id),result={record,retrieved:Date.now()};orbitCache.set(id,result);return result;}finally{orbitRequests.delete(id);}})();
 orbitRequests.set(id,task);return task;
}
