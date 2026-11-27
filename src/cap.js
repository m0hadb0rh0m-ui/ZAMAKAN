// CAP 1.2 structural + semantic receiving policy (OASIS CAP 1.2 §§3.2–3.4).
// No network, external entities, dereferencing, XML signature trust or alert dissemination.
const NS='urn:oasis:names:tc:emergency:cap:1.2';
const fail=m=>{throw Error('CAP: '+m)};
const statuses='Actual Exercise System Test Draft',types='Alert Update Cancel Ack Error',scopes='Public Restricted Private';
const enumOf=(v,allowed,k)=>{if(!allowed.split(' ').includes(v))fail('invalid '+k);};
const token=(v,k)=>{if(!v||/[\s,<>]/u.test(v)||v.length>1024)fail('invalid '+k);return v;};
export function capTime(v){
 const m=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})([+-])(\d{2}):(\d{2})$/.exec(v);
 if(!m)fail('timestamp must have numeric UTC offset');
 const [,yy,mm,dd,hh,mi,ss,,oh,om]=m,y=+yy,mo=+mm,d=+dd;
 const leap=y%4===0&&(y%100!==0||y%400===0),days=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31];
 if(y===0||mo<1||mo>12||d<1||d>days[mo-1]||+hh>23||+mi>59||+ss>59||+oh>14||+om>59||(+oh===14&&+om!==0)||v.endsWith('+00:00'))fail('invalid CAP timestamp');
 const t=Date.parse(v);if(!Number.isFinite(t))fail('invalid timestamp');return t;
}
const children=n=>Array.from(n.childNodes||[]).filter(x=>x.nodeType===1);
const attrCheck=n=>{for(const a of Array.from(n.attributes||[]))if(a.namespaceURI!=='http://www.w3.org/2000/xmlns/')fail('unexpected attribute '+a.name);};
const content=n=>{attrCheck(n);if(children(n).length)fail('nested scalar '+n.localName);return n.textContent.trim();};
// Order and cardinality mirror the CAP sequence: no unknown or repeated singleton fields.
function fields(n,spec,{signature=false}={}){
 attrCheck(n);const out={};let last=-1,signed=false;
 for(const child of Array.from(n.childNodes||[])){
  if(child.nodeType!==1){if([3,4].includes(child.nodeType)&&child.textContent.trim())fail('unexpected text in '+n.localName);continue;}
  if(signature&&child.namespaceURI==='http://www.w3.org/2000/09/xmldsig#'&&child.localName==='Signature'){signed=true;continue;}
  const ix=spec.findIndex(([k])=>k===child.localName);
  if(signed||child.namespaceURI!==NS||ix<0||ix<last)fail('unexpected or out-of-order '+child.localName);
  const [k,kind,parse]=spec[ix],v=parse?parse(child):content(child);
  if(kind==='*'||kind==='+'){(out[k]??=[]).push(v);}else{if(Object.hasOwn(out,k))fail('duplicate '+k);out[k]=v;}last=ix;
 }
 for(const [k,kind] of spec)if((kind==='!'||kind==='+')&&(!out[k]||!out[k].length))fail('missing '+k);
 return out;
}
const pair=n=>fields(n,[['valueName','!'],['value','!']]);
const date=n=>{const s=content(n);capTime(s);return s;};
const choice=allowed=>n=>{const v=content(n);enumOf(v,allowed,n.localName);return v;};
const decimal=n=>{const s=content(n);if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(s)||!Number.isFinite(+s))fail('invalid '+n.localName);return +s;};
const coord=s=>{const p=s.split(',');if(p.length!==2||p.some(x=>!/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(x)))fail('invalid coordinate');const [lat,lon]=p.map(Number);if(Math.abs(lat)>90||Math.abs(lon)>180)fail('coordinate out of range');return [lat,lon];};
const polygon=n=>{const s=content(n),p=s.split(/\s+/).map(coord);if(p.length<4||p.length>10000||p[0].some((v,i)=>v!==p.at(-1)[i]))fail('polygon must close and contain at least four points');return s;};
const circle=n=>{const s=content(n),p=s.split(/\s+/);if(p.length!==2||!/^\d+(?:\.\d+)?$/.test(p[1])||!Number.isFinite(+p[1]))fail('invalid circle radius');coord(p[0]);return s;};
function area(n){const a=fields(n,[['areaDesc','!'],['polygon','*',polygon],['circle','*',circle],['geocode','*',pair],['altitude','?',decimal],['ceiling','?',decimal]]);if(a.ceiling!==undefined&&(a.altitude===undefined||a.ceiling<a.altitude))fail('ceiling requires valid altitude');return {...a,description:a.areaDesc,polygons:a.polygon||[],circles:a.circle||[]};}
const resource=n=>fields(n,[['resourceDesc','!'],['mimeType','!'],['size','?',x=>{const s=content(x);if(!/^\d+$/.test(s)||!Number.isSafeInteger(+s))fail('invalid resource size');return +s;}],['uri','?'],['derefUri','?'],['digest','?']]);
const info=n=>{const x=fields(n,[['language','?'],['category','+',choice('Geo Met Safety Security Rescue Fire Health Env Transport Infra CBRNE Other')],['event','!'],['responseType','*',choice('Shelter Evacuate Prepare Execute Avoid Monitor Assess AllClear None')],['urgency','!',choice('Immediate Expected Future Past Unknown')],['severity','!',choice('Extreme Severe Moderate Minor Unknown')],['certainty','!',choice('Observed Likely Possible Unlikely Unknown')],['audience','?'],['eventCode','*',pair],['effective','?',date],['onset','?',date],['expires','?',date],['senderName','?'],['headline','?'],['description','?'],['instruction','?'],['web','?'],['contact','?'],['parameter','*',pair],['resource','*',resource],['area','*',area]]);return {...x,areas:x.area||[]};};
export const capKey=a=>JSON.stringify([a.sender,a.identifier,capTime(a.sent)]);
export function parseReferences(v,alert){
 if(!v)return [];
 const seen=new Set();return v.trim().split(/\s+/).map(t=>{
  const p=t.split(',');if(p.length!==3)fail('references must be sender,identifier,sent');
  const a={sender:token(p[0],'reference sender'),identifier:token(p[1],'reference identifier'),sent:p[2]},key=capKey(a);
  if(capTime(a.sent)>=capTime(alert.sent)||seen.has(key)||(a.sender===alert.sender&&a.identifier===alert.identifier))fail('duplicate, self or non-earlier reference');
  seen.add(key);return {...a,key};
 });
}
export function parseCAP(xml,Parser=globalThis.DOMParser){
 if(typeof xml!=='string'||!xml.length||xml.length>500000||/<!DOCTYPE|<!ENTITY/i.test(xml))fail('unsafe or oversized XML');
 const d=new Parser().parseFromString(xml,'application/xml'),root=d.documentElement;
 if(!root||root.localName!=='alert'||root.namespaceURI!==NS||d.getElementsByTagName('parsererror').length||d.doctype)fail('expected CAP 1.2 alert XML');
 const a=fields(root,[['identifier','!'],['sender','!'],['sent','!',date],['status','!',choice(statuses)],['msgType','!',choice(types)],['source','?'],['scope','!',choice(scopes)],['restriction','?'],['addresses','?'],['code','*'],['note','?'],['references','?'],['incidents','?'],['info','*',info]],{signature:true});
 token(a.sender,'sender');token(a.identifier,'identifier');
 if(a.scope==='Restricted'&&!a.restriction)fail('Restricted scope requires restriction');
 if(a.scope==='Private'&&!a.addresses)fail('Private scope requires addresses');
 if(a.scope!=='Restricted'&&a.restriction!==undefined)fail('restriction only for Restricted scope');
 if(a.scope!=='Private'&&a.addresses!==undefined)fail('addresses only for Private scope');
 a.type=a.msgType;a.info??=[];a.code??=[];a.references??='';a.referenceList=parseReferences(a.references,a);
 if(['Update','Cancel','Ack','Error'].includes(a.type)&&!a.referenceList.length)fail(a.type+' requires references under receiving policy');
 for(const i of a.info)if(i.expires&&capTime(i.expires)<=capTime(i.effective||a.sent))fail('expiry must follow effective time');
 return {...a,signaturePresent:children(root).some(x=>x.namespaceURI==='http://www.w3.org/2000/09/xmldsig#'),trust:'unverified'};
}
export function ipawsPublic(a){
 const issues=[];
 if(a.status!=='Actual')issues.push('status must be Actual');
 if(a.scope!=='Public')issues.push('scope must be Public');
 if(!a.code.includes('IPAWSv1.0'))issues.push('missing IPAWSv1.0 code');
 if(!a.info.length)issues.push('missing info');
 const fingerprint=i=>JSON.stringify([[...new Set(i.category)].sort(),(i.eventCode||[]).map(x=>JSON.stringify([x.valueName,x.value])).sort()]);
 for(const i of a.info){if(!i.expires)issues.push('missing expires');if(fingerprint(i)!==fingerprint(a.info[0]))issues.push('inconsistent category/eventCode');}
 // Channel-specific codes, active incident completeness and sender trust require external evidence.
 return {coreChecksPassed:!issues.length,issues,official:false};
}
export class CAPInbox {
 constructor(){this.messages=new Map();this.invalidated=new Set();}
 ingest(a){const key=capKey(a);
  if(this.messages.has(key))return {state:'duplicate',missing:[]};
  if([...this.messages.values()].some(x=>x.sender===a.sender&&x.identifier===a.identifier))return {state:'identifier-conflict',missing:[]};
  if(this.messages.size>=1000)throw Error('CAP inbox limit reached');
  const refs=a.referenceList||[],missing=refs.filter(r=>!this.messages.has(r.key));
  // Local files never authenticate a sender. Prevent cross-sender or cross-status invalidation.
  const conflicts=refs.filter(r=>this.messages.has(r.key)&&(r.sender!==a.sender||this.messages.get(r.key).status!==a.status||this.messages.get(r.key).scope!==a.scope));
  if(conflicts.length)return {state:'reference-conflict',missing};
  if(missing.length)return {state:'unresolved-references',missing};
  this.messages.set(key,a);
  if(['Update','Cancel'].includes(a.type))for(const r of refs)this.invalidated.add(r.key);
  return {state:this.invalidated.has(key)?'superseded':'accepted-local-untrusted',missing:[]};
 }
 isSuperseded(a){return this.invalidated.has(capKey(a));}
}
