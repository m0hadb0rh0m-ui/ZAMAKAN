import {defineConfig} from 'vite';
import {readdir,writeFile} from 'node:fs/promises';
export default defineConfig({base:'./',build:{target:'es2022'},plugins:[{name:'offline-core-manifest',async closeBundle(){const assets=await readdir('dist/assets');const core=assets.filter(n=>/^index-.*\.(js|css)$|^signal\.worker-.*\.js$|^fft-kernel-.*\.wasm$|^xmllint-.*\.(js|wasm)$|^inter-latin(?:-ext)?-|^noto-sans-arabic-(?:arabic|latin)-/.test(n));await writeFile('dist/shell-assets.json',JSON.stringify(core.map(n=>'./assets/'+n)));}}]});
