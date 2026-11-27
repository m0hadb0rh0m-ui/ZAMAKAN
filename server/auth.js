import {validateUserState,validateRevision} from '../shared/user-state.js';
import {DatabaseSync} from 'node:sqlite';
import {randomBytes,scrypt,timingSafeEqual,createHash} from 'node:crypto';
import {promisify} from 'node:util';
const derive=promisify(scrypt), SESSION_MS=12*3600000, LIMIT_MS=15*60000;
const digest=v=>createHash('sha256').update(v).digest('hex');
const userKey=v=>typeof v==='string'?v.trim().toLowerCase():'';
const validUser=v=>/^[a-z0-9][a-z0-9_.-]{2,31}$/.test(v);
const validPassword=v=>typeof v==='string'&&[...v].length>=12&&Buffer.byteLength(v)<=512;
const hashPassword=async(p,salt)=>Buffer.from(await derive(p,salt,64,{N:131072,r:8,p:1,maxmem:160*1024*1024}));
export function createAuth({dbPath,host,publicOrigin='',now=Date.now}){
 const local=host==='127.0.0.1';
 let configuredOrigin='';try{const u=new URL(publicOrigin);if(u.protocol==='https:'&&u.origin===publicOrigin)configuredOrigin=u.origin;}catch{}
 const enabled=!!dbPath&&(local||!!configuredOrigin);
 const db=enabled?new DatabaseSync(dbPath):null;
 if(db){db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY,username TEXT NOT NULL UNIQUE,salt TEXT NOT NULL,hash TEXT NOT NULL,created INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires);
 CREATE TABLE IF NOT EXISTS user_state(user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,revision INTEGER NOT NULL,updated INTEGER NOT NULL,payload TEXT NOT NULL);`);}
 const limits=new Map();let activeHashes=0;
 const rate=(key,max)=>{
  const t=now();if(limits.size>=4000){for(const [k,v] of limits)if(v.until<=t)limits.delete(k);if(limits.size>=4000&&!limits.has(key))return false;}
  let v=limits.get(key);if(!v||v.until<=t){v={count:0,until:t+LIMIT_MS};limits.set(key,v);}return ++v.count<=max;
 };
 const cookieName=local?'zamakan_session':'__Host-zamakan_session';
 const cookie=(token,age)=>cookieName+'='+token+'; Path=/; HttpOnly; SameSite=Strict; Max-Age='+age+(local?'':'; Secure');
 const expectedOrigin=req=>local&&/^127\.0\.0\.1:\d+$/.test(req.headers.host||'')?'http://'+req.headers.host:!local?configuredOrigin:'';
 const token=req=>{const x=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(cookieName+'='))?.slice(cookieName.length+1);return /^[a-f0-9]{64}$/.test(x||'')?digest(x):null;};
 const session=req=>{const t=token(req);if(!t)return null;return db.prepare('SELECT u.id,u.username FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>?').get(t,now())||null;};
 async function credentials(req,max=4096){
  if(Number(req.headers['content-length'])>max)throw Error('oversize');let bytes=0,chunks=[];
  for await(const c of req){bytes+=c.length;if(bytes>max)throw Error('oversize');chunks.push(c);}return JSON.parse(Buffer.concat(chunks).toString('utf8'));
 }
 async function handle(req,res,path){
  if(!path.startsWith('/api/auth/'))return false;
  const json=(status,d,extra={})=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',...extra});res.end(JSON.stringify(d));return true;};
  const origin=expectedOrigin(req);
  if(path==='/api/auth/session'&&req.method==='GET'){
   if(!enabled||!origin)return json(200,{enabled:false,user:null});
   const u=session(req);return json(200,{enabled:true,user:u?{username:u.username}:null,local});
  }
  if(!enabled||!origin)return json(503,{error:'auth-disabled'});
  if(path==='/api/auth/sync'){
   const u=session(req);if(!u)return json(401,{error:'invalid-credentials'});
   const get=()=>db.prepare('SELECT revision,updated,payload FROM user_state WHERE user_id=?').get(u.id);
   if(req.method==='GET'){const r=get();return json(200,r?{revision:r.revision,updated:r.updated,state:JSON.parse(r.payload)}:{revision:0,updated:null,state:null});}
   if(req.method!=='POST')return json(405,{error:'method-not-allowed'});
   if(req.headers.origin!==origin||!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))return json(403,{error:'same-origin-required'});
   if(!rate('sync:'+u.id,60))return json(429,{error:'rate-limit'});
   try{const input=await credentials(req,16384),rev=validateRevision(input.revision),payload=JSON.stringify(validateUserState(input.state)),t=now();let result;
    if(rev===0)result=db.prepare('INSERT OR IGNORE INTO user_state(user_id,revision,updated,payload) VALUES(?,1,?,?)').run(u.id,t,payload);
    else result=db.prepare('UPDATE user_state SET revision=revision+1,updated=?,payload=? WHERE user_id=? AND revision=?').run(t,payload,u.id,rev);
    if(!result.changes)return json(409,{error:'sync-conflict'});return json(200,{revision:rev+1,updated:t});
   }catch{return json(400,{error:'invalid-state'});}
  }
  if(req.method!=='POST')return json(405,{error:'method-not-allowed'},{Allow:'POST'});
  if(req.headers.origin!==origin||!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))return json(403,{error:'same-origin-required'});
  const ip=req.socket.remoteAddress||'unknown';
  if(!rate('ip:'+ip,local?80:60))return json(429,{error:'rate-limit'},{'Retry-After':'900'});
  if(path==='/api/auth/logout'){
   const t=token(req);if(t)db.prepare('DELETE FROM sessions WHERE token_hash=?').run(t);
   return json(200,{ok:true},{'Set-Cookie':cookie('',0)});
  }
  if(!['/api/auth/register','/api/auth/login','/api/auth/password'].includes(path))return json(404,{error:'not-found'});
  let input;try{input=await credentials(req);}catch{return json(400,{error:'invalid-request'});}
  if(!input||typeof input!=='object')return json(400,{error:'invalid-request'});
  let username=userKey(input.username),p=input.password;
  const change=path.endsWith('/password'),register=path.endsWith('/register');
  let current=change?session(req):null;if(change&&!current)return json(401,{error:'invalid-credentials'});
  if(change)username=current.username;
  if(!validUser(username)||typeof p!=='string'||Buffer.byteLength(p)>512||(register&&!validPassword(p))||(change&&!validPassword(input.newPassword)))return json(400,{error:'invalid-credentials-format'});
  if(!rate('user:'+username,10)||register&&!rate('register:'+ip,8))return json(429,{error:'rate-limit'},{'Retry-After':'900'});
  if(activeHashes>=2)return json(503,{error:'try-again'});
  activeHashes++;
  try{
   let u=db.prepare('SELECT id,username,salt,hash FROM users WHERE username=?').get(username);
   if(register){
    const salt=randomBytes(16).toString('hex'),hash=(await hashPassword(p,salt)).toString('hex');
    // Use a generic response for duplicate registration and avoid unhandled unique races.
    if(u)return json(409,{error:'registration-unavailable'});
    try{const r=db.prepare('INSERT INTO users(username,salt,hash,created) VALUES(?,?,?,?)').run(username,salt,hash,now());u={id:r.lastInsertRowid,username};}
    catch{return json(409,{error:'registration-unavailable'});}
   }else{
    const salt=u?.salt||'00000000000000000000000000000000',stored=Buffer.from(u?.hash||'00'.repeat(64),'hex'),computed=await hashPassword(p,salt);
    if(!u||!timingSafeEqual(stored,computed))return json(401,{error:'invalid-credentials'});
    if(change){
     const nextSalt=randomBytes(16).toString('hex'),nextHash=(await hashPassword(input.newPassword,nextSalt)).toString('hex');
     db.exec('BEGIN IMMEDIATE');try{db.prepare('UPDATE users SET salt=?,hash=? WHERE id=?').run(nextSalt,nextHash,u.id);db.prepare('DELETE FROM sessions WHERE user_id=?').run(u.id);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}
    }
   }
   db.prepare('DELETE FROM sessions WHERE expires<=?').run(now());
   const old=token(req);if(old)db.prepare('DELETE FROM sessions WHERE token_hash=?').run(old);
   const t=randomBytes(32).toString('hex');db.prepare('INSERT INTO sessions(token_hash,user_id,expires) VALUES(?,?,?)').run(digest(t),u.id,now()+SESSION_MS);
   return json(register?201:200,{user:{username:u.username}},{'Set-Cookie':cookie(t,SESSION_MS/1000)});
  }catch{return json(500,{error:'server-error'});}finally{activeHashes--;}
 }
 return {handle,close:()=>db?.close(),enabled};
}
