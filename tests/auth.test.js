import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {createAuth} from '../server/auth.js';

test('registration, login, password rotation, session revocation and CSRF',async()=>{
 const auth=createAuth({dbPath:':memory:',host:'127.0.0.1'}),app=createServer((req,res)=>auth.handle(req,res,new URL(req.url,'http://local').pathname));
 try{
  app.listen(0,'127.0.0.1');await once(app,'listening');const origin='http://127.0.0.1:'+app.address().port;
  const post=(path,data,cookie='',originHeader=origin)=>fetch(origin+'/api/auth/'+path,{method:'POST',headers:{Origin:originHeader,'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify(data)});
  const me=async(cookie='')=>(await (await fetch(origin+'/api/auth/session',{headers:{Cookie:cookie}})).json());
  assert.equal((await me()).enabled,true);assert.equal((await me()).user,null);
  assert.equal((await post('register',{username:'member',password:'test-password-length' },'','https://attacker.example')).status,403);
  assert.equal((await post('register',{username:'member',password:'short'})).status,400);
  const r=await post('register',{username:'Member',password:'test-password-length'});assert.equal(r.status,201);
  const raw=r.headers.get('set-cookie');assert.match(raw,/HttpOnly/);assert.match(raw,/SameSite=Strict/);const cookie=raw.split(';')[0];
  assert.equal((await me(cookie)).user.username,'member');assert.equal((await post('login',{username:'member',password:'wrong-password'})).status,401);
  const rotated=await post('password',{password:'test-password-length',newPassword:'new-secure-passphrase'},cookie);assert.equal(rotated.status,200);
  const newCookie=rotated.headers.get('set-cookie').split(';')[0];assert.notEqual(newCookie,cookie);assert.equal((await me(cookie)).user,null);assert.equal((await me(newCookie)).user.username,'member');
  assert.equal((await post('login',{username:'member',password:'test-password-length'})).status,401);
  assert.equal((await post('logout',{},newCookie)).status,200);assert.equal((await me(newCookie)).user,null);
  const finalLogin=await post('login',{username:'member',password:'new-secure-passphrase'});assert.equal(finalLogin.status,200);
  const finalCookie=finalLogin.headers.get('set-cookie').split(';')[0];
  assert.equal((await post('delete',{confirm:true,password:'new-secure-passphrase'},finalCookie,'https://evil.example')).status,403);
  assert.equal((await post('delete',{confirm:false,password:'new-secure-passphrase'},finalCookie)).status,400);
  assert.equal((await post('delete',{confirm:true,password:'wrong-password'},finalCookie)).status,401);
  assert.equal((await post('delete',{confirm:true,password:'new-secure-passphrase'},finalCookie)).status,200);
  assert.equal((await me(finalCookie)).user,null);
  assert.equal((await post('login',{username:'member',password:'new-secure-passphrase'})).status,401);
 }finally{app.closeAllConnections();await new Promise(r=>app.close(r));auth.close();}
});
test('public account service requires configured HTTPS origin',()=>{
 const a=createAuth({dbPath:':memory:',host:'0.0.0.0',publicOrigin:'http://example.test'});assert.equal(a.enabled,false);a.close();
 const b=createAuth({dbPath:':memory:',host:'0.0.0.0',publicOrigin:'https://example.test'});assert.equal(b.enabled,true);b.close();
});
