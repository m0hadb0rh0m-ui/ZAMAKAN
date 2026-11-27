import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spectrum,parseTLE,orbitAt,groundTrack,radarFrames,buildings} from '../src/science.js';
test('FFT resolves frequency and amplitude, rejects invalid lengths',()=>{
 const bins=spectrum(Array.from({length:128},(_,i)=>3*Math.sin(2*Math.PI*12*i/128)+2),128);
 assert.ok(Math.abs(bins[12].amplitude-3)<1e-10);assert.ok(Math.abs(bins[0].amplitude-2)<1e-10);assert.throws(()=>spectrum([1,2,3],1));
});
test('FFT Nyquist amplitude is not doubled',()=>assert.equal(spectrum([2,-2,2,-2],4).at(-1).amplitude,2));
const tle='ISS (historical test fixture)\n1 25544U 98067A   19156.50900463  .00003075  00000-0  59442-4 0  9992\n2 25544  51.6433 100.2141 0005186 203.0278  94.9936 15.51119038173473';
function fixedChecksum(line){const s=line.slice(0,68);return s+[...s].reduce((a,c)=>a+(c==='-'?1:/\d/.test(c)?Number(c):0),0)%10;}
test('SGP4 calculates finite Earth position at fixture epoch and splits ground tracks',()=>{
 const corrected=tle.split('\n').map((l,i)=>i?fixedChecksum(l):l).join('\n');
 const r=parseTLE(corrected),p=orbitAt(r,r.epoch);
 assert.ok(p.height>300&&p.height<500);assert.ok(Math.abs(p.lat)<52);assert.ok(Math.abs(p.lon)<=180);
 assert.throws(()=>orbitAt(r,r.epoch+8*86400000));assert.throws(()=>parseTLE(corrected.slice(0,-1)+'x'));
 const g=groundTrack(r,r.epoch);assert.ok(g.features.length>=2);for(const f of g.features.filter(f=>f.geometry.type==='LineString'))for(let i=1;i<f.geometry.coordinates.length;i++)assert.ok(Math.abs(f.geometry.coordinates[i][0]-f.geometry.coordinates[i-1][0])<180);
});
test('Radar manifest restricts tile host and path',()=>{
 assert.throws(()=>radarFrames({host:'https://evil.example',radar:{past:[]}}));
 const f=radarFrames({host:'https://tilecache.rainviewer.com',radar:{past:[{time:1700000000,path:'/v2/radar/1700000000'},{time:1700000001,path:'/../../bad'}]}});assert.equal(f.length,1);assert.ok(f[0].tile.includes('{z}/{x}/{y}'));
});
test('3D building imports enforce geometry, numeric height and bounds',()=>{
 const x={type:'FeatureCollection',features:[{type:'Feature',geometry:{type:'Polygon',coordinates:[[[0,0],[1,0],[1,1],[0,0]]]},properties:{height:30,min_height:5,malicious:'<script>'}}]};
 assert.deepEqual(buildings(x).features[0].properties,{height:30,base:5});x.features[0].properties.height='30';assert.throws(()=>buildings(x));
});
