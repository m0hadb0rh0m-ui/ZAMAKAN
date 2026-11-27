import {intersect} from '@turf/intersect';
import {booleanValid} from '@turf/boolean-valid';
import {area} from '@turf/area';
import {distance,validCoords} from './data.js';
const ringCrossesDateline=r=>r.some((p,i)=>i>0&&Math.abs(p[0]-r[i-1][0])>180);
export function polygonIntersection(a,b){
 const check=f=>{if(!['Polygon','MultiPolygon'].includes(f?.geometry?.type)||!booleanValid(f))throw Error('Invalid polygon topology');const polys=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;let n=0;for(const p of polys)for(const r of p){if(ringCrossesDateline(r))throw Error('Dateline-crossing polygon not supported in planar overlay');n+=r.length;}if(n>5000)throw Error('Maximum 5000 vertices per polygon');};
 check(a);check(b);const geometry=intersect({type:'FeatureCollection',features:[a,b]});return {geometry,areaKm2:geometry?area(geometry)/1e6:0};
}
export function profilePoints(coords,max=60){
 if(!Array.isArray(coords)||coords.length<2||coords.length>5000||coords.some(p=>!validCoords(p?.[0],p?.[1])))throw Error('Invalid profile path');
 if(!Number.isInteger(max)||max<2||max>100)throw Error('Profile sample count must be 2–100');
 const points=coords.map(([lon,lat])=>({lon,lat})),lengths=[0];for(let i=1;i<points.length;i++)lengths.push(lengths.at(-1)+distance(points[i-1],points[i]));const total=lengths.at(-1);if(total===0)throw Error('Zero length path');
 let j=1;return Array.from({length:max},(_,i)=>{const d=i*total/(max-1);while(j<lengths.length-1&&lengths[j]<d)j++;const a=points[j-1],b=points[j],f=(d-lengths[j-1])/Math.max(lengths[j]-lengths[j-1],1e-12),dl=((b.lon-a.lon+540)%360)-180;return {lat:a.lat+(b.lat-a.lat)*f,lon:((a.lon+dl*f+540)%360)-180,distanceKm:d};});
}
export async function fetchElevationProfile(points,fetcher=fetch){
 const query=new URLSearchParams({latitude:points.map(p=>p.lat.toFixed(5)).join(','),longitude:points.map(p=>p.lon.toFixed(5)).join(',')});
 const r=await fetcher('https://api.open-meteo.com/v1/elevation?'+query,{signal:AbortSignal.timeout(15000),credentials:'omit',referrerPolicy:'no-referrer'});if(!r.ok)throw Error('Elevation HTTP '+r.status);
 const d=await r.json();if(!Array.isArray(d.elevation)||d.elevation.length!==points.length)throw Error('Invalid elevation response');return {source:'Copernicus DEM GLO-90 (2021) via Open-Meteo',resolutionM:90,retrieved:new Date().toISOString(),rows:points.map((p,i)=>({...p,elevationM:Number.isFinite(d.elevation[i])?d.elevation[i]:null}))};
}
