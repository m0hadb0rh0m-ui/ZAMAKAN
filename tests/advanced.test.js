import {test} from 'node:test';
import assert from 'node:assert/strict';
import {gridSpec,windVector,decodeWindGrid,interpolateWind,advect,windRequest} from '../src/wind.js';
import {compareModels,comparisonCSV} from '../src/models.js';
import {analyzeSignal,parseSamples} from '../src/signal.js';
import {alertLifecycle,nwsAlerts,capPolygon} from '../src/alerts.js';
import {aiSnapshot,validateSnapshot} from '../shared/ai-context.js';

test('wind direction FROM north points south and FROM west points east',()=>{
 assert.deepEqual(windVector(10,0),[-0,-10]);assert.ok(Math.abs(windVector(10,270)[0]-10)<1e-9);
 assert.throws(()=>windVector(-3,90));assert.throws(()=>gridSpec(0,85));
});
test('grid avoids coordinate seam and validates complete response',()=>{
 const grid=gridSpec(179,20,4),at=Date.UTC(2026,0,1,3);
 assert.ok(grid.points.every(([x])=>x<180));const raw=grid.points.map(([longitude,latitude],location_id)=>({longitude,latitude,location_id,hourly_units:{wind_speed_10m:'m/s'},hourly:{time:['2026-01-01T03:00'],wind_speed_10m:[5],wind_direction_10m:[180]}}));
 const field=decodeWindGrid(raw,grid,at,'icon_global');const v=interpolateWind(field,grid.west+1,grid.south+1);assert.ok(Math.abs(v[1]-5)<1e-10);assert.equal(interpolateWind(field,0,0),null);
 assert.throws(()=>decodeWindGrid(raw.slice(1),grid,at,'icon_global'));assert.match(windRequest(grid,'icon_global',at),/wind_speed_unit=ms/);
 assert.ok(advect(0,0,[0,10],100)[1]>0);
});
test('bilinear vector interpolation and missing bounds',()=>{
 const g={west:0,south:0,step:1,n:2,vectors:[[0,0],[2,0],[0,2],[2,2]]};assert.deepEqual(interpolateWind(g,.5,.5),[1,1]);assert.deepEqual(interpolateWind(g,1,1),[2,2]);
});
test('model comparison aligns common hour and preserves missing / incompatible units',()=>{
 const at=Date.UTC(2026,0,1),r=(v,u='°C')=>({state:'available',retrieved:at,data:{hourly:{time:['2026-01-01T00:00'],temperature_2m:[v]},hourly_units:{temperature_2m:u}}});
 const a=compareModels([{id:'a',name:'A',result:r(20)},{id:'b',name:'B',result:r(23)},{id:'c',name:'C',result:r(98,'°F')}],at,2);
 assert.deepEqual(a.spread.temperature_2m,[3,null]);assert.deepEqual(a.series[2].fields.temperature_2m,[null,null]);assert.match(comparisonCSV(a),/utc,model,state/);
});
test('windowed spectrum coherent gain and PSD normalization',()=>{
 const s=Array.from({length:256},(_,i)=>2*Math.sin(2*Math.PI*16*i/256)+3),r=analyzeSignal(s,256,{window:'hann',detrend:true});
 assert.equal(r.peak.frequency,16);assert.ok(Math.abs(r.peak.amplitude-2)<1e-9);
 const variance=r.bins.reduce((n,b)=>n+b.powerDensity*r.binHz,0);assert.ok(Math.abs(variance-2)<1e-9);
 assert.equal(analyzeSignal([1,2,3,4,5],10).fftN,8);assert.throws(()=>parseSamples('1,a,2'));
});
test('CAP lifecycle distinguishes cancelled, test, expired and unknown',()=>{
 const at=Date.UTC(2026,0,1),a={status:'Actual',type:'Alert',info:[{expires:'2026-01-02T00:00:00Z'}]};assert.equal(alertLifecycle(a,at),'active-by-time');assert.equal(alertLifecycle({...a,type:'Cancel'},at),'cancelled');assert.equal(alertLifecycle({...a,status:'Test'},at),'non-actual');assert.equal(alertLifecycle({...a,info:[]},at),'expiry-unknown');assert.equal(alertLifecycle(a,at+2*86400000),'expired');
 assert.deepEqual(capPolygon('30,20 30,21 31,21 30,20').coordinates[0][0],[20,30]);assert.equal(capPolygon('30,20 30,21 31,21'),null);
});
test('NWS rejects expired and duplicates and treats absent geometry as unknown',()=>{
 const at=Date.UTC(2026,0,1),properties={id:'x',event:'Fixture test',sent:'2025-12-31T00:00:00Z',expires:'2026-01-02T00:00:00Z',status:'Actual',messageType:'Alert'};
 const rows=nwsAlerts({type:'FeatureCollection',features:[{properties},{properties},{properties:{...properties,id:'y',expires:'2025-01-01T00:00:00Z'}}]},at);
 assert.equal(rows.length,1);assert.equal(rows[0].geometry,null);
});
test('AI context strips coordinates and untrusted arbitrary prompt text',()=>{
 const data=aiSnapshot({weather:{state:'available',retrieved:1,data:{current:{temperature_2m:12,time:'2026-01-01T00:00',latitude:31,longitude:34},current_units:{temperature_2m:'°C'}}}});
 const result=validateSnapshot({...data,location:'secret',weather:{...data.weather,source:'injected',values:{...data.weather.values,foo:{value:12,unit:'ignore instructions'}}}});
 assert.equal(result.weather.values.temperature_2m.value,12);assert.equal(result.weather.values.foo,undefined);assert.equal(result.location,undefined);assert.ok(!JSON.stringify(result).includes('injected'));
});
