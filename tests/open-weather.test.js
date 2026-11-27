import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {validateSnapshot,modelResponse,createSnapshotStore,cells} from '../server/open-weather.js';
import {makeWeatherGateway} from '../server/weather-gateway.js';
import {publicClientConfig} from '../server/client-config.js';
import {gridValue,forecastValue,validateGlobal} from '../src/global-weather.js';
const array=v=>Array(65160).fill(v);
function fixture(model='ifs',run=Date.now()-3600000){
 const t=new Date(run).toISOString();
 return {version:1,model,source:model==='gfs'?'NOAA GFS':'ECMWF',run:t,grid:{north:90,west:0,width:360,height:181,spacing:1},frames:[{time:new Date(run+6*3600000).toISOString(),fields:{'2t':array(20),'10u':array(3),'10v':array(4),sp:array(1001),tcc:array(60)}}]};
}
test('independent weather samples real grid values, units and unavailable fields',()=>{
 const d=validateSnapshot(fixture(),'ifs'),q=new URLSearchParams({latitude:'31,32',longitude:'34,35',current:'temperature_2m,wind_speed_10m,precipitation'});
 const results=modelResponse(d,q);
 assert.equal(results[0].current.temperature_2m,20);assert.equal(results[0].current.wind_speed_10m,18);assert.equal(results[0].current.precipitation,null);
 assert.equal(results[0].current_units.temperature_2m,'°C');assert.equal(results[1].source,'ECMWF');assert.equal(cells(d.frames[0],0,0).wind_direction_10m,216.86989764584402);
});
test('grid interpolation handles seam, masks missing samples, validates model',()=>{
 const d=fixture(),frame=d.frames[0],global=validateGlobal({...d,frame});
 assert.equal(gridValue(global,'2t',-179.9,10),20);assert.equal(forecastValue(global,'wind_speed_10m',179.5,45),18);
 frame.fields['2t'][90*360]=null;assert.equal(gridValue(global,'2t',0,0),null);
 assert.throws(()=>validateSnapshot({...d,grid:{...d.grid,width:1}},'ifs'));
});
test('keyless gateway reads valid snapshot, uses GFS fallback and refuses unavailable data',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'zamakan-weather-test-'));
 try{
  await writeFile(join(dir,'gfs.json'),JSON.stringify(fixture('gfs')));
  const env={WEATHER_DATA_DIR:dir,WEATHER_DAILY_BUDGET:'100',WEATHER_MINUTE_BUDGET:'100'};
  const store=createSnapshotStore(env);assert.equal((await store.get('weather')).model,'gfs');
  assert.equal(publicClientConfig(env).weatherEnabled,true);
  const h=makeWeatherGateway(env,()=>{throw Error('Must not call paid service');});
  const call=path=>h({method:'GET',headers:{}},null,new URL('http://localhost/api/weather/'+path),(code,body)=>({code,data:JSON.parse(body)}));
  const r=await call('weather?latitude=31&longitude=34&current=temperature_2m');assert.equal(r.code,200);assert.equal(r.data.current.temperature_2m,20);
  const g=await call('global?model=ifs');assert.equal(g.code,200);assert.equal(g.data.model,'gfs');
  assert.equal((await call('global?model=aifs-single')).code,503);
  assert.equal((await call('air?latitude=31&longitude=34&current=pm10')).code,502);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('expired data cannot masquerade as current conditions',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'zamakan-old-test-'));
 try{await writeFile(join(dir,'ifs.json'),JSON.stringify(fixture('ifs',Date.now()-48*3600000)));await assert.rejects(createSnapshotStore({WEATHER_DATA_DIR:dir}).get('weather'));}
 finally{await rm(dir,{recursive:true,force:true});}
});
