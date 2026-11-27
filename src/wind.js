// Regional 10m wind field: sampled from a named forecast model, not an observation.
import {iso,validCoords} from './data.js';
export const WIND_MODELS=['icon_global','ncep_gfs_global','ecmwf_ifs025'];
export function gridSpec(lon,lat,span=4,n=5){
 if(!validCoords(lon,lat)||!Number.isFinite(span)||span<1||span>12||!Number.isInteger(n)||n<3||n>7||Math.abs(lat)>75)throw Error('Regional grid: latitude ±75°, extent 1–12°, 3–7 nodes per axis');
 const west=Math.max(-179.9,Math.min(179.9-span,lon-span/2)),south=Math.max(-78,Math.min(78-span,lat-span/2));
 const step=span/(n-1),points=Array.from({length:n*n},(_,i)=>[west+(i%n)*step,south+Math.floor(i/n)*step]);
 return {west,south,span,step,n,points};
}
export function windRequest(grid,model,at){
 if(!WIND_MODELS.includes(model)||!Number.isFinite(at))throw Error('Invalid wind request');
 const day=new Date(at).toISOString().slice(0,10);
 return 'https://api.open-meteo.com/v1/forecast?'+new URLSearchParams({latitude:grid.points.map(p=>p[1].toFixed(3)).join(','),longitude:grid.points.map(p=>p[0].toFixed(3)).join(','),hourly:'wind_speed_10m,wind_direction_10m',wind_speed_unit:'ms',timezone:'GMT',models:model,start_date:day,end_date:day});
}
export function windVector(speed,direction){
 if(!Number.isFinite(speed)||speed<0||speed>150||!Number.isFinite(direction)||direction<0||direction>360)throw Error('Invalid model wind vector');
 const angle=direction*Math.PI/180;return [-speed*Math.sin(angle),-speed*Math.cos(angle)]; // meteorological FROM direction
}
export function decodeWindGrid(raw,grid,at,model){
 const hour=new Date(Math.floor(at/3600000)*3600000).toISOString();
 if(!Array.isArray(raw)||raw.length!==grid.points.length)throw Error('Incomplete model grid');
 const rows=raw.every(x=>Number.isInteger(x?.location_id))?raw.slice().sort((a,b)=>a.location_id-b.location_id):raw;
 const vectors=rows.map((r,j)=>{
  if(!validCoords(r.longitude,r.latitude)||Math.abs(r.latitude-grid.points[j][1])>1||Math.abs(r.longitude-grid.points[j][0])>1)throw Error('Unexpected model grid coordinate');
  if(r.hourly_units?.wind_speed_10m!=='m/s')throw Error('Unexpected wind units');
  const i=r.hourly?.time?.findIndex(t=>iso(t)===hour)??-1;if(i<0)throw Error('Selected hour unavailable');
  return windVector(r.hourly.wind_speed_10m?.[i],r.hourly.wind_direction_10m?.[i]);
 });
 return {...grid,vectors,hour,model};
}
export function interpolateWind(grid,lon,lat){
 const x=(lon-grid.west)/grid.step,y=(lat-grid.south)/grid.step;
 if(x<0||y<0||x>grid.n-1||y>grid.n-1)return null;
 const i=Math.min(grid.n-2,Math.floor(x)),j=Math.min(grid.n-2,Math.floor(y)),a=x-i,b=y-j,k=j*grid.n+i,v=grid.vectors;
 return [0,1].map(c=>(1-b)*((1-a)*v[k][c]+a*v[k+1][c])+b*((1-a)*v[k+grid.n][c]+a*v[k+grid.n+1][c]));
}
export function advect(lon,lat,vector,seconds){
 return [lon+vector[0]*seconds/(111320*Math.cos(lat*Math.PI/180)),lat+vector[1]*seconds/110574];
}
export function renderWind(map,grid){
 const canvas=document.createElement('canvas');canvas.className='wind-overlay';canvas.setAttribute('aria-hidden','true');map.getContainer().append(canvas);
 const ctx=canvas.getContext('2d');if(!ctx){canvas.remove();throw Error('Canvas unavailable');}
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),max=Math.min(420,Math.max(100,Math.round(map.getContainer().clientWidth/2)));
 const seed=()=>({lon:grid.west+Math.random()*grid.span,lat:grid.south+Math.random()*grid.span,age:Math.random()*110});
 const parts=Array.from({length:max},seed);let raf=0,last=0,closed=false,w=0,h=0;
 const clear=()=>ctx.clearRect(0,0,w,h);
 const resize=()=>{const d=Math.min(2,devicePixelRatio||1);w=canvas.clientWidth;h=canvas.clientHeight;canvas.width=Math.round(w*d);canvas.height=Math.round(h*d);ctx.setTransform(d,0,0,d,0,0);};
 resize();const observer=new ResizeObserver(resize);observer.observe(canvas);map.on('move',clear);
 function draw(now){
  if(closed)return;raf=requestAnimationFrame(draw);if(document.hidden||map.getProjection()?.type!=='mercator'){clear();return;}
  if(now-last<40)return;const dt=Math.min(0.1,(now-last)/1000);last=now;
  ctx.globalCompositeOperation='destination-out';ctx.fillStyle='rgba(0,0,0,.16)';ctx.fillRect(0,0,w,h);ctx.globalCompositeOperation='source-over';ctx.lineWidth=1.4;
  for(let i=0;i<parts.length;i++){let p=parts[i],v=interpolateWind(grid,p.lon,p.lat);if(!v||p.age++>125){parts[i]=seed();continue;}
   const next=advect(p.lon,p.lat,v,((reduced.matches||document.documentElement.classList.contains('reduced-motion'))?120:dt*1600));if(!interpolateWind(grid,...next)){parts[i]=seed();continue;}
   const a=map.project([p.lon,p.lat]),b=map.project(next);if(Math.abs(a.x-b.x)<w/2&&Math.abs(a.y-b.y)<h/2){const speed=Math.hypot(...v);ctx.strokeStyle=speed>15?'#ffd18c':speed>8?'#7ae3ff':'#8bf8db';ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
   if(!reduced.matches&&!document.documentElement.classList.contains('reduced-motion')){p.lon=next[0];p.lat=next[1];}
  }
 }
 raf=requestAnimationFrame(draw);
 return ()=>{closed=true;cancelAnimationFrame(raf);observer.disconnect();map.off('move',clear);canvas.remove();};
}
