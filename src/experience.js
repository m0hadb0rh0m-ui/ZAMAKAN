const defaults={lang:'ar',theme:'auto',quality:'auto',view:'easy',base:'streets',units:'metric',motion:false,remember:true};
const key='zamakan.experience.v1', placesKey='zamakan.places.v1';
export function readPreferences(storage=globalThis.localStorage){
 try{const p=JSON.parse(storage.getItem(key)||'{}');return {
 ...defaults,lang:['ar','en'].includes(p.lang)?p.lang:defaults.lang,theme:['auto','light','dark'].includes(p.theme)?p.theme:defaults.theme,
 quality:['auto','save','high'].includes(p.quality)?p.quality:defaults.quality,view:p.view==='pro'?'pro':'easy',base:['streets','light','dark','satellite','hybrid','terrain','topographic'].includes(p.base)?p.base:'streets',
 units:p.units==='imperial'?'imperial':'metric',motion:p.motion===true,remember:p.remember!==false};}catch{return {...defaults};}
}
export function writePreferences(p,storage=globalThis.localStorage){try{storage.setItem(key,JSON.stringify(p));return true;}catch{return false;}}
export function readPlaces(storage=globalThis.localStorage){try{const a=JSON.parse(storage.getItem(placesKey)||'[]');return Array.isArray(a)?a.filter(p=>p&&typeof p.id==='string'&&typeof p.name==='string'&&Number.isFinite(p.lon)&&Math.abs(p.lon)<=180&&Number.isFinite(p.lat)&&Math.abs(p.lat)<=90).slice(0,100):[];}catch{return [];}}
export function savePlaces(a,storage=globalThis.localStorage){try{storage.setItem(placesKey,JSON.stringify(a.slice(0,100)));return true;}catch{return false;}}
export const placeId=({lon,lat})=>lat.toFixed(5)+','+lon.toFixed(5);
export function toggleSaved(a,position,name){const id=placeId(position);return a.some(p=>p.id===id)?a.filter(p=>p.id!==id):[{id,name:String(name||id).slice(0,160),lon:position.lon,lat:position.lat},...a].slice(0,100);}
export function availableModes(modes,key,isCommercialMode){return modes.filter(m=>!isCommercialMode(m)||Boolean(key));}
export function freshness(results){const list=Object.values(results).filter(Boolean),times=list.filter(x=>['available','cached'].includes(x.state)&&Number.isFinite(x.retrieved)).map(x=>x.retrieved);return {latest:times.length?Math.max(...times):null,available:list.some(x=>['available','cached'].includes(x.state)),degraded:list.some(x=>['stale','unavailable'].includes(x.state))};}
