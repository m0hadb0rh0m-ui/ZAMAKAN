// Fixed registry; URLs sourced from WMO Register of Alerting Authorities. No arbitrary URL proxy.
export const ALERT_FEEDS=Object.freeze({
 au:{name:'Australia · Bureau of Meteorology',url:'https://severeweather.wmo.int/v2/cap-alerts/au-bom-en/rss.xml',registry:'https://alertingauthority.wmo.int/authorities.php?recId=6'},
 de:{name:'Germany · Deutscher Wetterdienst',url:'https://www.dwd.de/DWD/warnungen/cap-feed/en/rss.xml',registry:'https://alertingauthority.wmo.int/authorities.php?recId=58'},
 in:{name:'India · NDMA',url:'https://sachet.ndma.gov.in/cap_public_website/rss/rss_india.xml',registry:'https://alertingauthority.wmo.int/authorities.php?recId=331'},
 nz:{name:'New Zealand · MetService',url:'https://alerts.metservice.com/cap/rss',registry:'https://alertingauthority.wmo.int/authorities.php?recId=114'},
 hk:{name:'Hong Kong · Observatory',url:'https://alerts.weather.gov.hk/V1/cap_atom.xml',registry:'https://alertingauthority.wmo.int/authorities.php?recId=67'},
 nzc:{name:'New Zealand · Civil Defence',url:'https://alerthub.civildefence.govt.nz/rss/pwp',registry:'https://alertingauthority.wmo.int/authorities.php?recId=297'},
 al:{name:'Albania · IGEWE',url:'https://cap-sources.s3.amazonaws.com/al-igewe-en/rss.xml',registry:'https://alertingauthority.wmo.int/authorities.php?recId=1'},
 bh:{name:'Bahrain · Meteorology',url:'https://cap-sources.s3.amazonaws.com/bh-meteo-ar/rss.xml',registry:'https://alertingauthority.wmo.int/authorities.php?recId=11'},
 bw:{name:'Botswana · Meteorology',url:'https://cap-sources.s3.amazonaws.com/bw-met-en/rss.xml',registry:'https://alertingauthority.wmo.int/authorities.php?recId=21'},
 eg:{name:'Egypt · Meteorological Authority',url:'https://cap-sources.s3.amazonaws.com/eg-ema-ar/rss.xml',registry:'https://alertingauthority.wmo.int/authorities.php?recId=45'},
 ng:{name:'Nigeria · NiMet',url:'https://cap-sources.s3.amazonaws.com/ng-nimet-en/rss.xml',registry:'https://alertingauthority.wmo.int/authorities.php?recId=119'},
 om:{name:'Oman · Meteorology',url:'https://cap-sources.s3.amazonaws.com/om-met-ar/rss.xml',registry:'https://alertingauthority.wmo.int/authorities.php?recId=122'}
});
const cached=new Map(),pending=new Map();
export async function readAlertFeed(id,fetcher=fetch){
 if(!Object.hasOwn(ALERT_FEEDS,id))throw Error('Unknown source');
 const f=ALERT_FEEDS[id],old=cached.get(id);
 if(old&&Date.now()-old.retrieved<120000)return {...old,state:'cached'};
 if(pending.has(id))return pending.get(id);
 const task=(async()=>{const r=await fetcher(f.url,{redirect:'error',credentials:'omit',headers:{Accept:'application/atom+xml, application/rss+xml, application/xml, text/xml'},signal:AbortSignal.timeout(12000)});
 if(!r.ok||!r.body)throw Error('Upstream unavailable');
 const reader=r.body.getReader(),chunks=[];let size=0;try{while(true){const v=await reader.read();if(v.done)break;size+=v.value.length;if(size>750000)throw Error('Feed exceeds limit');chunks.push(v.value);}}finally{await reader.cancel().catch(()=>{});}
 const b=new Uint8Array(size);let offset=0;for(const a of chunks){b.set(a,offset);offset+=a.length;}
 const xml=new TextDecoder().decode(b);if(/<!DOCTYPE|<!ENTITY/i.test(xml)||!/^\s*(?:<\?xml[^>]*>\s*)?</.test(xml))throw Error('Unexpected feed');const out={source:f.name,sourceUrl:f.url,registry:f.registry,retrieved:Date.now(),state:'fresh',xml};cached.set(id,out);return out;})().catch(e=>{if(old)return {...old,state:'stale',error:'Upstream unavailable'};throw e;}).finally(()=>pending.delete(id));
 pending.set(id,task);return task;
}
