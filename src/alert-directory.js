export const GLOBAL_AUTHORITY_LINKS=[['WMO SWIC','https://severeweather.wmo.int/'],['WMO register','https://alertingauthority.wmo.int/'],['Meteoalarm Europe','https://meteoalarm.org/'],['WWMIWS marine warnings','https://wwmiws.wmo.int/']];
export function parseAlertFeed(xml,Parser=globalThis.DOMParser){
 if(typeof xml!=='string'||xml.length>750000||/<!DOCTYPE|<!ENTITY/i.test(xml))throw Error('Unsafe or excessive feed');
 const d=new Parser().parseFromString(xml,'application/xml'),root=d.documentElement;
 if(!root||d.getElementsByTagName('parsererror').length||!['rss','feed'].includes(root.localName))throw Error('Not RSS/Atom');
 const items=Array.from(root.getElementsByTagNameNS('*',root.localName==='rss'?'item':'entry')).slice(0,80);
 const plain=(e,k)=>String(Array.from(e.getElementsByTagNameNS('*',k))[0]?.textContent||'').trim().slice(0,400);
 return items.map(e=>{let url='';try{const l=Array.from(e.getElementsByTagNameNS('*','link')).find(n=>!n.getAttribute('rel')||n.getAttribute('rel')==='alternate');const u=new URL(l?.getAttribute('href')||l?.textContent.trim());if(u.protocol==='https:'&&!u.username&&!u.password)url=u.href;}catch{}return {title:plain(e,'title')||'Untitled entry',date:plain(e,'pubDate')||plain(e,'updated')||plain(e,'published'),url};});
}
