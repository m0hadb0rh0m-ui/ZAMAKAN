import {validCoords} from './data.js';
const rad=Math.PI/180,R=6371.0088;
export function polygonArea(points){
 if(points.length<3||points.length>500||points.some(p=>!validCoords(p.lon,p.lat)))throw Error('Need 3–500 valid polygon vertices');
 let sum=0;for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],dl=((b.lon-a.lon+540)%360)-180;sum+=dl*rad*(Math.sin(a.lat*rad)+Math.sin(b.lat*rad));}
 const v=Math.abs(sum)*R*R/2;return Math.min(v,4*Math.PI*R*R-v);
}
export function solarPosition(time=Date.now()){
 const jd=time/86400000+2440587.5,n=jd-2451545,mod=x=>((x%360)+360)%360;
 const L=mod(280.460+.9856474*n),g=mod(357.528+.9856003*n)*rad,lambda=(L+1.915*Math.sin(g)+.020*Math.sin(2*g))*rad,eps=(23.439-.0000004*n)*rad;
 const ra=Math.atan2(Math.cos(eps)*Math.sin(lambda),Math.cos(lambda))/rad,dec=Math.asin(Math.sin(eps)*Math.sin(lambda))/rad,gmst=mod(280.46061837+360.98564736629*n);
 return {lat:dec,lon:mod(ra-gmst+180)-180};
}
export function solarElevation(lon,lat,time=Date.now()){
 if(!validCoords(lon,lat))throw Error('Invalid coordinates');const s=solarPosition(time),a=lat*rad,b=s.lat*rad;
 return Math.asin(Math.sin(a)*Math.sin(b)+Math.cos(a)*Math.cos(b)*Math.cos((lon-s.lon)*rad))/rad;
}
export function nightGrid(time){const features=[];for(let y=-90;y<90;y+=5)for(let x=-180;x<180;x+=5)if(solarElevation(x+2.5,y+2.5,time)<0)features.push({type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:[[[x,y],[x+5,y],[x+5,y+5],[x,y+5],[x,y]]]}});return {type:'FeatureCollection',features};}
export function validateGeo(raw){
 if(raw?.type==='Feature')raw={type:'FeatureCollection',features:[raw]};
 if(raw?.type!=='FeatureCollection'||!Array.isArray(raw.features)||!raw.features.length||raw.features.length>3000)throw Error('Invalid or excessive geographic features');
 let count=0;const point=c=>{if(!Array.isArray(c)||c.length<2||!validCoords(c[0],c[1])||++count>100000)throw Error('Invalid or excessive coordinates');return c.slice(0,2);};
 const line=c=>{if(!Array.isArray(c)||c.length<2)throw Error('Invalid line');return c.map(point);};
 const ring=c=>{const v=line(c);if(v.length<4||v[0].some((n,i)=>n!==v.at(-1)[i]))throw Error('Invalid polygon ring');return v;};
 const poly=c=>{if(!Array.isArray(c)||!c.length)throw Error('Invalid polygon');return c.map(ring);};
 return {type:'FeatureCollection',features:raw.features.map(f=>{const g=f.geometry;let coordinates;switch(g?.type){case 'Point':coordinates=point(g.coordinates);break;case 'MultiPoint':coordinates=g.coordinates.map(point);break;case 'LineString':coordinates=line(g.coordinates);break;case 'MultiLineString':coordinates=g.coordinates.map(line);break;case 'Polygon':coordinates=poly(g.coordinates);break;case 'MultiPolygon':coordinates=g.coordinates.map(poly);break;default:throw Error('Unsupported geometry');}return {type:'Feature',geometry:{type:g.type,coordinates},properties:{name:String(f.properties?.name||'').slice(0,160)}};})};
}
export function parseGeoFile(text,name,Parser=globalThis.DOMParser){
 if(typeof text!=='string'||text.length>5_000_000)throw Error('File too large');
 if(/\.(geojson|json)$/i.test(name))return validateGeo(JSON.parse(text));
 if(/<!DOCTYPE|<!ENTITY/i.test(text))throw Error('Unsafe XML');
 const d=new Parser().parseFromString(text,'application/xml'),root=d.documentElement;if(!root||d.getElementsByTagName('parsererror').length||d.doctype)throw Error('Invalid XML');
 const els=(n,k)=>Array.from(n.getElementsByTagNameNS('*',k));const features=[],add=(type,coordinates,name='')=>features.push({type:'Feature',geometry:{type,coordinates},properties:{name}});
 const kmlCoords=n=>n.textContent.trim().split(/\s+/).map(t=>{const a=t.split(',');if(a.length<2||a.slice(0,2).some(x=>!x.trim()))throw Error('Invalid KML');return a.slice(0,2).map(Number);});
 if(root.localName==='kml'&&/opengis\.net\/kml|earth\.google\.com\/kml/.test(root.namespaceURI||'')){
  for(const p of els(root,'Placemark')){const label=els(p,'name')[0]?.textContent||'';for(const g of els(p,'Point')){const c=els(g,'coordinates')[0];if(c)add('Point',kmlCoords(c)[0],label);}for(const g of els(p,'LineString')){const c=els(g,'coordinates')[0];if(c)add('LineString',kmlCoords(c),label);}for(const g of els(p,'Polygon')){const outer=els(g,'outerBoundaryIs')[0],inners=els(g,'innerBoundaryIs'),rings=[outer,...inners].map(x=>kmlCoords(els(x,'coordinates')[0]));add('Polygon',rings,label);}}
 }else if(root.localName==='gpx'&&/topografix\.com\/GPX/.test(root.namespaceURI||'')){
  const pt=n=>{const lon=n.getAttribute('lon'),lat=n.getAttribute('lat');if(lon===null||lat===null||!lon||!lat)throw Error('Missing GPX coordinate');return [Number(lon),Number(lat)];};
  for(const p of els(root,'wpt'))add('Point',pt(p),els(p,'name')[0]?.textContent||'');
  for(const seg of els(root,'trkseg'))add('LineString',els(seg,'trkpt').map(pt));
  for(const route of els(root,'rte'))add('LineString',els(route,'rtept').map(pt));
 }else throw Error('Unsupported XML; use KML or GPX');
 return validateGeo({type:'FeatureCollection',features});
}
