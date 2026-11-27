// A single metadata envelope for fetchSource adapters. Unknown source metadata stays null.
const isoDate=v=>{if(v==null)return null;const t=typeof v==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(v)?v+'Z':v;const d=new Date(t);return Number.isFinite(+d)?d.toISOString():null;};
export function dataEnvelope(key,spec,result,query=''){
 const d=result.data,params=new URLSearchParams(query),times=Array.isArray(d)?d.map(x=>isoDate(x.time)).filter(Boolean).sort():[];
 const byTime=d?.rows?.map(r=>r.time??r.date+'T00:00:00Z')??d?.hourly?.time??[];
 const kind=spec.kind,range=times.length?times:byTime.map(isoDate).filter(Boolean).sort();
 const n=(key)=>{const v=params.get(key);return v!==null&&v.trim()!==''&&Number.isFinite(+v)?+v:null;};
 const lat=n('latitude'),lon=n('longitude'),gridLat=d?.grid?.lat??d?.latitude??null,gridLon=d?.grid?.lon??d?.longitude??null;
 const valid=kind==='forecast'?isoDate(d?.current?.time):kind==='observed'||kind==='estimated'||kind==='reported'?times.at(-1)??null:null;
 return {schemaVersion:'1.0',product:key,provider:spec.name,kind,sourceUrl:spec.url,docs:spec.docs,retrievedAt:isoDate(result.retrieved),observationTime:kind==='observed'?valid:null,validTime:valid,issueTime: null,timeRange:{start:range[0]??null,end:range.at(-1)??null},requestedLocation:lat!==null&&lon!==null?{lat,lon}:null,gridLocation:Number.isFinite(gridLat)&&Number.isFinite(gridLon)?{lat:gridLat,lon:gridLon}:null,spatialResolution:null,coverage:null,units:d?.units??d?.current_units??d?.daily_units??(key.startsWith('earthquakes')?{depth:'km',magnitude:'Mw or source-specific scale'}:key==='space'?{value:'Kp'}:key==='climate'?{temp:'°C',rain:'mm'}:null),state:result.state,uncertainty:null,expiresAt:Number.isFinite(result.retrieved)?isoDate(result.retrieved+spec.ttl):null};
}
export function attachEnvelope(key,spec,result,query=''){return {...result,envelope:dataEnvelope(key,spec,result,query)};}
