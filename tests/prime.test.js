import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {makePrime,evaluateSubscription,accountId} from '../server/prime.js';
const uid='client-123';
const sample=(state='SUBSCRIPTION_STATE_ACTIVE',expiry='2099-01-01T00:00:00Z',ack='ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED')=>({subscriptionState:state,acknowledgementState:ack,externalAccountIdentifiers:{obfuscatedExternalAccountId:accountId(uid)},lineItems:[{productId:'zamakan_prime',expiryTime:expiry}]});
test('real Play state and expiry determine entitlement, no client-supplied flag',()=>{
 assert.equal(evaluateSubscription(sample(),uid).active,true);assert.equal(evaluateSubscription(sample('SUBSCRIPTION_STATE_ON_HOLD'),uid).active,false);
 assert.equal(evaluateSubscription(sample('SUBSCRIPTION_STATE_CANCELED'),uid).active,true);assert.equal(evaluateSubscription(sample('SUBSCRIPTION_STATE_ACTIVE','2020-01-01T00:00:00Z'),uid).active,false);
 assert.throws(()=>evaluateSubscription(sample(),'different'));assert.throws(()=>evaluateSubscription({...sample(),lineItems:[{productId:'other'}]},uid));
});
function invoke(handler,path,body={},token='valid-token-for-this-test'){
 const req=Readable.from([Buffer.from(JSON.stringify(body))]);req.method=path.endsWith('/config')?'GET':'POST';req.headers={'content-type':'application/json',authorization:'Bearer '+token};req.socket={remoteAddress:'test'};
 return new Promise((resolve,reject)=>{handler(req,new URL('http://localhost/api/prime/'+path.split('/').at(-1)),(status,text)=>resolve({status,data:JSON.parse(text)})).catch(reject);});
}
test('missing configuration fails closed without provider calls',async()=>{
 const h=makePrime({env:{},fetcher:()=>{throw Error('must not call')}});
 assert.equal((await invoke(h,'/config')).data.enabled,false);assert.equal((await invoke(h,'/verify',{token:'purchase-token-123'})).status,503);
});
test('authorized backend verifies, acknowledges, stores and rechecks actual Play state; AI is gated',async()=>{
 let state='SUBSCRIPTION_STATE_ACTIVE',ack='ACKNOWLEDGEMENT_STATE_PENDING',calls=[];
 const json=x=>new Response(JSON.stringify(x),{status:200,headers:{'content-type':'application/json'}});
 const h=makePrime({env:{FIREBASE_WEB_API_KEY:'test',PRIME_DB_PATH:':memory:',PRIME_TOKEN_ENCRYPTION_KEY:'ab'.repeat(32),GOOGLE_CLOUD_ADC:'true',GEMINI_API_KEY:'test',GEMINI_MODEL:'gemini-test'},fetcher:async(url,opts)=>{
  calls.push(url);
  if(url.includes('accounts:lookup'))return json({users:[{localId:uid}]});
  if(url.includes('metadata.google.internal'))return json({access_token:'server-token',expires_in:3600});
  if(url.endsWith(':acknowledge')){ack='ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED';return json({});}
  if(url.includes('subscriptionsv2/tokens/'))return json(sample(state,undefined,ack));
  if(url.includes('generativelanguage.googleapis.com'))return json({candidates:[{content:{parts:[{text:JSON.stringify({summary:'Broad land cover change',limitations:'Not a survey'})}]}}]});
  throw Error('Unexpected URL');
 }});
 assert.equal((await invoke(h,'/status')).data.active,false);
 assert.equal((await invoke(h,'/verify',{token:'purchase-token-123'})).data.active,true);assert.ok(calls.some(u=>u.endsWith(':acknowledge')));
 assert.equal((await invoke(h,'/status')).data.active,true);
 const image={mime:'image/png',data:'YWJj'};const result=await invoke(h,'/change',{before:image,after:image,beforeDate:'2026-01-01',afterDate:'2026-02-01'});assert.equal(result.status,200);assert.equal(result.data.kind,'unverified-ai-visual-assessment');
 state='SUBSCRIPTION_STATE_ON_HOLD';assert.equal((await invoke(h,'/status')).data.active,false);assert.equal((await invoke(h,'/change',{})).status,403);
});
