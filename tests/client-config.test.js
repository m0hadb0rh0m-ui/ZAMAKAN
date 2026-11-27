import test from 'node:test';
import assert from 'node:assert/strict';
import {publicClientConfig,makeClientConfigHandler} from '../server/client-config.js';
import {applyClientConfig,clientCapabilities,loadClientConfig,mapTilerKey,configuredIonToken} from '../src/provider-config.js';
test('only the allowlisted public credentials and weather capability are serialized',()=>{
 const env={MAPTILER_PUBLIC_KEY:'test-public-map',CESIUM_PUBLIC_TOKEN:'eytest.payload.signature',OPEN_METEO_COMMERCIAL_KEY:'never-expose-this',ANDROID_STORE_PASSWORD:'private',WEATHER_DAILY_BUDGET:'60',WEATHER_MINUTE_BUDGET:'5'};
 const config=publicClientConfig(env);
 assert.deepEqual(config,{version:1,mapTilerPublicKey:'test-public-map',cesiumPublicToken:'eytest.payload.signature',weatherEnabled:true});
 assert.ok(!JSON.stringify(config).includes('never-expose-this'));assert.ok(!JSON.stringify(config).includes('private'));
 assert.equal(publicClientConfig({...env,WEATHER_DAILY_BUDGET:'0'}).weatherEnabled,false);
 assert.equal(publicClientConfig({MAPTILER_PUBLIC_KEY:'invalid!',CESIUM_PUBLIC_TOKEN:'bad'}).mapTilerPublicKey,'');
});
test('configuration endpoint restricts browser origins, rejects mutations and prevents caching',()=>{
 const handler=makeClientConfigHandler({CLIENT_CONFIG_ALLOWED_ORIGINS:'https://localhost'});
 const send=(code,body,headers)=>({code,body:JSON.parse(body),headers});
 const run=(origin,method='GET',query='')=>handler({method,headers:{origin}},new URL('https://example.com/api/client-config'+query),send);
 assert.equal(run('https://other.example').code,403);assert.equal(run('https://localhost','POST').code,400);assert.equal(run('https://localhost','GET','?key=bad').code,400);
 const result=run('https://localhost');assert.equal(result.code,200);assert.equal(result.headers['Access-Control-Allow-Origin'],'https://localhost');assert.match(result.headers['Cache-Control'],/no-store/);
});
test('config enables capabilities, validates format and can revoke without app rebuild',async()=>{
 applyClientConfig({version:1,mapTilerPublicKey:'test-public-key',cesiumPublicToken:'eytest.payload.signature',weatherEnabled:true});
 assert.deepEqual(clientCapabilities(),{maps:true,reality:true,weather:true});
 assert.equal(mapTilerKey(),'test-public-key');assert.equal(configuredIonToken(),'eytest.payload.signature');
 await loadClientConfig('https://example.com/api/client-config',{fetcher:async(url,opts)=>{assert.equal(opts.cache,'no-store');return {ok:true,json:async()=>({version:1,mapTilerPublicKey:'',cesiumPublicToken:'',weatherEnabled:false})};}});
 assert.deepEqual(clientCapabilities(),{maps:false,reality:false,weather:false});
 assert.throws(()=>applyClientConfig({version:2}));
});
