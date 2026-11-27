import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleGrid,weatherFeatures,fetchWeatherGrid} from '../src/weather-layer.js';
test('weather samples use nine valid positions in the requested viewport',()=>{const v={getEast:()=>35,getWest:()=>34,getSouth:()=>31,getNorth:()=>32};const pts=sampleGrid(v);assert.equal(pts.length,9);assert(pts.every(p=>p.lon>34&&p.lon<35&&p.lat>31&&p.lat<32));});
test('only actual finite model data is retained, no fake measurements',()=>{const fs=weatherFeatures([{longitude:34,latitude:31,current:{time:'2026-01-01T12:00',temperature_2m:0,cloud_cover:null}},{longitude:500,latitude:31,current:{time:'x'}}]);assert.equal(fs.length,1);assert.equal(fs[0].properties.temperature_2m,0);assert(!('cloud_cover' in fs[0].properties));});
test('batch fetch rejects oversized grids and provider failures',async()=>{await assert.rejects(fetchWeatherGrid([]));await assert.rejects(fetchWeatherGrid([{lon:34,lat:31}],null,async()=>({ok:false,status:429})));});
