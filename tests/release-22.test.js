import {test} from 'node:test';
import assert from 'node:assert/strict';
import {profilePoints,elevationProfile} from '../src/elevation.js';
import {FEATURE_GUIDE,guideCard} from '../src/guide.js';
import {modules} from '../src/navigation.js';
import {ALERT_FEEDS,readAlertFeed} from '../shared/alert-feeds.js';
test('every guide module is navigable, both languages render, downloads clearly labeled',()=>{
 const known=new Set(['map',...modules.map(m=>m[0])]);
 for(const [id] of FEATURE_GUIDE)assert(known.has(id),id);
 assert.match(guideCard((a,b)=>a),/ابدأ رحلتك/);
 assert.match(guideCard((a,b)=>b),/Start exploring ZAMAKAN/);
 assert.match(guideCard((a,b)=>b),/not production releases/);
});
test('terrain profile bounds and dateline, no missing samples or non-finite values',async()=>{
 const a={lat:0,lon:179.95},b={lat:0,lon:-179.95};
 const p=profilePoints(a,b);assert(p.km>10&&p.km<12);assert.equal(p.points.length,25);
 assert(p.points.every(x=>Math.abs(x.lon)>179));
 assert.throws(()=>profilePoints(a,{lat:20,lon:0}));
 const f=await elevationProfile(a,b,async u=>{assert.equal(u.hostname,'elevation-api.open-meteo.com');return Response.json({elevation:Array(25).fill(12)});});assert.equal(f.values[0],12);
 await assert.rejects(elevationProfile(a,b,async()=>Response.json({elevation:[null]})),/Incomplete/);
});
test('fixed international registry and accurate cache status',async()=>{
 assert.equal(Object.keys(ALERT_FEEDS).length,12);for(const x of Object.values(ALERT_FEEDS)){assert.match(x.registry,/^https:\/\/alertingauthority\.wmo\.int\//);assert.match(x.url,/^https:/);}
 const f=await readAlertFeed('om',async()=>new Response('<rss><channel/></rss>'));assert.equal(f.state,'fresh');
 const c=await readAlertFeed('om',()=>{throw Error('must not request')});assert.equal(c.state,'cached');
});

test('CAP proxy rejects HTML and cross-origin redirects; allows bounded same-origin HTTPS redirects',async()=>{
 await assert.rejects(readAlertFeed('au',async()=>new Response('<html>not a feed</html>')),/Unexpected feed/);
 await assert.rejects(readAlertFeed('de',async()=>new Response(null,{status:302,headers:{location:'https://example.com/other'}})),/Untrusted redirect/);
 let hits=0;
 const r=await readAlertFeed('in',async()=>++hits===1?new Response(null,{status:302,headers:{location:'/rss.xml'}}):new Response('<?xml version="1.0"?><rss><channel/></rss>'));
 assert.equal(hits,2);assert.equal(r.state,'fresh');
});
