// Local deterministic flags; optional server-side GrowthBook simple boolean snapshot.
export const DEFAULT_FLAGS=Object.freeze({newRadar:true,capStrict:true,wasmFFT:true,sourceStatus:true,dataLineage:true});
export function evaluateFlags(input={}){
 const flags={...DEFAULT_FLAGS};
 for(const k of Object.keys(flags)){
  const v=input[k];
  if(typeof v==='boolean')flags[k]=v;
  // GrowthBook export supports simple defaults only; never silently interpret targeting rules.
  if(v&&typeof v.defaultValue==='boolean'&&(!v.rules||v.rules.length===0))flags[k]=v.defaultValue;
 }
 // Strict validation cannot be disabled in production; flag gates the module instead.
 return flags;
}
export function flagsFromEnv(raw=''){try{const d=JSON.parse(raw||'{}');return evaluateFlags(d.features||d);}catch{return {...DEFAULT_FLAGS};}}
