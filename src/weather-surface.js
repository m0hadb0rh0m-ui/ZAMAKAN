import {WEATHER_FIELDS} from './weather-layer.js';
const merc=lat=>Math.log(Math.tan(Math.PI/4+lat*Math.PI/360));
const inv=y=>Math.atan(Math.sinh(y))*180/Math.PI;
const cross=(o,a,b)=>(a.x-o.x)*(b.y-o.y)-(a.y-o.y)*(b.x-o.x);
function hull(pts){
 const sorted=pts.slice().sort((a,b)=>a.x-b.x||a.y-b.y),lower=[],upper=[];
 for(const p of sorted){while(lower.length>=2&&cross(lower.at(-2),lower.at(-1),p)<=0)lower.pop();lower.push(p);}
 for(const p of sorted.slice().reverse()){while(upper.length>=2&&cross(upper.at(-2),upper.at(-1),p)<=0)upper.pop();upper.push(p);}
 return lower.slice(0,-1).concat(upper.slice(0,-1));
}
export function surfaceSamples(data,field){
 const rows=(data?.features||[]).filter(f=>Number.isFinite(f.properties?.[field])&&typeof f.properties?.time==='string');
 if(!rows.length)return null;
 const counts=new Map();for(const f of rows)counts.set(f.properties.time,(counts.get(f.properties.time)||0)+1);
 const [time]=[...counts].sort((a,b)=>b[1]-a[1])[0];
 const unique=new Map();
 for(const f of rows.filter(r=>r.properties.time===time)){
  const [lon,lat]=f.geometry.coordinates;if(Math.abs(lat)>80||Math.abs(lon)>180)continue;
  unique.set(lon+','+lat,{x:lon*Math.PI/180,y:merc(lat),v:f.properties[field]});
 }
 const pts=[...unique.values()];if(pts.length<4)return null;
 const west=Math.min(...pts.map(p=>p.x)),east=Math.max(...pts.map(p=>p.x)),south=Math.min(...pts.map(p=>p.y)),north=Math.max(...pts.map(p=>p.y));
 if(east-west>Math.PI/2||east-west<1e-7||north-south<1e-7)return null;
 const outline=hull(pts);if(outline.length<3)return null;
 return {pts,outline,west,east,south,north,time};
}
export function interpolateSurface(surface,x,y){
 if(surface.outline.some((p,i)=>cross(p,surface.outline[(i+1)%surface.outline.length],{x,y})< -1e-12))return null;
 let sum=0,weight=0;
 for(const p of surface.pts){const d=(x-p.x)**2+(y-p.y)**2;if(d<1e-15)return p.v;const w=1/d;weight+=w;sum+=w*p.v;}
 return weight?sum/weight:null;
}
const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
export function surfaceColor(field,value){
 const stops=WEATHER_FIELDS[field].stops;
 if(value<=stops[0][0])return rgb(stops[0][1]);
 for(let i=1;i<stops.length;i++)if(value<=stops[i][0]){const [a,c]=stops[i-1],[b,d]=stops[i],t=(value-a)/(b-a),u=rgb(c),v=rgb(d);return u.map((x,k)=>Math.round(x+(v[k]-x)*t));}
 return rgb(stops.at(-1)[1]);
}
export function renderSurface(map,data,field,enabled=true){
 if(map.getLayer('z-weather-surface'))map.removeLayer('z-weather-surface');
 if(map.getSource('z-weather-surface'))map.removeSource('z-weather-surface');
 if(!enabled||!data)return false;
 const s=surfaceSamples(data,field);if(!s)return false;
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
 const ctx=canvas.getContext('2d'),img=ctx.createImageData(128,128);
 for(let y=0;y<128;y++)for(let x=0;x<128;x++){
  const v=interpolateSurface(s,s.west+(s.east-s.west)*x/127,s.north-(s.north-s.south)*y/127);
  if(v===null)continue;
  const i=(y*128+x)*4;img.data.set([...surfaceColor(field,v),210],i);
 }
 ctx.putImageData(img,0,0);
 const w=s.west*180/Math.PI,e=s.east*180/Math.PI,n=inv(s.north),b=inv(s.south);
 map.addSource('z-weather-surface',{type:'image',coordinates:[[w,n],[e,n],[e,b],[w,b]]});
 const source=map.getSource('z-weather-surface');if(!source)return false;
 source.updateImage({image:canvas});
 map.addLayer({id:'z-weather-surface',type:'raster',source:'z-weather-surface',paint:{'raster-opacity':.74,'raster-fade-duration':0}},map.getLayer('quakes')?'quakes':undefined);
 return true;
}
