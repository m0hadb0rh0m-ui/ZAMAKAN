import {weatherEndpoint} from './release-config.js';
import {SOURCES,validCoords} from './data.js';
export const WEATHER_FIELDS={
 temperature_2m:{unit:'°C',stops:[[-20,'#3965bc'],[0,'#70b8df'],[15,'#65b988'],[25,'#e9ba54'],[40,'#d8564e']]},
 cloud_cover:{unit:'%',stops:[[0,'#a5d7e5'],[25,'#76a3cc'],[50,'#a0a9b5'],[75,'#66768b'],[100,'#35445c']]},
 precipitation:{unit:'mm',stops:[[0,'#a5bfb5'],[1,'#69b5d1'],[3,'#2f80c4'],[10,'#7656ad']]},
 wind_speed_10m:{unit:'km/h',stops:[[0,'#9bd0b2'],[15,'#65bd92'],[30,'#d7b54c'],[50,'#d66c40'],[85,'#c83e5a']]},
 surface_pressure:{unit:'hPa',stops:[[950,'#8449b0'],[990,'#6b9ed0'],[1010,'#6fbca7'],[1030,'#eabb65'],[1060,'#c96a45']]}
};
export function sampleGrid(bounds,n=3){
 // Sample at actual requested coordinates, not generated measurements.
 const east=bounds.getEast(),west=bounds.getWest(),south=Math.max(-80,bounds.getSouth()),north=Math.min(80,bounds.getNorth());
 if(n<2||n>5||!Number.isInteger(n))throw Error('Invalid grid resolution');
 if(![east,west,south,north].every(Number.isFinite)||south>=north||east<=west||east-west>45||north-south>45)throw Error('Zoom in to a regional viewport');
 const pts=[];
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const lat=south+(north-south)*(y+.5)/n,lon=((west+(east-west)*(x+.5)/n+540)%360)-180;
  if(validCoords(lon,lat))pts.push({lon,lat});
 }
 return pts;
}
export function weatherFeatures(raw){
 const rows=Array.isArray(raw)?raw:[raw];
 return rows.flatMap(r=>{
  if(!validCoords(r.longitude,r.latitude)||!r.current?.time)return [];
  const values=Object.fromEntries(Object.keys(WEATHER_FIELDS).filter(k=>typeof r.current[k]==='number'&&Number.isFinite(r.current[k])).map(k=>[k,r.current[k]]));
  return [{type:'Feature',geometry:{type:'Point',coordinates:[r.longitude,r.latitude]},properties:{...values,time:r.current.time,source:r.source||'Open-Meteo',model:r.model||''}}];
 });
}
export async function fetchWeatherGrid(points,signal,fetcher=globalThis.fetch){
 if(!points.length||points.length>25||points.some(p=>!validCoords(p.lon,p.lat)))throw Error('Invalid weather sample grid');
 const query=new URLSearchParams({latitude:points.map(p=>p.lat.toFixed(3)).join(','),longitude:points.map(p=>p.lon.toFixed(3)).join(','),current:Object.keys(WEATHER_FIELDS).join(','),timezone:'GMT',cell_selection:'nearest'});
 const timeout=AbortSignal.timeout(18000);
 const res=await fetcher(weatherEndpoint('weather')+'?'+query,{signal:signal?AbortSignal.any([signal,timeout]):timeout,credentials:'omit'});
 if(!res.ok)throw Error('Weather grid HTTP '+res.status);
 const features=weatherFeatures(await res.json());
 return {type:'FeatureCollection',features};
}
export function renderWeatherLayer(map,data,field){
 if(map.getLayer('z-weather-grid'))map.removeLayer('z-weather-grid');
 if(map.getLayer('z-weather-labels'))map.removeLayer('z-weather-labels');
 if(!data||!WEATHER_FIELDS[field]){if(map.getSource('z-weather'))map.removeSource('z-weather');return;}
 if(!map.getSource('z-weather'))map.addSource('z-weather',{type:'geojson',data,attribution:(data.features[0]?.properties.source||'Weather model')+' · regional interpolation'});
 else map.getSource('z-weather').setData(data);
 const conf=WEATHER_FIELDS[field];
 map.addLayer({id:'z-weather-grid',type:'circle',source:'z-weather',filter:['has',field],paint:{'circle-radius':23,'circle-color':['interpolate',['linear'],['get',field],...conf.stops.flat()],'circle-stroke-color':'#fff','circle-stroke-width':2,'circle-opacity':0.9}});
 if(map.getStyle().glyphs)map.addLayer({id:'z-weather-labels',type:'symbol',source:'z-weather',filter:['has',field],layout:{'text-field':['concat',['to-string',['round',['get',field]]],' ',conf.unit],'text-font':['Noto Sans Regular'],'text-size':11,'text-allow-overlap':true},paint:{'text-color':'#172437','text-halo-color':'#fff','text-halo-width':1}});
}
