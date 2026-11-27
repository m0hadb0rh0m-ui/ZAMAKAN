import {flagsFromEnv,evaluateFlags} from '../shared/flags.js';
// Optional GrowthBook SDK connection, simple boolean features only, no user attributes.
export function createFlagProvider({raw='',clientKey='',fetcher=fetch,now=Date.now}={}){
 const defaults=flagsFromEnv(raw);
 let current=defaults,updated=-Infinity,pending;
 const key=/^[A-Za-z0-9_-]{8,160}$/.test(clientKey)?clientKey:'';
 return {async get(){
  if(!key||now()-updated<60000)return current;
  if(pending)return pending;
  pending=(async()=>{try{
   const r=await fetcher('https://cdn.growthbook.io/api/features/'+key,{signal:AbortSignal.timeout(3000),redirect:'error'});
   if(!r.ok||Number(r.headers.get('content-length'))>131072)throw Error('provider');
   const reader=r.body.getReader();let size=0,parts=[];
   try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>131072)throw Error('size');parts.push(value);}}finally{await reader.cancel().catch(()=>{});}
   const d=JSON.parse(Buffer.concat(parts,size).toString('utf8'));
   if(!d.features||typeof d.features!=='object'||Array.isArray(d.features))throw Error('provider');
   const supported=Object.fromEntries(Object.entries(d.features).filter(([,v])=>v&&typeof v.defaultValue==='boolean'&&(!v.rules||v.rules.length===0)));
   current=evaluateFlags({...defaults,...supported});
  }catch{/* retain last known flags, never reveal provider credentials */}finally{updated=now();pending=null;}return current;})();
  return pending;
 }};
}
