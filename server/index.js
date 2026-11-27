import {makePrime} from './prime.js';
import {makeWeatherGateway} from './weather-gateway.js';
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../dist/',import.meta.url)).replace(/\/$/,'');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.geojson':'application/geo+json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.wasm':'application/wasm','.ktx2':'image/ktx2','.glb':'model/gltf-binary','.bin':'application/octet-stream','.webmanifest':'application/manifest+json'};
const gateway=makeWeatherGateway();
const prime=makePrime();
const apiOrigins=new Set((process.env.ZAMAKAN_ALLOWED_ORIGINS||'').split(',').map(x=>x.trim()).filter(Boolean));
const csp="default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://gibs.earthdata.nasa.gov https://tiles.openfreemap.org https://api.maptiler.com https://maps.gstatic.com https://www.gstatic.com https://tile.googleapis.com https://*.cesium.com; connect-src 'self' data: blob: https://data.cityofnewyork.us https://overpass-api.de https://api.cesium.com https://*.cesium.com https://tile.googleapis.com https://maps.googleapis.com https://photon.komoot.io https://tiles.openfreemap.org https://api.maptiler.com https://api.open-meteo.com https://air-quality-api.open-meteo.com https://marine-api.open-meteo.com https://geocoding-api.open-meteo.com https://gibs.earthdata.nasa.gov https://eonet.gsfc.nasa.gov https://earthquake.usgs.gov https://services.swpc.noaa.gov; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'";
let weatherOrigin='';try{const u=new URL(process.env.WEATHER_PUBLIC_BASE||'');if(u.protocol==='https:'&&!u.username&&!u.password)weatherOrigin=u.origin;}catch{}
let apiOrigin='';try{const u=new URL(process.env.ZAMAKAN_PUBLIC_BASE||'');if(u.protocol==='https:'&&!u.username&&!u.password)apiOrigin=u.origin;}catch{}
let liveOrigin='';try{const u=new URL(process.env.LIVE_BUILDINGS_PUBLIC_BASE||'');if(u.protocol==='https:'&&!u.username&&!u.password)liveOrigin=u.origin;}catch{}
const effectiveCsp=csp.replace("connect-src 'self'","connect-src 'self' "+[weatherOrigin,apiOrigin,liveOrigin].filter(Boolean).join(' '));
const server=createServer(async(req,res)=>{
 const headers={'Content-Security-Policy':effectiveCsp,'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY','Permissions-Policy':'geolocation=(self), camera=(), microphone=()'};
 const send=(code,body,extra={})=>{res.writeHead(code,{...headers,...extra});res.end(req.method==='HEAD'?undefined:body);};
 try{
 const requestUrl=new URL(req.url,'http://localhost');
 if(requestUrl.pathname.startsWith('/api/prime/')||requestUrl.pathname==='/api/osm/live'){
 const origin=req.headers.origin,host=req.headers.host;const sameOrigin=origin&&[('https://'+host),('http://'+host)].includes(origin);
 if(origin&&!sameOrigin&&!apiOrigins.has(origin))return send(403,'Origin not approved');
 const cors={'Vary':'Origin',...(origin?{'Access-Control-Allow-Origin':origin}:{})};
 const apiSend=(code,body,extra={})=>send(code,body,{...cors,...extra});
 if(req.method==='OPTIONS')return apiSend(204,'',{'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization'});
 if(requestUrl.pathname.startsWith('/api/prime/'))return await prime(req,requestUrl,apiSend);
 if(req.method!=='GET')return apiSend(405,'Method not allowed');
 try{const data=JSON.parse(await readFile(process.env.OSM_LIVE_FILE||'./data/osm-live.json','utf8'));return apiSend(200,JSON.stringify({...data,stale:Date.now()-Date.parse(data.processedTimestamp)>600000}),{'Content-Type':'application/json','Cache-Control':'no-store'});}catch{return apiSend(503,JSON.stringify({error:'OSM ingestion is not running'}),{'Content-Type':'application/json','Cache-Control':'no-store'});}
 }
 if(requestUrl.pathname.startsWith('/api/weather/'))return await gateway(req,res,requestUrl,send);
 if(!['GET','HEAD'].includes(req.method))return send(405,'Method not allowed',{'Allow':'GET, HEAD'});
 const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(path==='/health')return send(200,JSON.stringify({status:'ok',version:'0.1.0'}),{'Content-Type':'application/json'});
 if(path.includes('\0')||path.split('/').some(x=>x==='..'||x.startsWith('.')))return send(400,'Invalid path');
 const file=resolve(root,'.'+(path==='/'?'/index.html':path));if(!file.startsWith(root+sep))return send(403,'Forbidden');
 const info=await stat(file);if(!info.isFile())return send(404,'Not found');
 const content=await readFile(file);return send(200,content,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':path.startsWith('/assets/')?'public,max-age=31536000,immutable':'no-cache'});
 }catch{return send(404,'Not found');}
});
server.listen(Number(process.env.PORT||4173),process.env.HOST||'127.0.0.1',()=>console.log('ZAMAKAN listening on '+(process.env.PORT||4173)));
