import test from 'node:test';
import assert from 'node:assert/strict';
import {dateRange,climateQuery,decodeClimate,compareClimate,climateCSV} from '../src/climate.js';
import {validateProject,getProjects,putProjects} from '../src/projects.js';
import {fetchSource,nearestHour,gibsTiles} from '../src/data.js';
import {modules,MAP_MODULES} from '../src/navigation.js';
const fixture=(days,temp,rain)=>({latitude:31.5,longitude:34.5,daily_units:{temperature_2m_mean:'°C',precipitation_sum:'mm'},daily:{time:days,temperature_2m_mean:temp,precipitation_sum:rain}});
test('ERA5 query explicitly selects reanalysis and validates date range',()=>{
 assert.match(climateQuery(34,31,'2020-01-01','2020-01-02'),/models=era5/);
 assert.throws(()=>dateRange('1939-01-01','1940-01-01'));
 assert.throws(()=>dateRange('2021-02-30','2021-03-01'));
 assert.throws(()=>dateRange('1940-01-01','2020-01-01'));
});
test('ERA5 missing days remain null; missing precipitation cannot become a total',()=>{
 const a=decodeClimate(fixture(['2020-01-01'],[20],[0]),'2020-01-01','2020-01-02');
 assert.deepEqual(a.rows[1],{date:'2020-01-02',temp:null,rain:null});
 assert.match(climateCSV(a.rows),/2020-01-02,,,ERA5/);
 const b=decodeClimate(fixture(['2010-01-01','2010-01-02'],[10,14],[1,2]),'2010-01-01','2010-01-02');
 const q=compareClimate(a.rows,b.rows);assert.equal(q.temperature,null);assert.equal(q.precipitation,null);
 assert.throws(()=>decodeClimate(fixture(['2020-01-01','2020-01-01'],[3,4],[0,1]),'2020-01-01','2020-01-02'));
});
test('ERA5 aligned complete reference comparison only',()=>{
 const a=decodeClimate(fixture(['2020-01-01','2020-01-02'],[20,22],[0,3]),'2020-01-01','2020-01-02');
 const b=decodeClimate(fixture(['2010-01-01','2010-01-02'],[10,14],[1,2]),'2010-01-01','2010-01-02');
 const q=compareClimate(a.rows,b.rows);assert.equal(q.temperature,9);assert.equal(q.precipitation,0);
 assert.equal(compareClimate(a.rows,[{date:'2010-02-01',temp:1,rain:2}]).temperature,null);
});
test('climate adapter rejects HTTP and mismatched units rather than fabricating',async()=>{
 const q=climateQuery(34,31,'2020-01-01','2020-01-02');
 const r=await fetchSource('climate',q,async()=>({ok:true,json:async()=>fixture(['2020-01-01','2020-01-02'],[20,22],[0,3])}));
 assert.equal(r.kind,'reanalysis');assert.equal(r.data.rows.length,2);
 const r2=await fetchSource('climate',climateQuery(35,31,'2020-01-01','2020-01-02'),async()=>({ok:false,status:503}));assert.equal(r2.state,'unavailable');assert.equal(r2.data,null);
});
test('local project roundtrip validates bounds and drops unrelated private fields',()=>{
 let raw;const storage={getItem:()=>raw,setItem:(_,v)=>{raw=v;}};const p={id:'1',name:'AOI',position:{lat:31,lon:34},mode:'flat',at:Date.now(),token:'secret',opacity:2,points:[{lat:0,lon:0}],filter:{hours:168}};
 putProjects([p],storage);const [q]=getProjects(storage);assert.equal(q.name,'AOI');assert.equal(q.opacity,1);assert.equal(q.filter.hours,168);assert.ok(!('token' in q));assert.throws(()=>validateProject({...p,position:{lat:91,lon:0}}));
});
test('timeline refuses non-nearby samples and invalid image calendar dates',()=>{assert.equal(nearestHour({hourly:{time:['2020-01-01T01:00'],temperature_2m:[4]}},Date.parse('2020-01-01T00:00Z')),null);assert.throws(()=>gibsTiles('2021-02-30'));});
test('new independent scientific modules exist and do not require map',()=>{for(const t of ['climate','imagery','projects','gis']){assert.ok(modules.some(x=>x[0]===t));assert.ok(!MAP_MODULES.has(t));}});
