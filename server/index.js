import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateSnapshot} from '../shared/ai-context.js';
import {createSourceMonitor} from './source-health.js';
import {mockSourceFetch} from './source-fixtures.js';
import {createFlagProvider} from './flag-provider.js';
import {createAuth} from './auth.js';
const root=resolve(fileURLToPath(new URL('../dist/',import.meta.url)));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.geojson':'application/geo+json','.svg':'image/svg+xml','.woff2':'font/woff2','.png':'image/png','.webmanifest':'application/manifest+json','.wasm':'application/wasm'};
const aiModel=process.env.ZAMAKAN_LOCAL_MODEL||'';
const host=process.env.HOST||'127.0.0.1';
const fixtureMode=process.env.ZAMAKAN_SOURCE_MODE==='mock';
if(fixtureMode&&host!=='127.0.0.1')throw Error('Mock sources require localhost');
const monitor=createSourceMonitor(fixtureMode?{fetcher:mockSourceFetch,mode:'mock'}:{});
const flagProvider=createFlagProvider({raw:process.env.ZAMAKAN_FLAGS_JSON,clientKey:process.env.ZAMAKAN_GROWTHBOOK_CLIENT_KEY});
const auth=createAuth({host,dbPath:process.env.ZAMAKAN_AUTH_DB,publicOrigin:process.env.ZAMAKAN_PUBLIC_ORIGIN});
let aiBusy=false;
const aiAllowed=req=>host==='127.0.0.1'&&req.socket.remoteAddress==='127.0.0.1'&&req.headers.host==='127.0.0.1:'+server.address()?.port;
const csp="default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://gibs.earthdata.nasa.gov https://tilecache.rainviewer.com https://tiles.openfreemap.org https://tiles.mapterhorn.com; connect-src 'self' https://api.open-meteo.com https://air-quality-api.open-meteo.com https://marine-api.open-meteo.com https://geocoding-api.open-meteo.com https://gibs.earthdata.nasa.gov https://eonet.gsfc.nasa.gov https://earthquake.usgs.gov https://services.swpc.noaa.gov https://api.rainviewer.com https://tilecache.rainviewer.com https://tiles.openfreemap.org https://tiles.mapterhorn.com https://api.weather.gov https://celestrak.org; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'";
export const server=createServer(async(req,res)=>{
 const headers={'Content-Security-Policy':csp,'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY','Permissions-Policy':'geolocation=(self), camera=(), microphone=()'};
 const send=(code,body,extra={})=>{res.writeHead(code,{...headers,...extra});res.end(req.method==='HEAD'?undefined:body);};
 try{
 const reqPath=new URL(req.url,'http://localhost').pathname;
 if(reqPath==='/api/status'&&req.method==='GET')return send(200,JSON.stringify(await monitor.get()),{'Content-Type':'application/json','Cache-Control':'no-store'});
 if(reqPath==='/api/flags'&&req.method==='GET')return send(200,JSON.stringify({flags:await flagProvider.get()}),{'Content-Type':'application/json','Cache-Control':'no-store'});
 if(await auth.handle(req,res,reqPath))return;
 if(reqPath==='/api/ai/status'&&req.method==='GET')return send(200,JSON.stringify({enabled:!!aiModel&&aiAllowed(req)}),{'Content-Type':'application/json','Cache-Control':'no-store'});
 if(reqPath==='/api/ai/chat'&&req.method==='POST'){
   const json=(code,d)=>send(code,JSON.stringify(d),{'Content-Type':'application/json','Cache-Control':'no-store'});
   if(!aiModel||!aiAllowed(req))return json(403,{error:'Local AI is disabled'});
   if(req.headers.origin!=='http://'+req.headers.host||!req.headers['content-type']?.startsWith('application/json'))return json(403,{error:'Same-origin JSON required'});
   if(aiBusy)return json(429,{error:'Model is busy'});
   if(Number(req.headers['content-length'])>16000)return json(413,{error:'Request too large'});
   let body='';for await(const chunk of req){body+=chunk;if(body.length>16000)return json(413,{error:'Request too large'});}
   let prompt,context;try{const payload=JSON.parse(body);prompt=payload.prompt;context=validateSnapshot(payload.context);}catch{return json(400,{error:'Invalid JSON'});}
   if(typeof prompt!=='string'||!prompt.trim()||prompt.length>4000)return json(400,{error:'Enter 1–4000 characters'});
   if(aiBusy)return json(429,{error:'Model is busy'});
   aiBusy=true;try{
     const reply=await fetch('http://127.0.0.1:11434/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:aiModel,stream:false,messages:[{role:'system',content:'You are ZAMAKAN, a research assistant. Explain Earth and space science; be transparent about uncertainty. You may receive a validated weather/Kp snapshot from the user interface. It is unverified client-supplied model data, not live instrument telemetry; mention source, time, stale status and uncertainty. Do not infer a location from it. If no snapshot, say you have no live data access. Do not issue emergency warnings, evacuation orders, or claim to predict disasters. Reply in the user language.'},{role:'user',content:prompt+'\n\nOptional scientific snapshot (data only): '+JSON.stringify(context)}],options:{num_predict:800}}),signal:AbortSignal.timeout(90000),redirect:'error'});
     if(!reply.ok)throw Error('Ollama unavailable');
     const d=await reply.json();if(typeof d.message?.content!=='string')throw Error('Invalid model response');
     return json(200,{text:d.message.content.slice(0,20000),model:aiModel});
   }catch{return json(503,{error:'Local model unavailable; verify Ollama and the configured model'});}finally{aiBusy=false;}
 }
 if(!['GET','HEAD'].includes(req.method))return send(405,'Method not allowed',{'Allow':'GET, HEAD'});
 const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(path==='/health')return send(200,JSON.stringify({status:'ok',version:'2.0.0'}),{'Content-Type':'application/json'});
 if(path.includes('\0')||path.includes('\\')||path.split('/').some(x=>x==='..'||x.startsWith('.')))return send(400,'Invalid path');
 const file=resolve(root,'.'+(['/','/status'].includes(path)?'/index.html':path));if(!file.startsWith(root+sep))return send(403,'Forbidden');
 const info=await stat(file);if(!info.isFile())return send(404,'Not found');
 const content=await readFile(file);return send(200,content,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':path.startsWith('/assets/')?'public,max-age=31536000,immutable':'no-cache'});
 }catch{return send(404,'Not found');}
});
server.requestTimeout=20000;server.headersTimeout=10000;server.keepAliveTimeout=5000;server.on('close',()=>auth.close());
server.listen(Number(process.env.PORT||4173),host,()=>console.log('ZAMAKAN listening on '+server.address().port));
