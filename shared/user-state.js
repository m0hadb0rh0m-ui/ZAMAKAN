// Only explicit user-selected preferences and favorites. Never sync GPS history, credentials, CAP or scientific caches.
export function validateUserState(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Invalid state');
 const p=input.preferences,f=input.favorites;
 if(!p||typeof p!=='object'||!['ar','en'].includes(p.lang)||!['dark','light'].includes(p.theme)||!['standard','large'].includes(p.font)||!['system','reduced'].includes(p.motion)||typeof p.auto!=='boolean'||typeof p.lowData!=='boolean'||!Array.isArray(f)||f.length>12)throw Error('Invalid state');
 const favorites=f.map(x=>{if(!x||typeof x.name!=='string'||!x.name.trim()||x.name.length>160||!Number.isFinite(x.lat)||!Number.isFinite(x.lon)||Math.abs(x.lat)>90||Math.abs(x.lon)>180)throw Error('Invalid favorite');return {name:x.name.trim(),lat:x.lat,lon:x.lon};});
 return {preferences:{lang:p.lang,theme:p.theme,font:p.font,motion:p.motion,auto:p.auto,lowData:p.lowData},favorites};
}
export function validateRevision(value){if(!Number.isSafeInteger(value)||value<0||value>2147483646)throw Error('Invalid revision');return value;}
