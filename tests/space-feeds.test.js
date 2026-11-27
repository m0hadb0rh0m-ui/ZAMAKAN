import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseSpaceFeed,parseOMM} from '../src/space-feeds.js';
import {orbitAt} from '../src/science.js';
test('updated NOAA one-minute feeds use active spacecraft and numeric values',()=>{
 const time_tag='2026-11-27T10:00:00Z',r=parseSpaceFeed([{time_tag,active:false,proton_speed:999},{time_tag,active:true,source:'Fixture',proton_speed:410,proton_density:0,proton_temperature:null}],'wind');
 assert.equal(r.length,1);assert.equal(r[0].values.proton_speed.value,410);assert.equal(r[0].values.proton_density.value,0);assert.equal(r[0].values.proton_temperature,undefined);
 assert.throws(()=>parseSpaceFeed([{time_tag,active:false,bt:10}],'mag'));
 assert.equal(parseSpaceFeed([{time_tag,energy:'0.1-0.8nm',flux:1e-6}],'xray')[0].values.flux.value,1e-6);
});
test('civil OMM record rejects unknown IDs and supports SGP4 at epoch',()=>{
 const fixture={NORAD_CAT_ID:25544,EPOCH:new Date().toISOString(),MEAN_MOTION:15.5,ECCENTRICITY:.0005,INCLINATION:51.64,RA_OF_ASC_NODE:100,ARG_OF_PERICENTER:200,MEAN_ANOMALY:95,BSTAR:.00005,MEAN_MOTION_DOT:.00003,MEAN_MOTION_DDOT:0};
 const r=parseOMM([fixture],'25544'),p=orbitAt(r,r.epoch);assert.ok(p.height>300&&p.height<600);assert.throws(()=>parseOMM([fixture],'12345'));assert.throws(()=>parseOMM([{...fixture,EPOCH:'2000-01-01T00:00:00Z'}],'25544'));
});
