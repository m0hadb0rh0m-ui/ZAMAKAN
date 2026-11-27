import test from 'node:test';
import assert from 'node:assert/strict';
import {coordinateQuery,photonResults,maptilerResults,searchPlaces} from '../src/search.js';
test('coordinate parsing follows lat, lon convention including Arabic digits',()=>{assert.equal(coordinateQuery('٣١.٣٥، ٣٤.٣١').lon,34.31);assert.equal(coordinateQuery('91,3'),null);});
test('real geocoder distinguishes street, building address and named POI',()=>{const f=(p,c=[34,31])=>({geometry:{coordinates:c},properties:p});const rows=photonResults({features:[f({type:'street',name:'Main'}),f({street:'Main',housenumber:'42'}),f({osm_key:'amenity',name:'Hospital'}),f({name:'Invalid'},[34,999])]});assert.deepEqual(rows.map(x=>x.type),['street','address','poi']);});
test('reverse search transmits correct order to configured source',async()=>{let url;const result=await searchPlaces('',{reverse:true,position:{lon:34,lat:31},key:'',fetcher:async u=>{url=u;return {ok:true,json:async()=>({features:[]})}}});assert.match(url,/reverse\/\?limit=1&lon=34&lat=31/);assert.deepEqual(result,[]);});
test('MapTiler normalized result uses place type',()=>assert.equal(maptilerResults({features:[{center:[34,31],text:'Test',place_type:['address']} ]})[0].type,'address'));
test('network error does not fabricate a result',async()=>await assert.rejects(searchPlaces('Gaza',{key:'',fetcher:async()=>{throw Error('offline')}})));
