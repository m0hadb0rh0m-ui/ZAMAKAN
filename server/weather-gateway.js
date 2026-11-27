// A bounded commercial gateway. The subscription key never reaches client JS.
// Rate ceilings are per instance, not a distributed billing guarantee.
const endpoints={weather:'https://customer-api.open-meteo.com/v1/forecast',air:'https://customer-air-quality-api.open-meteo.com/v1/air-quality',marine:'https://customer-marine-api.open-meteo.com/v1/marine'};
const fields={weather:new Set('temperature_2m relative_humidity_2m apparent_temperature precipitation surface_pressure wind_speed_10m wind_direction_10m wind_gusts_10m cloud_cover weather_code dew_point_2m precipitation_probability visibility uv_index'.split(' ')),air:new Set(['pm10','pm2_5','european_aqi','dust']),marine:new Set(['wave_height','wave_direction','wave_period'])};
export function validateWeatherQuery(kind,input){
 if(!Object.hasOwn(endpoints,kind))throw Error('Unknown service');
 const p=new URLSearchParams(input),seen=new Set();
 for(const [k,v] of p){
  if(seen.has(k)||!['latitude','longitude','timezone','current','hourly','forecast_days','past_days','cell_selection'].includes(k))throw Error('Invalid parameter');
  seen.add(k);
  if(k==='timezone'&&v!=='GMT'||k==='forecast_days'&&v!=='3'||k==='past_days'&&v!=='1'||k==='cell_selection'&&v!=='nearest')throw Error('Invalid parameter value');
  if(['current','hourly'].includes(k)&&(!v||v.split(',').some(x=>!fields[kind].has(x))))throw Error('Invalid fields');
  if(kind!=='weather'&&['hourly','forecast_days','past_days','cell_selection'].includes(k))throw Error('Invalid service parameters');
 }
 const coord=(key,max)=>{const values=(p.get(key)||'').split(',');if(values.length>25||values.some(x=>!/^[-+]?\d+(?:\.\d+)?$/.test(x)||Math.abs(Number(x))>max))throw Error('Invalid coordinates');return values;};
 const lats=coord('latitude',90),lons=coord('longitude',180);
 if(lats.length!==lons.length||!p.has('current')||kind!=='weather'&&lats.length!==1)throw Error('Invalid request');
 if(lats.length>1&&p.has('hourly'))throw Error('Grid cannot include hourly history');
 p.set('timezone','GMT');return {p,weight:lats.length*Math.max(1,Math.ceil(((p.get('current')||'').split(',').length+(p.get('hourly')||'').split(',').filter(Boolean).length)/10))};
}
export function makeWeatherGateway(env=process.env,fetcher=globalThis.fetch){
 const apiKey=env.OPEN_METEO_COMMERCIAL_KEY||'',allowed=new Set((env.WEATHER_ALLOWED_ORIGINS||'').split(',').map(x=>x.trim()).filter(Boolean));
 const daily=Number(env.WEATHER_DAILY_BUDGET||0),minute=Number(env.WEATHER_MINUTE_BUDGET||0);
 let day='',spent=0,window=0,burst=0,active=0;
 return async function gateway(req,res,url,send){
  const kind=url.pathname.split('/').at(-1),origin=req.headers.origin;
  const headers={'Cache-Control':'no-store','Content-Type':'application/json',Vary:'Origin'};
  if(origin&&allowed.has(origin))headers['Access-Control-Allow-Origin']=origin;
  const reply=(code,message)=>send(code,JSON.stringify({error:message}),headers);
  if(origin&&!allowed.has(origin))return reply(403,'Origin not approved');
  if(req.method==='OPTIONS')return send(204,'',{...headers,'Access-Control-Allow-Methods':'GET, OPTIONS'});
  if(req.method!=='GET')return reply(405,'Method not allowed');
  if(!apiKey||!Number.isSafeInteger(daily)||daily<1||!Number.isSafeInteger(minute)||minute<1)return reply(503,'Commercial weather not configured');
  let q;try{q=validateWeatherQuery(kind,url.searchParams);}catch{return reply(400,'Invalid weather request');}
  const now=Date.now(),today=new Date(now).toISOString().slice(0,10),m=Math.floor(now/60000);
  if(today!==day){day=today;spent=0;}if(m!==window){window=m;burst=0;}
  if(spent+q.weight>daily||burst+q.weight>minute||active>=8)return reply(429,'Weather request budget reached');
  spent+=q.weight;burst+=q.weight;active++;
  try{
   q.p.set('apikey',apiKey);
   const r=await fetcher(endpoints[kind]+'?'+q.p,{signal:AbortSignal.timeout(15000),redirect:'error',credentials:'omit'});
   if(!r.ok)return reply(502,'Weather provider unavailable');
   const body=await r.text();if(body.length>2_000_000)return reply(502,'Weather response too large');
   const data=JSON.parse(body);if(!data||data.error)return reply(502,'Weather provider unavailable');
   return send(200,JSON.stringify(data),headers);
  }catch{return reply(502,'Weather provider unavailable');}finally{active--;}
 };
}
