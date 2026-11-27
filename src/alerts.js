import {iso,validCoords} from './data.js';
export function alertLifecycle(alert,now=Date.now()){
 if(alert.status!=='Actual')return 'non-actual';
 if(alert.type==='Cancel')return 'cancelled';
 if(!['Alert','Update'].includes(alert.type))return 'informational';
 const expires=(alert.info||[]).map(i=>Date.parse(iso(i.expires)||'invalid')).filter(Number.isFinite);
 const effective=(alert.info||[]).map(i=>Date.parse(iso(i.effective)||'invalid')).filter(Number.isFinite);
 if(effective.length&&(alert.info||[]).length===effective.length&&effective.every(t=>t>now))return 'not-yet-effective';
 if(!expires.length)return 'expiry-unknown';
 if(expires.every(t=>t<=now))return 'expired';
 return 'active-by-time';
}
export function nwsAlerts(raw,now=Date.now()){
 if(raw?.type!=='FeatureCollection'||!Array.isArray(raw.features))throw Error('Invalid NWS feed');
 const seen=new Set();
 return raw.features.slice(0,1000).flatMap(f=>{
  const p=f.properties||{},id=p.id||f.id,expiry=iso(p.expires),sent=iso(p.sent),effective=iso(p.effective);
  if(typeof id!=='string'||seen.has(id)||!sent||!expiry||Date.parse(expiry)<=now||p.status!=='Actual'||!['Alert','Update'].includes(p.messageType)||typeof p.event!=='string')return [];
  seen.add(id);
  const g=f.geometry;
  const geo=validAlertGeometry(g)?g:null;
  return [{id,event:p.event.slice(0,200),area:String(p.areaDesc||'').slice(0,1000),headline:String(p.headline||'').slice(0,1000),severity:String(p.severity||'Unknown'),urgency:String(p.urgency||'Unknown'),certainty:String(p.certainty||'Unknown'),sent,effective,expiry,geometry:geo,url:typeof p['@id']==='string'&&p['@id'].startsWith('https://api.weather.gov/alerts/')?p['@id']:'https://www.weather.gov/alerts'}];
 }).sort((a,b)=>Date.parse(b.sent)-Date.parse(a.sent));
}
function validAlertGeometry(g){
 if(!['Polygon','MultiPolygon'].includes(g?.type))return false;
 let total=0;const polys=g.type==='Polygon'?[g.coordinates]:g.coordinates;
 if(!Array.isArray(polys)||!polys.length)return false;
 return polys.every(poly=>Array.isArray(poly)&&poly.length&&poly.every(r=>Array.isArray(r)&&r.length>=4&&r.every(c=>Array.isArray(c)&&c.length===2&&validCoords(...c)&&++total<25000)&&r[0].every((x,i)=>x===r.at(-1)[i])));
}
export function capPolygon(text){
 const tokens=String(text).trim().split(/\s+/);if(tokens.some(t=>!/^[-+]?\d+(?:\.\d+)?,[-+]?\d+(?:\.\d+)?$/.test(t)))return null;const pts=tokens.map(pt=>pt.split(',').map(Number).reverse());
 if(pts.length<4||pts.length>10000||pts.some(p=>p.length!==2||!validCoords(...p))||pts[0].some((v,i)=>v!==pts.at(-1)[i]))return null;
 if(pts.some((p,i)=>i&&Math.abs(p[0]-pts[i-1][0])>180))return null;
 return {type:'Polygon',coordinates:[pts]};
}
