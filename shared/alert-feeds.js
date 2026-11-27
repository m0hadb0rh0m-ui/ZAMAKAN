// Fixed registry; URLs sourced from WMO Register of Alerting Authorities. No arbitrary URL proxy.
export const ALERT_FEEDS=Object.freeze({
 gdacs:{name:'GDACS · global disaster reports',url:'https://www.gdacs.org/contentdata/xml/rss_24h.xml',registry:'https://www.gdacs.org/feed_reference.aspx'},
 au:{name:'Australia · Bureau of Meteorology',url:'https://severeweather.wmo.int/v2/cap-alerts/au-bom-en/rss.xml',registry:'https://alertingauthority.wmo.int/authorities.php?recId=6'},
 de:{name:'Germany · Deutscher Wetterdienst',url:'https://www.dwd.de/DWD/warnungen/cap-feed/en/rss.xml',registry:'https://alertingauthority.wmo.int/authorities.php?recId=58'},
 in:{name:'India · NDMA',url:'https://sachet.ndma.gov.in/cap_public_website/rss/rss_india.xml',registry:'https://alertingauthority.wmo.int/authorities.php?recId=331'}
});
const cached=new Map(),pending=new Map();
export async function readAlertFeed(id,fetcher=fetch){
 if(!Object.hasOwn(ALERT_FEEDS,id))throw Error('Unknown source');
 const f=ALERT_FEEDS[id],old=cached.get(id);
 if(old&&Date.now()-old.retrieved<120000)return old;
 if(pending.has(id))return pending.get(id);
 const task=(async()=>{const r=await fetcher(f.url,{redirect:'error',credentials:'omit',headers:{Accept:'application/atom+xml, application/rss+xml, application/xml, text/xml'},signal:AbortSignal.timeout(12000)});
 if(!r.ok||!r.body)throw Error('Upstream unavailable');
 const reader=r.body.getReader(),chunks=[];let size=0;try{while(true){const v=await reader.read();if(v.done)break;size+=v.value.length;if(size>750000)throw Error('Feed exceeds limit');chunks.push(v.value);}}finally{await reader.cancel().catch(()=>{});}
 const b=new Uint8Array(size);let offset=0;for(const a of chunks){b.set(a,offset);offset+=a.length;}
 const xml=new TextDecoder().decode(b);if(/<!DOCTYPE|<!ENTITY/i.test(xml)||!/^\s*(?:<\?xml[^>]*>\s*)?</.test(xml))throw Error('Unexpected feed');const out={source:f.name,sourceUrl:f.url,registry:f.registry,retrieved:Date.now(),xml};cached.set(id,out);return out;})().finally(()=>pending.delete(id));
 pending.set(id,task);return task;
}
