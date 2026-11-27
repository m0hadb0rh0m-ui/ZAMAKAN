// Build-time profile: previews keep existing free research endpoints; commercial
// builds never silently use a non-commercial endpoint.
const env=import.meta.env||{};
export const COMMERCIAL=env.VITE_RELEASE_MODE==='commercial';
export const CONFIGURED_ION=(env.VITE_CESIUM_PUBLIC_TOKEN||'').trim();
export function approvedWeatherBase(value){
 try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.search&&!u.hash?u.href.replace(/\/$/,''):'';}catch{return '';}
}
export const WEATHER_BASE=approvedWeatherBase(env.VITE_WEATHER_API_BASE||'');
export const weatherKinds=['weather','air','marine'];
export const freeWeatherEndpoints={weather:'https://api.open-meteo.com/v1/forecast',air:'https://air-quality-api.open-meteo.com/v1/air-quality',marine:'https://marine-api.open-meteo.com/v1/marine'};
export function weatherEndpoint(kind,{commercial=COMMERCIAL,base=WEATHER_BASE}={}){
 if(!weatherKinds.includes(kind))throw Error('Invalid weather service');
 if(!commercial)return freeWeatherEndpoints[kind];
 const approved=approvedWeatherBase(base);
 if(!approved)throw Error('Licensed weather gateway not configured');
 return approved+'/'+kind;
}
