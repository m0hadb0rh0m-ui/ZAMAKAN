import {COMMERCIAL} from './release-config.js';
import {validCoords} from './data.js';
import {MAPTILER_KEY} from './map-engine.js';
const photon='https://photon.komoot.io';
export function coordinateQuery(input){
 const q=String(input).trim().replace(/[٠-٩]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(c))).replace(/،/g,',');
 const m=q.match(/^(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)$/);
 if(!m)return null;
 const lat=Number(m[1]),lon=Number(m[2]);
 return validCoords(lon,lat)?{name:lat+', '+lon,lat,lon,type:'coordinate',source:'WGS84'}:null;
}
export function photonResults(raw){
 if(!Array.isArray(raw?.features))throw Error('Invalid geocoding response');
 return raw.features.flatMap(f=>{
  const [lon,lat]=f.geometry?.coordinates||[],p=f.properties||{};
  if(!validCoords(lon,lat))return [];
  const address=[p.street,p.housenumber].filter(Boolean).join(' ');
  const name=p.name||address||p.city||p.district||p.country;
  if(!name)return [];
  let type=p.type||'poi';
  if(p.housenumber)type='address';
  else if(p.osm_key==='highway'||type==='street')type='street';
  else if(['amenity','shop','tourism','leisure','office','craft','healthcare','building'].includes(p.osm_key)||type==='other')type='poi';
  return [{lon,lat,name:String(name),admin:[address!==name?address:null,p.district,p.city,p.county].filter((x,i,a)=>x&&x!==name&&a.indexOf(x)===i).join(' · '),country:String(p.country||''),type,source:'Photon / OpenStreetMap'}];
 });
}
export function maptilerResults(raw){
 if(!Array.isArray(raw?.features))throw Error('Invalid geocoding response');
 return raw.features.flatMap(f=>{
  const [lon,lat]=f.center||f.geometry?.coordinates||[];
  if(!validCoords(lon,lat)||!f.text&&!f.place_name)return [];
  return [{lon,lat,name:String(f.text||f.place_name),admin:String(f.place_name||''),type:f.place_type?.[0]||'poi',country:'',source:'MapTiler'}];
 });
}
export async function searchPlaces(query,{language='ar',position,signal,reverse=false,fetcher=globalThis.fetch,key=MAPTILER_KEY}={}){
 const q=String(query).trim();
 if(!reverse){const coordinate=coordinateQuery(q);if(coordinate)return [coordinate];if(q.length<3||q.length>120)return [];}
 else if(!position||!validCoords(position.lon,position.lat))throw Error('Invalid coordinates');
 const params=new URLSearchParams({limit:reverse?'1':'7'});
 // Photon does not support Arabic as a language selector at all deployments; default local names are used.
 let url;
 if(key){
  params.set('key',key);params.set('language',language);params.set('autocomplete',String(!reverse));
  if(!reverse&&position)params.set('proximity',position.lon+','+position.lat);
  url='https://api.maptiler.com/geocoding/'+(reverse?position.lon+','+position.lat:encodeURIComponent(q))+'.json';
 }else{
  if(COMMERCIAL)throw Error('Commercial geocoder requires an approved MapTiler client key');
  if(!reverse){params.set('q',q);if(position&&validCoords(position.lon,position.lat)){params.set('lon',position.lon.toFixed(3));params.set('lat',position.lat.toFixed(3));}}
  if(language==='en')params.set('lang','en');
  if(reverse){params.set('lon',position.lon);params.set('lat',position.lat);}
  url=photon+(reverse?'/reverse/':'/api/');
 }
 const timeout=AbortSignal.timeout(15000);
 const res=await fetcher(url+'?'+params,{signal:signal?AbortSignal.any([signal,timeout]):timeout,credentials:'omit'});
 if(!res.ok)throw Error('Geocoding HTTP '+res.status);
 return (key?maptilerResults:photonResults)(await res.json());
}
