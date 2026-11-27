import {ALERT_FEEDS,readAlertFeed} from '../shared/alert-feeds.js';
import {parseAlertFeed} from '../src/alert-directory.js';
import {DOMParser} from '@xmldom/xmldom';
import {writeFile} from 'node:fs/promises';
const rows=await Promise.all(Object.entries(ALERT_FEEDS).map(async ([id,source])=>{
 const start=Date.now();let http=null,redirect=null;
 try{
  const feed=await readAlertFeed(id,async(url,options)=>{
   const r=await fetch(url,options);http=r.status;redirect=r.redirected;return r;
  });
  const entries=parseAlertFeed(feed.xml,DOMParser);
  return {id,name:source.name,state:'reachable',http,redirect,retrieved:new Date(feed.retrieved).toISOString(),entries:entries.length,latencyMs:Date.now()-start,url:source.url};
 }catch(e){return {id,name:source.name,state:'unavailable',http,redirect,latencyMs:Date.now()-start,url:source.url,error:String(e.cause?.code||e.message).slice(0,120)}}
}));
const report={checkedAt:new Date().toISOString(),notice:'Connectivity only; no authentication of CAP or guarantee of complete coverage.',reachable:rows.filter(r=>r.state==='reachable').length,total:rows.length,sources:rows};
console.log(JSON.stringify(report,null,2));await writeFile('cap-live-report.json',JSON.stringify(report,null,2)+'\n');
if(report.reachable===0)process.exitCode=1;
