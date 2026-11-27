import {validCoords} from './data.js';
export const NYC_SOURCE='https://data.cityofnewyork.us/City-Government/BUILDING/5zhs-2jue';
export const inNYC=(lon,lat)=>validCoords(lon,lat)&&lon>=-74.26&&lon<=-73.69&&lat>=40.48&&lat<=40.93;
export function municipalHeight(rows){
 if(!Array.isArray(rows))throw Error('Invalid municipal response');
 // Do not choose among multiple pieces or overlapping structures, or placeholders.
 if(rows.length!==1)return null;
 const r=rows[0],feet=Number(r.height_roof),id=String(r.doitt_id||'');
 if(!/^\d+$/.test(id)||String(r.feature_code)!=='2100'||!Number.isFinite(feet)||feet<=0||feet>4922)return null;
 return {kind:'municipal-record',meters:feet*.3048,source:'NYC OTI Building Footprints · '+String(r.geom_source||'method not specified').slice(0,100),recordId:id,edited:r.last_edited_date||null,sourceRecords:'https://data.cityofnewyork.us/resource/5zhs-2jue.json?doitt_id='+encodeURIComponent(id),independentlyVerified:false};
}
export async function lookupMunicipalHeight(lon,lat,{signal,fetcher=globalThis.fetch}={}){
 if(!inNYC(lon,lat))return null;
 const query=new URLSearchParams({'$where':"intersects(the_geom, 'POINT ("+lon.toFixed(6)+' '+lat.toFixed(6)+")')",'$select':'doitt_id,bin,height_roof,geom_source,feature_code,last_edited_date,name','$limit':'5'});
 const timeout=AbortSignal.timeout(12000);
 const r=await fetcher('https://data.cityofnewyork.us/resource/5zhs-2jue.json?'+query,{signal:signal?AbortSignal.any([signal,timeout]):timeout,credentials:'omit'});
 if(!r.ok)throw Error('Municipal source unavailable');
 return municipalHeight(await r.json());
}
