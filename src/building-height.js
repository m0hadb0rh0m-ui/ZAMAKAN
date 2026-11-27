import {COMMERCIAL} from './release-config.js';
import {lookupMunicipalHeight} from './municipal-height.js';
import {validCoords} from './data.js';
// Explicit OSM height tags are recorded claims, not proof of a survey.
export function parseHeight(value){
 if(typeof value!=='string'&&typeof value!=='number')return null;
 const s=String(value).trim();
 let m=s.match(/^(\d+(?:\.\d+)?)\s*(m|metres?|meters?|ft|feet|')?$/i);
 let v;
 if(m)v=Number(m[1])*(/^(ft|feet|')$/i.test(m[2]||'') ? .3048 : 1);
 else {m=s.match(/^(\d+)\s*'\s*(\d+(?:\.\d+)?)\s*"?$/);if(m)v=Number(m[1])*.3048+Number(m[2])*.0254;}
 return Number.isFinite(v)&&v>0&&v<=1500?v:null;
}
export function classifyHeight(tags={},renderHeight=null){
 const h=parseHeight(tags.height),levels=/^\d+(?:\.\d+)?$/.test(String(tags['building:levels']??''))?Number(tags['building:levels']):null;
 const source=String(tags['source:height']||tags['height:source']||'').slice(0,200);
 if(h!==null)return {kind:'recorded',meters:h,source,independentlyVerified:false};
 if(levels!==null&&levels>0&&levels<=200)return {kind:'estimated-levels',meters:levels*3,levels,source:'3 m per level assumption',independentlyVerified:false};
 return {kind:Number.isFinite(renderHeight)&&renderHeight>0?'render-only':'unknown',meters:Number.isFinite(renderHeight)&&renderHeight>0?renderHeight:null,source:'',independentlyVerified:false};
}
export function containsPoint(ring,lon,lat){
 let inside=false;
 if(!Array.isArray(ring)||ring.length<4||ring.some(p=>!validCoords(p.lon,p.lat)))return false;
 if(ring[0].lon!==ring.at(-1).lon||ring[0].lat!==ring.at(-1).lat)return false;
 for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const a=ring[i],b=ring[j];
  if((a.lat>lat)!==(b.lat>lat)&&lon<(b.lon-a.lon)*(lat-a.lat)/(b.lat-a.lat)+a.lon)inside=!inside;
 }
 return inside;
}
export function matchBuilding(raw,lon,lat,renderHeight){
 if(!Array.isArray(raw?.elements))throw Error('Invalid Overpass payload');
 // Only complete closed ways, no guessed polygon from relation members/centers.
 // If a relation or several ways overlap, do not silently choose a building.
 const candidates=raw.elements.filter(e=>e.type==='way'&&e.tags?.building&&containsPoint(e.geometry,lon,lat));
 const possibleRelation=raw.elements.some(e=>{
  if(e.type!=='relation'||!e.tags?.building)return false;
  const b=e.bounds;
  return !b||![b.minlat,b.maxlat,b.minlon,b.maxlon].every(Number.isFinite)||(lat>=b.minlat&&lat<=b.maxlat&&lon>=b.minlon&&lon<=b.maxlon);
 });
 if(candidates.length!==1||possibleRelation)return {kind:'ambiguous',meters:null,independentlyVerified:false};
 const e=candidates[0];
 return {...classifyHeight(e.tags,renderHeight),osmId:e.id,osmType:'way',edited:e.timestamp||null,sourceRecords:'https://www.openstreetmap.org/way/'+e.id};
}
const cache=new Map();
export async function lookupHeight(lon,lat,renderHeight,{signal,fetcher=globalThis.fetch}={}){
 if(!validCoords(lon,lat))throw Error('Invalid coordinate');
 const key=lon.toFixed(5)+','+lat.toFixed(5),cached=cache.get(key);
 if(cached&&Date.now()-cached.at<600000)return cached.result;
 // Prefer a real municipal record within its geographic coverage.
 try{const municipal=await lookupMunicipalHeight(lon,lat,{signal,fetcher});if(municipal){if(cache.size>=50)cache.delete(cache.keys().next().value);cache.set(key,{at:Date.now(),result:municipal});return municipal;}}catch(e){if(signal?.aborted)throw e;}
 if(COMMERCIAL)return classifyHeight({},renderHeight);
 // Single explicitly requested building lookup. Not a bulk crawler.
 const query='[out:json][timeout:12][maxsize:16777216];(way(around:100,'+lat.toFixed(6)+','+lon.toFixed(6)+')[building];relation(around:100,'+lat.toFixed(6)+','+lon.toFixed(6)+')[building];);out meta geom;';
 const timeout=AbortSignal.timeout(15000);
 const res=await fetcher('https://overpass-api.de/api/interpreter?data='+encodeURIComponent(query),{signal:signal?AbortSignal.any([signal,timeout]):timeout,credentials:'omit'});
 if(!res.ok)throw Error('Height provider unavailable');
 const result=matchBuilding(await res.json(),lon,lat,renderHeight);
 if(cache.size>=50)cache.delete(cache.keys().next().value);
 cache.set(key,{at:Date.now(),result});return result;
}
