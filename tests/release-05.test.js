import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {DOMParser} from '@xmldom/xmldom';
import {parseCAP,capTime,ipawsPublic,CAPInbox} from '../src/cap.js';
import {analyzeSignal} from '../src/signal.js';
import {createWasmSpectrum} from '../src/fft-wasm.js';
import {createFlagProvider} from '../server/flag-provider.js';
import {flagsFromEnv,evaluateFlags} from '../shared/flags.js';
import {createSourceMonitor,PROBES} from '../server/source-health.js';
import {mockSourceFetch} from '../server/source-fixtures.js';
import {valueLineage} from '../src/lineage.js';
const info='<info><category>Met</category><event>Fixture only</event><urgency>Expected</urgency><severity>Moderate</severity><certainty>Likely</certainty><expires>2026-01-02T00:00:00-00:00</expires></info>';
const msg=({id='a',sender='example.test',sent='2026-01-01T00:00:00-00:00',status='Actual',type='Alert',scope='Public',extra='<code>IPAWSv1.0</code>',body=info}={})=>'<alert xmlns="urn:oasis:names:tc:emergency:cap:1.2"><identifier>'+id+'</identifier><sender>'+sender+'</sender><sent>'+sent+'</sent><status>'+status+'</status><msgType>'+type+'</msgType><scope>'+scope+'</scope>'+extra+body+'</alert>';
const parse=x=>parseCAP(x,DOMParser);
test('CAP strict validates full required metadata, info and order',()=>{
 const a=parse(msg());assert.equal(a.info[0].event,'Fixture only');assert.equal(a.trust,'unverified');assert.ok(ipawsPublic(a).coreChecksPassed);assert.equal(ipawsPublic(a).official,false);
 for(const field of ['identifier','sender','sent','status','msgType','scope','category','event','urgency','severity','certainty'])assert.throws(()=>parse(msg().replace(new RegExp('<'+field+'>.*?</'+field+'>'),'')),field);
 assert.throws(()=>parse(msg().replace('<identifier>a</identifier>','<identifier>a</identifier><identifier>b</identifier>')));
 assert.throws(()=>parse(msg().replace('<category>Met</category>','<category>bogus</category>')));
 assert.throws(()=>parse(msg().replace('<scope>Public</scope>','<scope>Private</scope>')));
 assert.throws(()=>parse(msg().replace('<event>Fixture only</event>','<unknown/>')));
 assert.throws(()=>parse('<!DOCTYPE alert [<!ENTITY x "bad">]>'+msg()));
});
test('CAP datetime rejects coercion and nonstandard UTC designators',()=>{
 for(const t of ['2026-02-30T00:00:00-00:00','2026-01-01T00:00:00Z','2026-01-01T00:00:00','2026-01-01T00:00:00+00:00','2026-01-01T25:00:00-00:00','2026-01-01T00:00:00+14:01'])assert.throws(()=>capTime(t),t);
 assert.equal(capTime('2024-02-29T01:00:00+01:00'),Date.UTC(2024,1,29));
});
test('CAP references resolve exact earlier message and never trust file sender',()=>{
 const a=parse(msg()),inbox=new CAPInbox(),reference='example.test,a,2026-01-01T00:00:00-00:00';
 const args={id:'b',type:'Update',sent:'2026-01-01T00:05:00-00:00',extra:'<code>IPAWSv1.0</code><references>'+reference+'</references>'};
 const b=parse(msg(args));
 assert.throws(()=>parse(msg({...args,extra:''})));
 assert.throws(()=>parse(msg({...args,extra:'<references>example.test,a,invalid</references>'})));
 assert.throws(()=>parse(msg({...args,extra:'<references>'+reference+' '+reference+'</references>'})));
 assert.equal(inbox.ingest(b).state,'unresolved-references');assert.equal(inbox.ingest(a).state,'accepted-local-untrusted');
 assert.equal(inbox.ingest(parse(msg({...args,sender:'other.test'}))).state,'reference-conflict');
 assert.equal(inbox.ingest(b).state,'accepted-local-untrusted');assert.ok(inbox.isSuperseded(a));assert.equal(inbox.ingest(b).state,'duplicate');
 const c=parse(msg({id:'c',type:'Cancel',sent:'2026-01-01T00:10:00-00:00',extra:'<references>example.test,b,2026-01-01T00:05:00-00:00</references>',body:''}));assert.equal(inbox.ingest(c).state,'accepted-local-untrusted');assert.ok(inbox.isSuperseded(b));
});
test('IPAWS public constraints fail independently of base CAP',()=>{
 for(const args of [{status:'Test'},{extra:''},{scope:'Restricted',extra:'<restriction>internal</restriction><code>IPAWSv1.0</code>'},{body:info.replace(/<expires>.*?<\/expires>/,'')}])assert.equal(ipawsPublic(parse(msg(args))).coreChecksPassed,false);
});
test('WASM FFT matches JS across windows and up to 65536 Float64 samples',async()=>{
 const transform=await createWasmSpectrum(await readFile(new URL('../src/fft-kernel.wasm',import.meta.url)));
 for(const n of [8,8192,65536])for(const window of ['rectangular','hann','hamming','blackman']){
  const s=Float64Array.from({length:n},(_,i)=>2*Math.sin(2*Math.PI*3*i/n)+.3*Math.cos(2*Math.PI*i/n)+1);
  const a=analyzeSignal(s,n,{window,detrend:true}),b=analyzeSignal(s,n,{window,detrend:true,transform});
  assert.equal(a.peak.frequency,b.peak.frequency);
  for(let i=0;i<a.bins.length;i++){assert.ok(Math.abs(a.bins[i].amplitude-b.bins[i].amplitude)<1e-10);assert.ok(Math.abs(a.bins[i].powerDensity-b.bins[i].powerDensity)<1e-10);}
 }
});
test('feature flags allow only boolean known defaults, including GrowthBook snapshots',()=>{
 assert.equal(flagsFromEnv('{"features":{"newRadar":{"defaultValue":false,"rules":[]}}}').newRadar,false);
 assert.equal(evaluateFlags({newRadar:{defaultValue:false,rules:[{}]},unknown:true}).newRadar,true);
 assert.equal(evaluateFlags({unknown:true}).unknown,undefined);
});
test('source monitor distinguishes delayed, healthy, reachable and unavailable, caches and deduplicates',async()=>{
 let n=0;const monitor=createSourceMonitor({mode:'mock',fetcher:async url=>{n++;return url.includes('eonet')?new Response('',{status:503}):mockSourceFetch(url);}});
 const [a,b]=await Promise.all([monitor.get(),monitor.get()]);assert.deepEqual(a,b);assert.equal(n,PROBES.length);assert.equal(a.mode,'mock');
 assert.equal(a.sources.find(x=>x.id==='gdacs').state,'delayed');assert.equal(a.sources.find(x=>x.id==='usgs').state,'healthy');assert.equal(a.sources.find(x=>x.id==='nws').state,'reachable');assert.equal(a.sources.find(x=>x.id==='eonet').state,'unavailable');
 await monitor.get();assert.equal(n,PROBES.length);
});
test('lineage keeps field, source time, retrieval and status distinct',()=>{
 const a=valueLineage({source:'USGS',kind:'observed',sourceUrl:'https://earthquake.usgs.gov/',retrieved:123,state:'stale'},'magnitude',{time:'2026-01-01',unit:'Mw',record:'test'});assert.equal(a.sourceTime,'2026-01-01');assert.equal(a.retrievedAt,123);assert.equal(a.state,'stale');assert.equal(valueLineage(null,'x'),null);
});

test('GrowthBook provider only consumes simple boolean definitions and retains last known config on failure',async()=>{let t=0,n=0;const f=createFlagProvider({clientKey:'sdk_fixture',now:()=>t,fetcher:async()=>{n++;if(n>1)throw Error('offline');return Response.json({features:{newRadar:{defaultValue:false,rules:[]},capStrict:{defaultValue:false,rules:[{}]}}});}});assert.equal((await f.get()).newRadar,false);assert.equal((await f.get()).capStrict,true);assert.equal(n,1);t=61000;assert.equal((await f.get()).newRadar,false);assert.equal(n,2);});
