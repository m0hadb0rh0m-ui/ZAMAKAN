import {readdir,readFile,writeFile,mkdir,unlink} from 'node:fs/promises';
import {join,extname} from 'node:path';
import {rolldown} from 'rolldown';
const root='dist',assets={},types={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.mjs':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.geojson':'application/geo+json','.svg':'image/svg+xml','.woff2':'font/woff2','.png':'image/png','.webmanifest':'application/manifest+json','.wasm':'application/wasm'};
async function walk(folder,prefix=''){for(const d of await readdir(folder,{withFileTypes:true})){if(d.name.startsWith('.')||d.name==='server')continue;const f=join(folder,d.name),p=prefix+'/'+d.name;if(d.isDirectory())await walk(f,p);else if(d.isFile()){assets[p]=[types[extname(d.name)]||'application/octet-stream',(await readFile(f)).toString('base64')];}}}
await walk(root);if(!assets['/index.html'])throw Error('Build frontend first');
await writeFile('cloud/assets.generated.js','export const ASSETS='+JSON.stringify(assets)+';\n');
try{await mkdir('dist/server',{recursive:true});const b=await rolldown({input:'cloud/worker.js'});await b.write({file:'dist/server/index.js',format:'esm',inlineDynamicImports:true});await b.close();console.log('Cloud Worker bundled: '+Object.keys(assets).length+' assets');}finally{await unlink('cloud/assets.generated.js');}
