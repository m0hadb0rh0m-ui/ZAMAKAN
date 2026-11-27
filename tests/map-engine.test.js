import test from 'node:test';
import assert from 'node:assert/strict';
import {styleUrl,prepareStyle,zoomFor,gpsZoom,restoreOverlays} from '../src/map-engine.js';
test('production map default is OpenFreeMap, no key required',()=>assert.equal(styleUrl('streets',''),'https://tiles.openfreemap.org/styles/liberty'));
test('paid-provider styles are strictly opt-in',()=>{assert.throws(()=>styleUrl('satellite',''));assert.match(styleUrl('satellite','test'),/satellite-v4\/style.json\?key=test/);});
test('camera scale varies by geographic result',()=>{assert.equal(zoomFor('country'),5);assert.equal(zoomFor('city'),12);assert.equal(zoomFor('district'),14);assert.equal(zoomFor('address'),19);assert(gpsZoom(10)>gpsZoom(1000));});
test('building footprints remain visible and house numbers use a real vector layer',()=>{let s=prepareStyle({version:8,sources:{openmaptiles:{type:'vector'}},layers:[{id:'building',type:'fill','source-layer':'building',maxzoom:14},{id:'3d',type:'fill-extrusion'}]},'streets');assert.equal(s.layers[0].maxzoom,undefined);assert.equal(s.layers[1].layout.visibility,'none');assert.equal(s.layers[2]['source-layer'],'housenumber');});
test('overlay restoration is idempotent and clustering uses genuine event features',()=>{const sources=new Map(),layers=new Map(),m={getSource:id=>sources.get(id),addSource:(id,s)=>sources.set(id,s),getLayer:id=>layers.get(id),addLayer:l=>layers.set(l.id,l),getStyle:()=>({})};restoreOverlays(m);restoreOverlays(m);assert.equal(sources.size,3);assert.equal(layers.size,4);assert.equal(sources.get('events').cluster,true);});
