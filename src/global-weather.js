import {surfaceColor} from './weather-surface.js';
const fieldKey={temperature_2m:'2t',cloud_cover:'tcc',precipitation:'tp',surface_pressure:'sp',mean_sea_level_pressure:'msl'};
const ID='z-global-weather';
const wrap=x=>((x%360)+360)%360;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function validateGlobal(d){
 if(!['ifs','aifs-single','gfs'].includes(d?.model)||!Number.isFinite(Date.parse(d.run))||!Number.isFinite(Date.parse(d.frame?.time))||d.grid?.width!==360||d.grid?.height!==181||d.grid?.spacing!==1||d.grid?.north!==90||d.grid?.west!==0||!d.frame?.fields)throw Error('Invalid forecast');
 return d;
}
export function gridValue(data,key,lon,lat){
 const a=data?.frame?.fields?.[key];if(!a||a.length!==65160)return null;
 const x=wrap(lon),y=clamp(90-lat,0,180),i=Math.floor(x),j=Math.floor(y),fx=x-i,fy=y-j;
 const values=[a[j*360+i],a[j*360+wrap(i+1)],a[Math.min(j+1,180)*360+i],a[Math.min(j+1,180)*360+wrap(i+1)]];
 if(!values.every(Number.isFinite))return null;
 return (values[0]*(1-fx)+values[1]*fx)*(1-fy)+(values[2]*(1-fx)+values[3]*fx)*fy;
}
export function forecastValue(data,field,lon,lat){
 if(field==='wind_speed_10m'){const u=gridValue(data,'10u',lon,lat),v=gridValue(data,'10v',lon,lat);return u===null||v===null?null:Math.hypot(u,v)*3.6;}
 return gridValue(data,fieldKey[field],lon,lat);
}
export function clearGlobal(map){
 for(const suffix of ['-west','-east']){const id=ID+suffix;if(map.getLayer(id))map.removeLayer(id);if(map.getSource(id))map.removeSource(id);}
}
const inverseMercator=y=>Math.atan(Math.sinh(y))*180/Math.PI;
export function renderGlobal(map,data,field){
 clearGlobal(map);if(!data)return false;
 const key=fieldKey[field];if(key&&!data.frame.fields[key]||field==='wind_speed_10m'&&(!data.frame.fields['10u']||!data.frame.fields['10v']))return false;
 // Two images avoid a 360° antimeridian wrap. Mercator texture; GPU raster rendering.
 for(const [suffix,west,east] of [['-west',-180,0],['-east',0,180]]){
  const canvas=document.createElement('canvas');canvas.width=360;canvas.height=512;
  const ctx=canvas.getContext('2d'),image=ctx.createImageData(canvas.width,canvas.height);
  for(let y=0;y<canvas.height;y++){const lat=inverseMercator(Math.PI*(1-2*(y+.5)/canvas.height));
   for(let x=0;x<canvas.width;x++){const v=forecastValue(data,field,west+(east-west)*(x+.5)/canvas.width,lat);if(v!==null)image.data.set([...surfaceColor(field,v),205],(y*canvas.width+x)*4);}}
  ctx.putImageData(image,0,0);const id=ID+suffix,n=inverseMercator(Math.PI);
  map.addSource(id,{type:'image',coordinates:[[west,n],[east,n],[east,-n],[west,-n]],attribution:data.model==='gfs'?'NOAA GFS forecast':'ECMWF forecast · CC BY 4.0'});
  map.getSource(id).updateImage({image:canvas});
  map.addLayer({id,type:'raster',source:id,paint:{'raster-opacity':.65,'raster-fade-duration':0}},map.getLayer('quakes')?'quakes':undefined);
 }
 return true;
}
// Bounded, projected particle animation using actual east/north wind vectors.
// Canvas compositing; does not claim GPU vector integration or observed wind.
export function animateWind(map,data,{count=180}={}){
 if(!data?.frame?.fields?.['10u']||!data?.frame?.fields?.['10v']||matchMedia('(prefers-reduced-motion: reduce)').matches)return ()=>{};
 const container=map.getContainer(),canvas=document.createElement('canvas');
 Object.assign(canvas.style,{position:'absolute',inset:'0',width:'100%',height:'100%',pointerEvents:'none',zIndex:'2'});
 container.append(canvas);const ctx=canvas.getContext('2d');let animation,stopped=false,last=0,particles=[];
 const reset=()=>{canvas.width=container.clientWidth;canvas.height=container.clientHeight;particles=[];};
 const seed=()=>{const p=map.unproject([Math.random()*canvas.width,Math.random()*canvas.height]);return {lon:wrap(p.lng+180)-180,lat:p.lat,age:Math.random()*45};};
 reset();map.on('move',reset);map.on('resize',reset);
 function frame(t){
  if(stopped)return;animation=requestAnimationFrame(frame);
  if(document.hidden||t-last<33||!canvas.width||!canvas.height)return;last=t;
  ctx.globalCompositeOperation='destination-in';ctx.fillStyle='rgba(0,0,0,.86)';ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.globalCompositeOperation='source-over';ctx.strokeStyle='rgba(255,255,255,.8)';ctx.lineWidth=1.3;ctx.beginPath();
  while(particles.length<count)particles.push(seed());
  for(let i=0;i<particles.length;i++){const p=particles[i],u=gridValue(data,'10u',p.lon,p.lat),v=gridValue(data,'10v',p.lon,p.lat);
   if(u===null||v===null||Math.abs(p.lat)>80||p.age++>55){particles[i]=seed();continue;}
   const a=map.project([p.lon,p.lat]);p.lon+=u*.002/Math.max(.2,Math.cos(p.lat*Math.PI/180));p.lat+=v*.002;
   const b=map.project([p.lon,p.lat]);if(Math.abs(b.x-a.x)>30||a.x<0||a.y<0||a.x>canvas.width||a.y>canvas.height){particles[i]=seed();continue;}
   ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);
  }ctx.stroke();
 }
 animation=requestAnimationFrame(frame);
 return ()=>{stopped=true;cancelAnimationFrame(animation);map.off('move',reset);map.off('resize',reset);canvas.remove();};
}
const memory=new Map();
function cacheDb(){
 return new Promise(resolve=>{
  if(typeof indexedDB==='undefined')return resolve(null);
  try{const req=indexedDB.open('zamakan-open-weather',1);
   req.onupgradeneeded=()=>req.result.createObjectStore('frames');
   req.onsuccess=()=>resolve(req.result);req.onerror=()=>resolve(null);req.onblocked=()=>resolve(null);
  }catch{resolve(null);}
 });
}
async function diskRead(key){
 const db=await cacheDb();if(!db)return null;
 return new Promise(resolve=>{try{const tx=db.transaction('frames','readonly'),r=tx.objectStore('frames').get(key);
 r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>resolve(null);tx.oncomplete=()=>db.close();tx.onabort=()=>{db.close();resolve(null);};}catch{db.close();resolve(null);}});
}
async function diskWrite(key,value){
 const db=await cacheDb();if(!db)return;
 try{const tx=db.transaction('frames','readwrite'),store=tx.objectStore('frames');store.put(value,key);
 const all=store.getAllKeys();all.onsuccess=()=>{const keys=all.result.filter(k=>k!==key);while(keys.length>3)store.delete(keys.shift());};
 tx.oncomplete=()=>db.close();tx.onabort=()=>db.close();}catch{db.close();}
}
export async function loadGlobal(base,model,time,signal,fetcher=globalThis.fetch){
 const q=new URLSearchParams({model,time:new Date(Math.round(time/21600000)*21600000).toISOString()});
 const url=base+'/global?'+q,now=Date.now(),old=memory.get(url);if(old&&now-old.at<300000)return old.data;
 const saved=await Promise.race([diskRead(url),new Promise(resolve=>setTimeout(()=>resolve(null),150))]); if(signal?.aborted)throw Error('Cancelled');
 if(saved&&now-saved.at<300000){try{return validateGlobal(saved.data);}catch{}}
 const response=await fetcher(url,{signal:signal?AbortSignal.any([signal,AbortSignal.timeout(20000)]):AbortSignal.timeout(20000),credentials:'omit'});
 if(!response.ok)throw Error('Forecast unavailable');const data=validateGlobal(await response.json());
 memory.set(url,{at:now,data});void diskWrite(url,{at:now,data});while(memory.size>4)memory.delete(memory.keys().next().value);return data;
}
