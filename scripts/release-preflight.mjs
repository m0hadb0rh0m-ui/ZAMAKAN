// Checks access, not legal entitlement. The owner must separately confirm
// the commercial agreement and real device acceptance.
import {authorizeMapTiler,ionToken} from '../src/provider-config.js';
import {approvedWeatherBase} from '../src/release-config.js';
const {VITE_MAPTILER_PUBLIC_KEY:key,VITE_CESIUM_PUBLIC_TOKEN:raw,VITE_WEATHER_API_BASE:base}=process.env;
if(!key||!raw||!approvedWeatherBase(base))throw Error('Missing commercial provider configuration');
const fail=label=>{throw Error(label+' access preflight failed (check account, restrictions and entitlement)')};
try{await authorizeMapTiler(key);}catch{fail('MapTiler satellite');}
try{
 const token=ionToken(raw),r=await fetch('https://api.cesium.com/v1/assets/2275207/endpoint',{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(12000),redirect:'error'});
 if(!r.ok)fail('Cesium');const d=await r.json();if(!d.url)fail('Cesium');
}catch{fail('Cesium photorealistic');}
try{
 const endpoint=approvedWeatherBase(base)+'/weather?latitude=40.7484&longitude=-73.9857&current=temperature_2m&timezone=GMT';
 const r=await fetch(endpoint,{signal:AbortSignal.timeout(18000),redirect:'error',headers:{Origin:'https://localhost'}});if(!r.ok||!(await r.json())?.current)fail('Weather gateway');
 if(r.headers.get('access-control-allow-origin')!=='https://localhost')fail('Weather Android CORS');
}catch{fail('Weather gateway');}
const service=approvedWeatherBase(process.env.VITE_ZAMAKAN_API_BASE||'');
if(!service)throw Error('Missing PRIME backend URL');
try{
 const r=await fetch(service+'/api/prime/config',{headers:{Origin:'https://localhost'},signal:AbortSignal.timeout(15000)});
 if(!r.ok||!(await r.json()).enabled||r.headers.get('access-control-allow-origin')!=='https://localhost')throw Error('Backend unavailable');
}catch{fail('PRIME backend');}
console.log('Provider access preflight succeeded. Commercial rights require owner confirmation.');
