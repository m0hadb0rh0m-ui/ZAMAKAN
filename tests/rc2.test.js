import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {DOMParser} from '@xmldom/xmldom';
import {validateCapSchema} from '../src/cap-xsd.js';
import {imageryTiles,IMAGERY_PRODUCTS} from '../src/imagery.js';
import {parseGDACS} from '../src/alert-directory.js';
import {dataEnvelope} from '../src/envelope.js';
import {MODEL_IDS} from '../src/models.js';
const schema=await readFile(new URL('../src/schemas/CAP-v1.2-os.xsd',import.meta.url),'utf8');
const valid='<alert xmlns="urn:oasis:names:tc:emergency:cap:1.2"><identifier>fixture</identifier><sender>example.test</sender><sent>2025-01-01T00:00:00-00:00</sent><status>Test</status><msgType>Alert</msgType><scope>Public</scope><info><category>Met</category><event>Test</event><urgency>Expected</urgency><severity>Moderate</severity><certainty>Likely</certainty></info></alert>';
test('OASIS official XSD passes valid CAP, rejects invalid enumeration, missing mandatory element and DTD',async()=>{
 assert.equal((await validateCapSchema(valid,schema)).valid,true);
 assert.equal((await validateCapSchema(valid.replace('Moderate','wrong'),schema)).valid,false);
 assert.equal((await validateCapSchema(valid.replace('<sender>example.test</sender>',''),schema)).valid,false);
 await assert.rejects(validateCapSchema('<!DOCTYPE x>'+valid,schema),/Unsafe/);
});
test('five allowlisted imagery products, strict date and source path',()=>{assert.equal(Object.keys(IMAGERY_PRODUCTS).length,5);assert.match(imageryTiles('2025-01-01','aqua')[0],/MODIS_Aqua/);assert.match(imageryTiles('2025-01-01','terra721')[0],/Bands721/);assert.throws(()=>imageryTiles('2000-01-01','viirs20'));assert.throws(()=>imageryTiles('2025-01-01','__proto__'));});
test('GDACS point reports retain source and event identity, deduplicate and reject unsafe XML',()=>{
 const item='<item><title>Fixture test</title><pubDate>Wed, 1 Jan 2025 00:01:00 GMT</pubDate><gdacs:fromdate>Wed, 1 Jan 2025 00:00:00 GMT</gdacs:fromdate><gdacs:eventtype>EQ</gdacs:eventtype><gdacs:eventid>1</gdacs:eventid><gdacs:alertlevel>Green</gdacs:alertlevel><georss:point>1 2</georss:point><gdacs:severity unit="M" value="4.8"/></item>';
 const feed='<rss xmlns:gdacs="http://www.gdacs.org" xmlns:georss="http://www.georss.org/georss"><channel>'+item+item+'</channel></rss>';
 const r=parseGDACS(feed,DOMParser);assert.equal(r.length,1);assert.equal(r[0].kind,'reported');assert.equal(r[0].severity,4.8);assert.equal(r[0].lat,1);assert.match(r[0].url,/eventid=1/);assert.throws(()=>parseGDACS('<!DOCTYPE x>'+feed,DOMParser));
});
test('unified envelope preserves unknown issue time, valid time and model kind',()=>{const e=dataEnvelope('weather',{name:'test',kind:'forecast',url:'https://example.test',docs:'https://example.test',ttl:1},{state:'available',retrieved:1700000000000,data:{current:{time:'2025-01-01T00:00'},latitude:1,longitude:2}},'latitude=1&longitude=2');assert.equal(e.issueTime,null);assert.equal(e.observationTime,null);assert.equal(e.validTime,'2025-01-01T00:00:00.000Z');assert.equal(e.kind,'forecast');assert.equal(e.spatialResolution,null);assert.equal(e.gridLocation.lat,1);});
test('ECMWF AIFS is included separately',()=>assert.ok(MODEL_IDS.some(([id])=>id==='ecmwf_aifs025_single')));
test('GIS overlap and DEM path samples preserve boundaries',async()=>{const {polygonIntersection,profilePoints,fetchElevationProfile}=await import('../src/gis-analysis.js');const p=(x,y)=>({type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:[[[x,y],[x+1,y],[x+1,y+1],[x,y+1],[x,y]]]}});assert.ok(polygonIntersection(p(0,0),p(.5,0)).areaKm2>6000);assert.equal(polygonIntersection(p(0,0),p(2,0)).areaKm2,0);const pts=profilePoints([[0,0],[1,0]],3);assert.equal(pts[0].lon,0);assert.equal(pts[2].lon,1);assert.ok(pts[2].distanceKm>111);const q=await fetchElevationProfile(pts,async()=>({ok:true,json:async()=>({elevation:[100,null,200]})}));assert.equal(q.rows[1].elevationM,null);assert.equal(q.resolutionM,90);});
