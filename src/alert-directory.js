export const GLOBAL_AUTHORITY_LINKS=[['WMO SWIC','https://severeweather.wmo.int/'],['WMO register','https://alertingauthority.wmo.int/'],['Meteoalarm Europe','https://meteoalarm.org/'],['WWMIWS marine warnings','https://wwmiws.wmo.int/']];
export function parseAlertFeed(xml,Parser=globalThis.DOMParser){
 if(typeof xml!=='string'||xml.length>750000||/<!DOCTYPE|<!ENTITY/i.test(xml))throw Error('Unsafe or excessive feed');
 const d=new Parser().parseFromString(xml.replace(/^\uFEFF/,''),'application/xml'),root=d.documentElement;
 if(!root||d.getElementsByTagName('parsererror').length||!['rss','feed'].includes(root.localName))throw Error('Not RSS/Atom');
 const items=Array.from(root.getElementsByTagNameNS('*',root.localName==='rss'?'item':'entry')).slice(0,80);
 const plain=(e,k)=>String(Array.from(e.getElementsByTagNameNS('*',k))[0]?.textContent||'').trim().slice(0,400);
 return items.map(e=>{let url='';try{const l=Array.from(e.getElementsByTagNameNS('*','link')).find(n=>!n.getAttribute('rel')||n.getAttribute('rel')==='alternate');const u=new URL(l?.getAttribute('href')||l?.textContent.trim());if(u.protocol==='https:'&&!u.username&&!u.password)url=u.href;}catch{}return {title:plain(e,'title')||'Untitled entry',date:plain(e,'pubDate')||plain(e,'updated')||plain(e,'published'),url};});
}

export function parseGDACS(xml,Parser=globalThis.DOMParser){
 if(typeof xml!=='string'||xml.length>750000||/<!DOCTYPE|<!ENTITY/i.test(xml))throw Error('Unsafe or excessive GDACS feed');
 const d=new Parser().parseFromString(xml.replace(/^\uFEFF/,''),'application/xml');
 if(d.documentElement?.localName!=='rss'||d.getElementsByTagName('parsererror').length)throw Error('Expected GDACS RSS');
 const ns='http://www.gdacs.org',geo='http://www.georss.org/georss';
 const read=(n,uri,k)=>String(n.getElementsByTagNameNS(uri,k)[0]?.textContent??'').trim();
 const all=Array.from(d.getElementsByTagName('item')).slice(0,200),rows=[];
 for(const n of all){
  const id=read(n,ns,'eventid'),type=read(n,ns,'eventtype'),episode=read(n,ns,'episodeid');
  if(!/^\d{1,16}$/.test(id)||!/^(EQ|TC|FL|VO|DR|WF|TS)$/.test(type))continue;
  const point=read(n,geo,'point').split(/\s+/).map(Number),[lat,lon]=point;
  if(point.length!==2||!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)continue;
  const t=Date.parse(read(n,ns,'fromdate')),pub=Date.parse(read(n,'*','pubDate'));
  if(!Number.isFinite(t)||!Number.isFinite(pub))continue;
  const severity=n.getElementsByTagNameNS(ns,'severity')[0],severityValue=severity?.getAttribute('value'),v=severityValue!==null&&severityValue!==undefined&&severityValue.trim()!==''?Number(severityValue):NaN;
  const level=read(n,ns,'alertlevel');
  rows.push({id:'gdacs:'+type+':'+id,episode,type,lat,lon,title:read(n,'*','title').slice(0,400),level:['Green','Orange','Red'].includes(level)?level:null,source:'GDACS',kind:'reported',time:new Date(t).toISOString(),published:new Date(pub).toISOString(),severity:Number.isFinite(v)?v:null,unit:severity?.getAttribute('unit')||null,url:'https://www.gdacs.org/report.aspx?eventtype='+type+'&eventid='+id});
 }
 const unique=new Map();for(const r of rows){const prev=unique.get(r.id);if(!prev||r.published>prev.published)unique.set(r.id,r);}
 return [...unique.values()];
}
