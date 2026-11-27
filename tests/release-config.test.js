import test from 'node:test';
import assert from 'node:assert/strict';
import {weatherEndpoint,approvedWeatherBase} from '../src/release-config.js';
import {validateWeatherQuery,makeWeatherGateway} from '../server/weather-gateway.js';
import {municipalHeight,lookupMunicipalHeight} from '../src/municipal-height.js';
test('commercial weather fails closed and uses approved HTTPS gateway only',()=>{
 assert.throws(()=>weatherEndpoint('weather',{commercial:true,base:''}));assert.equal(approvedWeatherBase('http://example.com'), '');assert.equal(approvedWeatherBase('https://u:p@example.com'), '');
 assert.equal(weatherEndpoint('air',{commercial:true,base:'https://example.com/api/weather'}),'https://example.com/api/weather/air');
});
test('weather gateway rejects credential overrides, duplicate keys, oversized grids and invalid fields',()=>{
 const valid='latitude=31&longitude=34&current=temperature_2m&timezone=GMT';
 assert.equal(validateWeatherQuery('weather',valid).weight,1);
 for(const bad of ['&apikey=bad','&longitude=35','&hourly=unknown','&forecast_days=99'])assert.throws(()=>validateWeatherQuery('weather',valid+bad));
 assert.throws(()=>validateWeatherQuery('weather','latitude=91&longitude=34&current=temperature_2m'));
});
test('gateway key is server-only and quota is enforced',async()=>{
 let called=0;const handler=makeWeatherGateway({OPEN_METEO_COMMERCIAL_KEY:'test-only',WEATHER_ALLOWED_ORIGINS:'https://localhost',WEATHER_DAILY_BUDGET:'1',WEATHER_MINUTE_BUDGET:'1'},async url=>{called++;assert.match(url,/customer-api\.open-meteo\.com/);assert.match(url,/apikey=test-only/);return {ok:true,text:async()=>JSON.stringify({current:{temperature_2m:22}})}});
 const url=new URL('http://localhost/api/weather/weather?latitude=31&longitude=34&current=temperature_2m');const run=origin=>handler({method:'GET',headers:{origin}},null,url,(status,body,headers)=>({status,body,headers}));
 assert.equal((await run('https://evil.example')).status,403);
 const result=await run('https://localhost');assert.equal(result.status,200);assert.ok(!result.body.includes('test-only'));assert.equal((await run('https://localhost')).status,429);assert.equal(called,1);
});
test('municipal record is distinct from a survey certificate, converts feet and rejects ambiguity',()=>{
 const row={doitt_id:'778052',height_roof:'1238.79032716',feature_code:'2100',geom_source:'Photogrammetric'};
 const h=municipalHeight([row]);assert.equal(h.kind,'municipal-record');assert.ok(Math.abs(h.meters-377.5833)<.01);assert.equal(h.independentlyVerified,false);assert.equal(municipalHeight([row,row]),null);assert.equal(municipalHeight([{...row,height_roof:'0'}]),null);
});
test('municipality lookup never claims worldwide coverage',async()=>assert.equal(await lookupMunicipalHeight(34,31,{fetcher:()=>{throw Error('should not call')}}),null));
