// Keyless model snapshots produced from original GRIB data, never fabricated.
import {readFile,stat} from 'node:fs/promises';
import {resolve} from 'node:path';
const MODELS=['ifs','aifs-single','gfs','wave','cams'];
const SIZE=181*360, SIX_HOURS=6*3600000;
export function validateSnapshot(d,model){
 if(!d||d.version!==1||d.model!==model||!MODELS.includes(model)||!Number.isFinite(Date.parse(d.run))||d.grid?.width!==360||d.grid.height!==181||d.grid.spacing!==1||d.grid.north!==90||d.grid.west!==0||!Array.isArray(d.frames)||!d.frames.length||d.frames.length>40)throw Error('Invalid snapshot');
 let prior=0;
 for(const f of d.frames){const time=Date.parse(f.time);if(!Number.isFinite(time)||time<=prior||!f.fields||Object.keys(f.fields).length>30||Object.values(f.fields).some(a=>!Array.isArray(a)||a.length!==SIZE||a.some(v=>v!==null&&!Number.isFinite(v))))throw Error('Invalid frame');prior=time;}
 return d;
}
export function cells(f,lon,lat){
 const x=((Math.round(lon)%360)+360)%360,y=Math.max(0,Math.min(180,Math.round(90-lat))),i=y*360+x;
 const v=k=>f.fields[k]?.[i]??null, u=v('10u'),w=v('10v'),temp=v('2t'),dew=v('2d');
 const humidity=temp!==null&&dew!==null?Math.max(0,Math.min(100,100*Math.exp(17.625*dew/(243.04+dew)-17.625*temp/(243.04+temp)))):null;
 return {temperature_2m:temp,dew_point_2m:dew,relative_humidity_2m:humidity,surface_pressure:v('sp'),mean_sea_level_pressure:v('msl'),cloud_cover:v('tcc'),precipitation:v('tp'),wind_speed_10m:u!==null&&w!==null?3.6*Math.hypot(u,w):null,wind_direction_10m:u!==null&&w!==null&&Math.hypot(u,w)>0?(Math.atan2(-u,-w)*180/Math.PI+360)%360:null,wave_height:v('swh'),wave_direction:v('mwd'),wave_period:v('mwp'),pm10:v('pm10'),pm2_5:v('pm2_5'),dust:v('dust')};
}
const UNITS={temperature_2m:'°C',dew_point_2m:'°C',relative_humidity_2m:'%',surface_pressure:'hPa',mean_sea_level_pressure:'hPa',cloud_cover:'%',precipitation:'mm / model interval',wind_speed_10m:'km/h',wind_direction_10m:'°',wave_height:'m',wave_direction:'°',wave_period:'s',pm10:'µg/m³',pm2_5:'µg/m³',dust:'µg/m³'};
export function modelResponse(d,query,now=Date.now()){
 const lats=query.get('latitude').split(',').map(Number),lons=query.get('longitude').split(',').map(Number);
 const currentKeys=query.get('current').split(','),hourlyKeys=(query.get('hourly')||'').split(',').filter(Boolean);
 const frame=d.frames.reduce((a,b)=>Math.abs(Date.parse(b.time)-now)<Math.abs(Date.parse(a.time)-now)?b:a);
 if(Math.abs(Date.parse(frame.time)-now)>12*3600000)throw Error('Stale forecast');
 const select=(f,lon,lat,keys)=>{const vals=cells(f,lon,lat);return Object.fromEntries(keys.map(k=>[k,vals[k]??null]));};
 const units=keys=>Object.fromEntries(keys.flatMap(k=>UNITS[k]?[[k,UNITS[k]]]:[]));
 const rows=lats.map((lat,i)=>{
  const lon=lons[i],current=select(frame,lon,lat,currentKeys);
  const item={latitude:Math.round(lat),longitude:((Math.round(lon)+180)%360+360)%360-180,current:{time:frame.time,...current},current_units:units(currentKeys),source:d.source,model:d.model,model_run:d.run};
  if(hourlyKeys.length)item.hourly={time:d.frames.map(f=>f.time),...Object.fromEntries(hourlyKeys.map(k=>[k,d.frames.map(f=>select(f,lon,lat,[k])[k])]))},item.hourly_units=units(hourlyKeys);
  return item;
 });
 return rows.length===1?rows[0]:rows;
}
export function createSnapshotStore(env=process.env){
 const dir=env.WEATHER_DATA_DIR,cache=new Map(),pending=new Map();
 async function load(model){
  if(!dir||!MODELS.includes(model))throw Error('Open model data not configured');
  const path=resolve(dir,model+'.json'),info=await stat(path);
  if(info.size>100_000_000)throw Error('Snapshot exceeds limit');
  const old=cache.get(model);
  if(old?.mtime===info.mtimeMs)return old.data;
  if(pending.has(model))return pending.get(model);
  const work=(async()=>{const data=validateSnapshot(JSON.parse(await readFile(path,'utf8')),model);cache.set(model,{mtime:info.mtimeMs,data});return data;})();
  pending.set(model,work);try{return await work;}finally{pending.delete(model);}
 }
 function fresh(d){return Date.now()-Date.parse(d.run)<30*3600000&&Date.parse(d.run)<=Date.now()+SIX_HOURS&&Date.parse(d.frames.at(-1).time)>=Date.now();}
 async function get(kind,model){
  for(const id of model?[model]:kind==='weather'?['ifs','gfs']:kind==='marine'?['wave']:['cams']){
   try{const d=await load(id);if(fresh(d))return d;}catch{}
  }
  throw Error('No fresh model snapshot');
 }
 return {get};
}
