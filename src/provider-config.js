// A public client credential is not a secret; never accept account/admin credentials.
let mapKey=(import.meta.env?.VITE_MAPTILER_PUBLIC_KEY||'').trim();
const normalize=v=>String(v??'').trim();
export function mapTilerKey(){return mapKey;}
export function clearMapTiler(){mapKey='';}
export async function authorizeMapTiler(value,{fetcher=globalThis.fetch,signal}={}){
 const key=normalize(value);
 if(!/^[A-Za-z0-9_-]{8,160}$/.test(key))throw Error('Invalid public key format');
 const url='https://api.maptiler.com/maps/satellite-v4/style.json?key='+encodeURIComponent(key);
 const timeout=AbortSignal.timeout(12000);
 const r=await fetcher(url,{signal:signal?AbortSignal.any([signal,timeout]):timeout,credentials:'omit'});
 if(!r.ok)throw Error('Satellite provider rejected key or plan');
 const s=await r.json();if(s?.version!==8||!s.sources||!Array.isArray(s.layers)||!Object.values(s.sources).some(x=>x.type==='raster'))throw Error('Invalid satellite style');
 if(signal?.aborted)throw new DOMException('Aborted','AbortError');
 mapKey=key;return true;
}
export function ionToken(value){
 const t=normalize(value);
 // Cesium ion client access tokens are JWT-shaped, not account passwords.
 if(t.length>4096||!/^ey[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(t))throw Error('Invalid client token');
 return t;
}
