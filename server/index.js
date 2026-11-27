import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../dist/',import.meta.url)).replace(/\/$/,'');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.geojson':'application/geo+json','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
const csp="default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://api.open-meteo.com https://air-quality-api.open-meteo.com https://marine-api.open-meteo.com https://eonet.gsfc.nasa.gov https://earthquake.usgs.gov https://services.swpc.noaa.gov; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'";
const server=createServer(async(req,res)=>{
 const headers={'Content-Security-Policy':csp,'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY','Permissions-Policy':'geolocation=(self), camera=(), microphone=()'};
 const send=(code,body,extra={})=>{res.writeHead(code,{...headers,...extra});res.end(req.method==='HEAD'?undefined:body);};
 try{
 if(!['GET','HEAD'].includes(req.method))return send(405,'Method not allowed',{'Allow':'GET, HEAD'});
 const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(path==='/health')return send(200,JSON.stringify({status:'ok',version:'0.1.0'}),{'Content-Type':'application/json'});
 if(path.includes('\0')||path.split('/').some(x=>x==='..'||x.startsWith('.')))return send(400,'Invalid path');
 const file=resolve(root,'.'+(path==='/'?'/index.html':path));if(!file.startsWith(root+sep))return send(403,'Forbidden');
 const info=await stat(file);if(!info.isFile())return send(404,'Not found');
 const content=await readFile(file);return send(200,content,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':path.startsWith('/assets/')?'public,max-age=31536000,immutable':'no-cache'});
 }catch{return send(404,'Not found');}
});
server.listen(Number(process.env.PORT||4173),process.env.HOST||'127.0.0.1',()=>console.log('ZAMAKAN listening on '+(process.env.PORT||4173)));
