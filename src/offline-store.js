// Bounded IndexedDB cache of normalized source responses; no credentials or third party tiles.
const DB='zamakan-science-v2', STORE='responses', MAX_RECORDS=32, MAX_BYTES=6_000_000;
let opening;
function open(){if(!globalThis.indexedDB)return Promise.resolve(null);return opening??=new Promise(resolve=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE,{keyPath:'id'});};r.onsuccess=()=>resolve(r.result);r.onerror=()=>resolve(null);r.onblocked=()=>resolve(null);});}
export async function cacheGet(id){
 try{const db=await open();if(!db)return null;return await new Promise(resolve=>{const r=db.transaction(STORE).objectStore(STORE).get(id);r.onsuccess=()=>resolve(r.result?.value??null);r.onerror=()=>resolve(null);});}catch{return null;}
}
export async function cachePut(id,value){
 try{if(!value||!Number.isFinite(value.retrieved))return;const size=new TextEncoder().encode(JSON.stringify(value)).length;if(size>1_500_000)return;const db=await open();if(!db)return;
 await new Promise(resolve=>{const tx=db.transaction(STORE,'readwrite'),s=tx.objectStore(STORE);tx.oncomplete=tx.onerror=tx.onabort=()=>resolve();s.put({id,value,size});const r=s.getAll();r.onsuccess=()=>{let used=0;const items=r.result.sort((a,b)=>b.value.retrieved-a.value.retrieved);items.forEach((x,i)=>{used+=x.size;if(i>=MAX_RECORDS||used>MAX_BYTES)s.delete(x.id);});};});}catch{}
}
export async function clearCache(){try{const db=await open();if(!db)return;await new Promise(resolve=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).clear();tx.oncomplete=tx.onerror=tx.onabort=()=>resolve();});}catch{}}
