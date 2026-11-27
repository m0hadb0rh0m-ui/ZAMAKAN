// This preflight never prints secret values or response bodies. It does not deploy them.
import {authorizeMapTiler,ionToken} from '../src/provider-config.js';
const headers={Origin:'https://localhost',Referer:'https://localhost/','User-Agent':'Mozilla/5.0 ZAMAKAN-ULTRA/1.0'};
const fail=name=>{console.error(name+' failed: check client access restrictions and entitlement');process.exitCode=1;};
if(!process.env.MAPTILER_PUBLIC_KEY)fail('MapTiler key missing');else try{
 await authorizeMapTiler(process.env.MAPTILER_PUBLIC_KEY,{fetcher:(url,options)=>fetch(url,{...options,headers})});
 console.log('MapTiler satellite style authorized');
}catch{fail('MapTiler access');}
if(!process.env.CESIUM_PUBLIC_TOKEN)fail('Cesium token missing');else try{
 const token=ionToken(process.env.CESIUM_PUBLIC_TOKEN);
 const r=await fetch('https://api.cesium.com/v1/assets/2275207/endpoint',{headers:{...headers,Authorization:'Bearer '+token},signal:AbortSignal.timeout(12000),redirect:'error'});
 if(!r.ok){console.error('Cesium endpoint HTTP '+r.status);throw Error('access');}
 const endpoint=await r.json();
 if(!(endpoint?.externalType==='3DTILES'?endpoint.options?.url:endpoint?.url)){console.error('Cesium endpoint missing asset URL');throw Error('access');}
 console.log('Cesium Google 3D asset authorized');
}catch{fail('Cesium access');}
console.log('No key was embedded in files. Provider access does not prove commercial rights.');
