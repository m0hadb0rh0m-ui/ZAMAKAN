import {validCoords} from './data.js';
const KEY='zamakan.projects.v3';
export function validateProject(p){
 if(!p||typeof p.name!=='string'||!p.name.trim()||p.name.length>80||!validCoords(p.position?.lon,p.position?.lat)||!Number.isFinite(p.at)||!['globe','flat'].includes(p.mode))throw Error('Invalid project');
 const layers=Object.fromEntries(['earthquake','wildfires','other'].map(k=>[k,p.layers?.[k]!==false]));
 const f=p.filter||{},filter={category:['all','earthquake','wildfires','volcanoes'].includes(f.category)?f.category:'all',hours:[24,168,720].includes(f.hours)?f.hours:24,magnitude:[0,4,5,6].includes(f.magnitude)?f.magnitude:0,radius:[0,100,500,2000].includes(f.radius)?f.radius:0};
 const points=Array.isArray(p.points)?p.points.slice(0,500).map(x=>{if(!validCoords(x.lon,x.lat))throw Error('Invalid project vertex');return {lon:x.lon,lat:x.lat};}):[];
 const imageryDate=typeof p.imageryDate==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(p.imageryDate)?p.imageryDate:null;
 return {id:String(p.id||'').slice(0,80),name:p.name.trim(),created:String(p.created||new Date().toISOString()).slice(0,40),position:{lat:p.position.lat,lon:p.position.lon},at:p.at,mode:p.mode,layers,filter,points,areaMode:p.areaMode===true,imagery:p.imagery===true,imageryDate,opacity:Number.isFinite(p.opacity)?Math.min(1,Math.max(0,p.opacity)):1};
}
export function getProjects(storage=globalThis.localStorage){try{const raw=JSON.parse(storage.getItem(KEY)||'[]');return raw.slice(0,30).flatMap(p=>{try{return [validateProject(p)];}catch{return [];}});}catch{return [];}}
export function putProjects(items,storage=globalThis.localStorage){if(items.length>30)throw Error('Maximum 30 local projects');storage.setItem(KEY,JSON.stringify(items.map(validateProject)));}
