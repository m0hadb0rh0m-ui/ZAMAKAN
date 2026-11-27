import {defineConfig} from 'vite';
import {cpSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
// Cesium workers, textures and widget resources are packaged on both Web and Capacitor.
const cesiumAssets={name:'cesium-static-assets',apply:'build',closeBundle(){
 const target=resolve('dist/cesium');mkdirSync(target,{recursive:true});
 for(const name of ['Assets','Workers','ThirdParty','Widgets'])cpSync(resolve('node_modules/cesium/Build/Cesium',name),resolve(target,name),{recursive:true});
}};
export default defineConfig({base:'./',define:{CESIUM_BASE_URL:JSON.stringify('./cesium/')},plugins:[cesiumAssets],build:{target:'es2022'}});
