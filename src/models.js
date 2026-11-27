import {iso} from './data.js';
export const MODEL_IDS=[['ecmwf_ifs025','ECMWF IFS'],['ncep_gfs_global','NOAA GFS'],['icon_global','DWD ICON']];
export const MODEL_FIELDS=[['temperature_2m','°C'],['wind_speed_10m','km/h'],['precipitation','mm'],['surface_pressure','hPa']];
export function compareModels(rows,at,hours=24){
 const first=Math.floor(at/3600000)*3600000;
 if(!Number.isFinite(first)||!Number.isInteger(hours)||hours<1||hours>48)throw Error('Invalid model comparison window');
 const time=Array.from({length:hours},(_,i)=>new Date(first+i*3600000).toISOString());
 const series=rows.map(({id,name,result})=>{
  const h=result?.data?.hourly,units=result?.data?.hourly_units;
  const index=new Map((h?.time||[]).map((t,i)=>[iso(t),i]));
  const fields=Object.fromEntries(MODEL_FIELDS.map(([k,u])=>[k,time.map(t=>{
   const value=h?.[k]?.[index.get(t)];return units?.[k]===u&&Number.isFinite(value)?value:null;
  })]));
  return {id,name,state:result?.state||'unavailable',retrieved:result?.retrieved||null,fields};
 });
 const spread=Object.fromEntries(MODEL_FIELDS.map(([k])=>[k,time.map((_,i)=>{const v=series.map(s=>s.fields[k][i]).filter(Number.isFinite);return v.length>1?Math.max(...v)-Math.min(...v):null;})]));
 return {time,series,spread};
}
export function comparisonCSV(data){
 return ['utc,model,state,temperature_c,wind_kmh,precipitation_mm,pressure_hpa',...data.time.flatMap((t,i)=>data.series.map(s=>[t,s.id,s.state,...MODEL_FIELDS.map(([k])=>s.fields[k][i]??'')].join(',')))].join('\n');
}
