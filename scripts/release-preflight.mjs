// Live check of owner gateway and provider access. HTTP success is not proof of
// commercial rights; confirm licenses independently. No key is printed or built in.
import {authorizeMapTiler,ionToken} from '../src/provider-config.js';
import {approvedWeatherBase} from '../src/release-config.js';
const base=approvedWeatherBase(process.env.VITE_BACKEND_URL);
if(!base)throw Error('Missing owner HTTPS backend URL');
const fail=label=>{throw Error(label+' access preflight failed (check owner setup and entitlement)')};
const headers={Origin:'https://localhost',Referer:'https://localhost/','User-Agent':'Mozilla/5.0 ZAMAKAN-ULTRA/1.0'};
let config;
try{
 const r=await fetch(base+'/api/client-config',{headers,signal:AbortSignal.timeout(12000),redirect:'error'});
 if(!r.ok||r.headers.get('access-control-allow-origin')!=='https://localhost')fail('Runtime configuration');
 config=await r.json();if(config.version!==1||!config.mapTilerPublicKey||!config.cesiumPublicToken||!config.weatherEnabled)fail('Provider configuration');
}catch{fail('Owner gateway');}
try{await authorizeMapTiler(config.mapTilerPublicKey,{fetcher:(url,options)=>fetch(url,{...options,headers})});}catch{fail('MapTiler satellite');}
try{
 const token=ionToken(config.cesiumPublicToken),r=await fetch('https://api.cesium.com/v1/assets/2275207/endpoint',{headers:{...headers,Authorization:'Bearer '+token},signal:AbortSignal.timeout(12000),redirect:'error'});
 if(!r.ok)fail('Cesium');const d=await r.json();if(!(d.externalType==='3DTILES'?d.options?.url:d.url))fail('Cesium');
}catch{fail('Cesium photorealistic');}
try{
 const endpoint=base+'/api/weather/weather?latitude=40.7484&longitude=-73.9857&current=temperature_2m&timezone=GMT';
 const r=await fetch(endpoint,{signal:AbortSignal.timeout(18000),redirect:'error',headers});
 if(!r.ok||!(await r.json())?.current)fail('Weather gateway');
 if(r.headers.get('access-control-allow-origin')!=='https://localhost')fail('Weather Android CORS');
}catch{fail('Weather gateway');}
console.log('Provider access preflight succeeded. Commercial rights require owner confirmation.');
