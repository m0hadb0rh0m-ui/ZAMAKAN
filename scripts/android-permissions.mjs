// Idempotent: Capacitor regenerates android/ on CI; retain foreground-only GPS permissions.
import {readFile,writeFile} from 'node:fs/promises';
const path=new URL('../android/app/src/main/AndroidManifest.xml',import.meta.url);
let xml=await readFile(path,'utf8');
for(const permission of ['ACCESS_COARSE_LOCATION','ACCESS_FINE_LOCATION']){
 if(!xml.includes('android.permission.'+permission)){
  if(!xml.includes('</manifest>'))throw Error('Invalid Android manifest');
  xml=xml.replace('</manifest>','    <uses-permission android:name="android.permission.'+permission+'" />\n</manifest>');
 }
}
await writeFile(path,xml);
