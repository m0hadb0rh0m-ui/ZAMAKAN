// Only provider-issued PUBLIC, read-only client credentials may be returned.
// Never return server API keys, admin/service tokens, passwords or signing keys.
export function publicClientConfig(env=process.env){
 const map=String(env.MAPTILER_PUBLIC_KEY||'').trim(),ion=String(env.CESIUM_PUBLIC_TOKEN||'').trim();
 const positive=v=>Number.isSafeInteger(Number(v))&&Number(v)>0;
 return {version:1,mapTilerPublicKey:/^[A-Za-z0-9_-]{8,160}$/.test(map)?map:'',cesiumPublicToken:ion.length<=4096&&/^ey[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(ion)?ion:'',weatherEnabled:Boolean((env.WEATHER_DATA_DIR||env.OPEN_METEO_COMMERCIAL_KEY)&&positive(env.WEATHER_DAILY_BUDGET)&&positive(env.WEATHER_MINUTE_BUDGET))};
}
export function makeClientConfigHandler(env=process.env){
 const allowed=new Set((env.CLIENT_CONFIG_ALLOWED_ORIGINS||env.WEATHER_ALLOWED_ORIGINS||'').split(',').map(i=>i.trim()).filter(Boolean));
 return (req,url,send)=>{
  const origin=req.headers.origin;
  const headers={'Cache-Control':'no-store, max-age=0','Content-Type':'application/json; charset=utf-8','Vary':'Origin'};
  if(origin&&allowed.has(origin))headers['Access-Control-Allow-Origin']=origin;
  if(origin&&!allowed.has(origin))return send(403,JSON.stringify({error:'Unavailable'}),headers);
  if(req.method!=='GET'||url.search)return send(400,JSON.stringify({error:'Unavailable'}),headers);
  return send(200,JSON.stringify(publicClientConfig(env)),headers);
 };
}
