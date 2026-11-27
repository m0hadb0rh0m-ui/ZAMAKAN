// NOAA GEFS 0.25° members via Open-Meteo. Equal-weight empirical statistics,
// not calibrated probabilities or a guarantee of future conditions.
export function ensembleQuery(lon,lat){
 if(!Number.isFinite(lon)||!Number.isFinite(lat)||Math.abs(lon)>180||Math.abs(lat)>90)throw Error('Invalid coordinates');
 return new URLSearchParams({latitude:lat.toFixed(3),longitude:lon.toFixed(3),hourly:'temperature_2m,precipitation',models:'gfs025',forecast_days:'3',timezone:'GMT'}).toString();
}
const fields=['temperature_2m','precipitation'];
const memberKeys=v=>[v,...Array.from({length:30},(_,i)=>v+'_member'+String(i+1).padStart(2,'0'))];
export function percentile(values,p){
 if(!values.length)return null;
 const a=[...values].sort((x,y)=>x-y),i=(a.length-1)*p,j=Math.floor(i);
 return a[j]+(a[Math.min(j+1,a.length-1)]-a[j])*(i-j);
}
export function decodeEnsemble(raw){
 const h=raw?.hourly,t=h?.time,units=raw?.hourly_units;
 if(raw?.utc_offset_seconds!==0||!Array.isArray(t)||!t.length||t.length>72||units?.temperature_2m!=='°C'||units?.precipitation!=='mm')throw Error('Invalid GEFS response or units');
 if(!Number.isFinite(raw.latitude)||!Number.isFinite(raw.longitude)||Math.abs(raw.latitude)>90||Math.abs(raw.longitude)>180)throw Error('Invalid grid coordinates');
 if(t.some((x,i)=>typeof x!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(x)||!Number.isFinite(Date.parse(x+'Z'))||i&&Date.parse(x+'Z')<=Date.parse(t[i-1]+'Z')))throw Error('Invalid GEFS valid times');
 for(const v of fields)for(const k of memberKeys(v))if(h[k]!==undefined&&(!Array.isArray(h[k])||h[k].length!==t.length))throw Error('Invalid member series');
 const valid=(v,i)=>memberKeys(v).map(k=>h[k]?.[i]).filter(x=>Number.isFinite(x)&&(v!=='precipitation'||x>=0));
 const rows=t.map((time,i)=>{const a=valid(fields[0],i),b=valid(fields[1],i);return {time:time+'Z',temperatureMembers:a.length,precipitationMembers:b.length,p10:percentile(a,.1),median:percentile(a,.5),p90:percentile(a,.9),mean:a.length?a.reduce((s,x)=>s+x,0)/a.length:null,wetFraction:b.length?b.filter(x=>x>=1).length/b.length:null};});
 if(!rows.some(r=>r.temperatureMembers||r.precipitationMembers))throw Error('No valid GEFS members');
 return {model:'NOAA GEFS 0.25°',grid:{lat:raw.latitude,lon:raw.longitude},expectedMembers:31,units:{p10:'°C',median:'°C',p90:'°C',mean:'°C',wetFraction:'fraction (>=1 mm per API hour)'},rows};
}
export function ensembleCSV(data){return 'valid_utc,temperature_members,precipitation_members,p10_c,median_c,p90_c,mean_c,wet_fraction_ge_1mm\n'+data.rows.map(r=>[r.time,r.temperatureMembers,r.precipitationMembers,r.p10,r.median,r.p90,r.mean,r.wetFraction].map(x=>x??'').join(',')).join('\n');}
