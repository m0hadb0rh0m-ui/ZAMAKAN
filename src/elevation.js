// Bounded great-circle profile, using a fixed provider and no extrapolated observations.
const rad=Math.PI/180,deg=180/Math.PI;
const valid=p=>p&&Number.isFinite(p.lat)&&Math.abs(p.lat)<=90&&Number.isFinite(p.lon)&&Math.abs(p.lon)<=180;
export function profilePoints(a,b,n=25){
 if(!valid(a)||!valid(b)||!Number.isInteger(n)||n<2||n>100)throw Error('Invalid profile coordinates');
 const vec=p=>[Math.cos(p.lat*rad)*Math.cos(p.lon*rad),Math.cos(p.lat*rad)*Math.sin(p.lon*rad),Math.sin(p.lat*rad)];
 const u=vec(a),v=vec(b),theta=Math.acos(Math.max(-1,Math.min(1,u.reduce((sum,x,i)=>sum+x*v[i],0)))),km=theta*6371.0088;
 if(km<0.001||km>200)throw Error('Profile distance must be 1 m–200 km');
 return {km,points:Array.from({length:n},(_,i)=>{const t=i/(n-1),x=Math.sin((1-t)*theta)/Math.sin(theta),y=Math.sin(t*theta)/Math.sin(theta),[j,k,l]=u.map((q,z)=>q*x+v[z]*y);return {lat:Math.atan2(l,Math.hypot(j,k))*deg,lon:Math.atan2(k,j)*deg};})};
}
export async function elevationProfile(a,b,fetcher=fetch){
 const {km,points}=profilePoints(a,b);
 const url=new URL('https://elevation-api.open-meteo.com/v1/elevation');
 url.searchParams.set('latitude',points.map(p=>p.lat.toFixed(6)).join(','));
 url.searchParams.set('longitude',points.map(p=>p.lon.toFixed(6)).join(','));
 const r=await fetcher(url,{credentials:'omit',signal:AbortSignal.timeout(12000)});
 if(!r.ok)throw Error('Elevation source unavailable');
 const data=await r.json(),values=data.elevation;
 if(!Array.isArray(values)||values.length!==points.length||values.some(v=>!Number.isFinite(v)))throw Error('Incomplete elevation data');
 return {km,values,points,retrieved:new Date().toISOString(),source:'Open-Meteo / Copernicus DEM GLO-90'};
}
