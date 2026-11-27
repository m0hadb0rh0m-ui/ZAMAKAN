// Only explicit opt-in snapshots are supplied to the local model, never files or user location.
const WEATHER=['temperature_2m','relative_humidity_2m','surface_pressure','wind_speed_10m','wind_direction_10m','precipitation','cloud_cover'];
export function aiSnapshot(results){
 const r=results?.weather,c=r?.data?.current,u=r?.data?.current_units||{};
 const result={};
 if(c&&['available','cached','stale'].includes(r.state)){
  result.weather={state:r.state,retrieved:r.retrieved,time:typeof c.time==='string'?c.time.slice(0,40):null,source:'Open-Meteo model (not station measurement)',values:Object.fromEntries(WEATHER.filter(k=>Number.isFinite(c[k])).map(k=>[k,{value:c[k],unit:typeof u[k]==='string'?u[k].slice(0,15):''}]))};
 }
 const space=results?.space,last=space?.data?.at?.(-1);
 if(last&&Number.isFinite(last.value)&&['available','cached','stale'].includes(space.state))result.space={state:space.state,retrieved:space.retrieved,time:last.time,source:'NOAA SWPC estimated Kp',kp:last.value};
 return result;
}
export function validateSnapshot(input){
 if(!input||typeof input!=='object'||Array.isArray(input))return {};
 const result={};
 const status=x=>['available','cached','stale'].includes(x);
 const timestamp=x=>typeof x==='string'&&x.length<=40&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(x)?x:null;
 const retrieved=x=>Number.isFinite(x)&&x>0?x:null;
 const w=input.weather;
 if(w&&status(w.state)){
  const values={};
  for(const k of WEATHER){const v=w.values?.[k];if(Number.isFinite(v?.value)&&Math.abs(v.value)<1000000)values[k]={value:v.value,unit:({temperature_2m:'°C',relative_humidity_2m:'%',surface_pressure:'hPa',wind_speed_10m:'km/h',wind_direction_10m:'°',precipitation:'mm',cloud_cover:'%'})[k]};}
  result.weather={source:'Open-Meteo model, not station observation',state:w.state,time:timestamp(w.time),retrieved:retrieved(w.retrieved),values};
 }
 const s=input.space;
 if(s&&status(s.state)&&Number.isFinite(s.kp)&&s.kp>=0&&s.kp<=9)result.space={source:'NOAA SWPC estimated Kp',state:s.state,time:timestamp(s.time),retrieved:retrieved(s.retrieved),kp:s.kp};
 return result;
}
