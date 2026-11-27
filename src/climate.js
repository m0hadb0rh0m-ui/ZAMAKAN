// ERA5 reanalysis via Open-Meteo. Missing days remain null; never synthesize data.
import {validCoords} from './data.js';
export const CLIMATE_DOC='https://open-meteo.com/en/docs/historical-weather-api';
const DAY=86400000;
export function dateRange(start,end,now=Date.now()){
 const parse=s=>{if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))throw Error('Invalid UTC date');const t=Date.parse(s+'T00:00:00Z');if(!Number.isFinite(t)||new Date(t).toISOString().slice(0,10)!==s)throw Error('Invalid UTC date');return t;};
 const a=parse(start),b=parse(end);
 if(a<Date.UTC(1940,0,1)||b>=Math.floor(now/DAY)*DAY||b<a||b-a>366*DAY*10)throw Error('ERA5 range: 1940 to yesterday, maximum 10 years per request');
 return Array.from({length:Math.round((b-a)/DAY)+1},(_,i)=>new Date(a+i*DAY).toISOString().slice(0,10));
}
export function climateQuery(lon,lat,start,end){
 if(!validCoords(lon,lat))throw Error('Invalid coordinates');dateRange(start,end);
 return new URLSearchParams({latitude:lat.toFixed(3),longitude:lon.toFixed(3),start_date:start,end_date:end,daily:'temperature_2m_mean,precipitation_sum',models:'era5',timezone:'GMT',temperature_unit:'celsius',precipitation_unit:'mm'}).toString();
}
export function decodeClimate(raw,start,end){
 const dates=dateRange(start,end),d=raw?.daily,u=raw?.daily_units;
 if(!d||!Array.isArray(d.time)||d.time.length>dates.length||u?.temperature_2m_mean!=='°C'||u?.precipitation_sum!=='mm'||![d.temperature_2m_mean,d.precipitation_sum].every(x=>Array.isArray(x)&&x.length===d.time.length))throw Error('Invalid ERA5 schema or units');
 const allowed=new Set(dates),by=new Map();
 for(let i=0;i<d.time.length;i++){const t=d.time[i];if(!allowed.has(t)||by.has(t))throw Error('Unexpected or duplicate ERA5 date');const temp=d.temperature_2m_mean[i],rain=d.precipitation_sum[i];by.set(t,{date:t,temp:Number.isFinite(temp)?temp:null,rain:Number.isFinite(rain)&&rain>=0?rain:null});}
 return {rows:dates.map(date=>by.get(date)||{date,temp:null,rain:null}),grid:{lat:raw.latitude??null,lon:raw.longitude??null,elevation:raw.elevation??null}};
}
export function climateStats(rows){
 const t=rows.map(x=>x.temp).filter(Number.isFinite),p=rows.map(x=>x.rain).filter(Number.isFinite);
 return {days:rows.length,validTemp:t.length,validRain:p.length,meanTemp:t.length?t.reduce((a,b)=>a+b,0)/t.length:null,totalRain:p.length===rows.length&&p.length?p.reduce((a,b)=>a+b,0):null};
}
export function compareClimate(target,baseline){
 const a=climateStats(target),b=climateStats(baseline);
 // Compare full, seasonally aligned windows only. Leap-day mismatches cannot silently bias rainfall totals.
 const season=x=>x.map(r=>r.date.slice(5)).join(',');
 const aligned=season(target)===season(baseline);
 const temperature=aligned&&a.validTemp===a.days&&b.validTemp===b.days&&a.days&&b.days?a.meanTemp-b.meanTemp:null;
 return {target:a,baseline:b,aligned,temperature,precipitation:aligned&&a.totalRain!==null&&b.totalRain!==null?a.totalRain-b.totalRain:null};
}
export function climateCSV(rows){return 'date_utc,temperature_2m_mean_C,precipitation_sum_mm,source,kind\n'+rows.map(r=>[r.date,r.temp??'',r.rain??'','ERA5 via Open-Meteo','reanalysis'].join(',')).join('\n')+'\n';}
