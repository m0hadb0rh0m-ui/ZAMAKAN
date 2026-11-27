import {twoline2satrec,propagate,gstime,eciToGeodetic,degreesLat,degreesLong} from 'satellite.js';
import {validCoords,iso} from './data.js';

export function spectrum(samples, rate=1) {
  const n=samples.length;
  if(n<4||n>65536||(n&(n-1))||!samples.every(Number.isFinite)||!Number.isFinite(rate)||rate<=0) throw Error('FFT: 4–65536 finite samples, power of two, positive sample rate');
  const re=Float64Array.from(samples), im=new Float64Array(n);
  for(let i=1,j=0;i<n;i++){let bit=n>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;if(i<j)[re[i],re[j]]=[re[j],re[i]];}
  for(let len=2;len<=n;len*=2)for(let base=0;base<n;base+=len)for(let j=0;j<len/2;j++){
    const a=base+j,b=a+len/2,t=-2*Math.PI*j/len,c=Math.cos(t),s=Math.sin(t),r=re[b]*c-im[b]*s,k=re[b]*s+im[b]*c;
    re[b]=re[a]-r;im[b]=im[a]-k;re[a]+=r;im[a]+=k;
  }
  return Array.from({length:n/2+1},(_,i)=>({frequency:i*rate/n,amplitude:Math.hypot(re[i],im[i])*(i===0||i===n/2?1:2)/n}));
}
const checksum=s=>[...s.slice(0,68)].reduce((a,c)=>a+(c==='-'?1:/\d/.test(c)?Number(c):0),0)%10===Number(s[68]);
export function parseTLE(text){
  const lines=text.trim().split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  const a=lines.at(-2),b=lines.at(-1);
  if(lines.length<2||lines.length>3||a.length!==69||b.length!==69||!a.startsWith('1 ')||!b.startsWith('2 ')||a.slice(2,7)!==b.slice(2,7)||!checksum(a)||!checksum(b))throw Error('Invalid TLE or checksum');
  const sat=twoline2satrec(a,b);
  if(sat.error||!Number.isFinite(sat.jdsatepoch)||!Number.isFinite(sat.no)||sat.no<=0)throw Error('Invalid orbital elements');
  return {sat,name:lines.length===3?lines[0].slice(0,100):a.slice(2,7),epoch:(sat.jdsatepoch-2440587.5)*86400000};
}
export function orbitAt(record,time){
  const date=new Date(time);
  if(!Number.isFinite(+date)||Math.abs(+date-record.epoch)>7*86400000)throw Error('TLE outside ±7-day visualization window; obtain fresh elements');
  const p=propagate(record.sat,date);
  if(!p?.position||record.sat.error)throw Error('SGP4 propagation failed');
  const g=eciToGeodetic(p.position,gstime(date));
  const lon=degreesLong(g.longitude),lat=degreesLat(g.latitude);
  if(!validCoords(lon,lat)||!Number.isFinite(g.height)||g.height<0)throw Error('Invalid propagated position');
  return {lon,lat,height:g.height};
}
export function groundTrack(record,time){
  const features=[];let segment=[];
  for(let i=0;i<=120;i+=2){
    const p=orbitAt(record,time+i*60000);
    if(segment.length&&Math.abs(segment.at(-1)[0]-p.lon)>180){if(segment.length>1)features.push(segment);segment=[];}
    segment.push([p.lon,p.lat]);
  }
  if(segment.length>1)features.push(segment);
  return {type:'FeatureCollection',features:[...features.map(coordinates=>({type:'Feature',properties:{},geometry:{type:'LineString',coordinates}})),{type:'Feature',properties:{name:record.name},geometry:{type:'Point',coordinates:Object.values(orbitAt(record,time)).slice(0,2)}}]};
}
export function radarFrames(raw){
  if(raw?.host!=='https://tilecache.rainviewer.com'||!Array.isArray(raw.radar?.past))throw Error('Invalid RainViewer manifest');
  return raw.radar.past.filter(f=>Number.isSafeInteger(f.time)&&f.time>0&&/^\/v2\/radar\/\d+$/.test(f.path)).sort((a,b)=>a.time-b.time).slice(-12).map(f=>({time:f.time*1000,tile:raw.host+f.path+'/256/{z}/{x}/{y}/2/1_1.png'}));
}
export function buildings(raw){
  if(raw?.type!=='FeatureCollection'||!Array.isArray(raw.features)||!raw.features.length||raw.features.length>5000)throw Error('Expected 1–5000 GeoJSON building features');
  let count=0;
  const features=raw.features.map(f=>{
    const h=f.properties?.height, base=f.properties?.min_height??0,g=f.geometry;
    if(typeof h!=='number'||!Number.isFinite(h)||h<=0||h>1500||!Number.isFinite(base)||base<0||base>=h||!['Polygon','MultiPolygon'].includes(g?.type))throw Error('Each building needs a valid polygon and height in metres');
    const polygons=g.type==='Polygon'?[g.coordinates]:g.coordinates;
    if(!Array.isArray(polygons)||!polygons.length)throw Error('Invalid polygons');
    for(const poly of polygons){if(!Array.isArray(poly)||!poly.length)throw Error('Invalid rings');for(const ring of poly){if(!Array.isArray(ring)||ring.length<4)throw Error('Invalid ring');for(const c of ring){if(!Array.isArray(c)||c.length!==2||!validCoords(...c)||++count>100000)throw Error('Invalid or excessive coordinates');}if(ring[0].some((v,i)=>v!==ring.at(-1)[i]))throw Error('Unclosed ring');}}
    return {type:'Feature',geometry:g,properties:{height:h,base}};
  });
  return {type:'FeatureCollection',features};
}
export {parseCAP} from './cap.js';
