import {validateUserState,validateRevision} from '../shared/user-state.js';
import {readAlertFeed} from '../shared/alert-feeds.js';
import {flagsFromEnv} from '../shared/flags.js';
import {createSourceMonitor} from '../server/source-health.js';
import {ASSETS} from './assets.generated.js';
const monitor=createSourceMonitor();
const common={'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY','Permissions-Policy':'geolocation=(self), camera=(), microphone=()','Strict-Transport-Security':'max-age=31536000'};
const json=(status,data)=>new Response(JSON.stringify(data),{status,headers:{...common,'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
const identity=req=>{const id=req.headers.get('oai-authenticated-user-id'),email=req.headers.get('oai-authenticated-user-email');return id&&email&&id.length<=256?{id}:null;};
async function body(req){if(!req.body||Number(req.headers.get('content-length'))>16384)throw Error('Body too large');const reader=req.body.getReader();let n=0,b=[];try{for(;;){const {done,value}=await reader.read();if(done)break;n+=value.byteLength;if(n>16384)throw Error('Body too large');b.push(value);}}finally{await reader.cancel().catch(()=>{});}const data=new Uint8Array(n);let o=0;for(const v of b){data.set(v,o);o+=v.length;}return JSON.parse(new TextDecoder().decode(data));}
export async function handle(req,env){
 const url=new URL(req.url),path=url.pathname;
 if(path==='/health'&&req.method==='GET')return json(200,{status:'ok',version:'2.2.0',cloud:true,sync:!!env.DB});
 if(path==='/api/ai/status'&&req.method==='GET')return json(200,{enabled:false});
 if(path==='/api/flags'&&req.method==='GET')return json(200,{flags:flagsFromEnv()});
 if(path==='/api/auth/session'&&req.method==='GET'){const u=identity(req);return json(200,{enabled:true,provider:'chatgpt',user:u?{username:'ChatGPT'}:null,local:false});}
 if(path==='/api/auth/sync'){
  const u=identity(req);if(!u)return json(401,{error:'invalid-credentials'});if(!env.DB)return json(503,{error:'sync-unavailable'});
  try{
   if(req.method==='GET'){const row=await env.DB.prepare('SELECT revision,updated,payload FROM user_state WHERE user_id=?').bind(u.id).first();return json(200,row?{revision:row.revision,updated:row.updated,state:JSON.parse(row.payload)}:{revision:0,updated:null,state:null});}
   if(req.method!=='POST')return json(405,{error:'method-not-allowed'});
   if(req.headers.get('origin')!==url.origin||!/^application\/json(?:;|$)/i.test(req.headers.get('content-type')||''))return json(403,{error:'same-origin-required'});
   let rev,payload;try{const d=await body(req);rev=validateRevision(d.revision);payload=JSON.stringify(validateUserState(d.state));}catch{return json(400,{error:'invalid-state'});}
   const t=Date.now(),result=rev===0?await env.DB.prepare('INSERT OR IGNORE INTO user_state(user_id,revision,updated,payload) VALUES(?,1,?,?)').bind(u.id,t,payload).run():await env.DB.prepare('UPDATE user_state SET revision=revision+1,updated=?,payload=? WHERE user_id=? AND revision=?').bind(t,payload,u.id,rev).run();
   if(!result.meta?.changes)return json(409,{error:'sync-conflict'});return json(200,{revision:rev+1,updated:t});
  }catch{return json(503,{error:'sync-unavailable'});}
 }
 if(path==='/api/status'&&req.method==='GET')return json(200,await monitor.get());
 if(path.startsWith('/api/cap/feed/')&&req.method==='GET'){try{return json(200,await readAlertFeed(path.slice('/api/cap/feed/'.length)));}catch{return json(503,{error:'source-unavailable'});}}
 if(path.startsWith('/api/'))return json(404,{error:'not-found'});
 if(!['GET','HEAD'].includes(req.method))return json(405,{error:'method-not-allowed'});
 const key=path==='/'||path==='/status'||path==='/guide'?'/index.html':path;
 if(!Object.hasOwn(ASSETS,key))return new Response('Not found',{status:404,headers:common});
 const a=ASSETS[key],headers={...common,'Content-Type':a[0],'Cache-Control':key.startsWith('/assets/')?'public, max-age=31536000, immutable':'no-cache'};
 if(key==='/sw.js')headers['Service-Worker-Allowed']='/';
 return new Response(req.method==='HEAD'?null:Uint8Array.from(atob(a[1]),c=>c.charCodeAt(0)),{headers});
}
export default {async fetch(req,env){try{return await handle(req,env);}catch{return json(500,{error:'internal-error'});}}};
