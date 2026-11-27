import {DEFAULT_FLAGS,evaluateFlags} from '../shared/flags.js';
export const flags={...DEFAULT_FLAGS};
export async function refreshFlags(fetcher=fetch){
 try{const r=await fetcher('./api/flags',{cache:'no-store',signal:AbortSignal.timeout(4000)});if(!r.ok)throw Error('Flag API');const d=await r.json();Object.assign(flags,evaluateFlags(d.flags));}catch{/* static/mobile build uses bundled defaults */}
 return flags;
}
