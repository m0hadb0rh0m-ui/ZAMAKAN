// Attach owner-provided keystore via environment. The generated Gradle project
// is not committed, and neither credentials nor keystore are ever in the repo.
import {readFile,writeFile,access} from 'node:fs/promises';
const required=['ZAMAKAN_KEYSTORE_PATH','ZAMAKAN_STORE_PASSWORD','ZAMAKAN_KEY_ALIAS','ZAMAKAN_KEY_PASSWORD','ZAMAKAN_VERSION_CODE','ZAMAKAN_VERSION_NAME'];
for(const k of required)if(!process.env[k])throw Error('Missing required release configuration: '+k);
const code=Number(process.env.ZAMAKAN_VERSION_CODE);
if(!Number.isSafeInteger(code)||code<1||code>2100000000||!/^[0-9]+\.[0-9]+\.[0-9]+(?:[-.][A-Za-z0-9.-]+)?$/.test(process.env.ZAMAKAN_VERSION_NAME))throw Error('Invalid Android version');
await access(process.env.ZAMAKAN_KEYSTORE_PATH);
const path=new URL('../android/app/build.gradle',import.meta.url);
let gradle=await readFile(path,'utf8');
if(!gradle.includes('// ZAMAKAN_RELEASE_SIGNING')){
 if(!gradle.includes('    buildTypes {')||!gradle.includes('        release {'))throw Error('Unexpected Capacitor Gradle template');
 gradle=gradle.replace(/versionCode\s+\d+/, "versionCode Integer.parseInt(System.getenv('ZAMAKAN_VERSION_CODE'))").replace(/versionName\s+"[^"]+"/, "versionName System.getenv('ZAMAKAN_VERSION_NAME')");
 gradle=gradle.replace('    buildTypes {',`    // ZAMAKAN_RELEASE_SIGNING
    signingConfigs {
        release {
            storeFile file(System.getenv('ZAMAKAN_KEYSTORE_PATH'))
            storePassword System.getenv('ZAMAKAN_STORE_PASSWORD')
            keyAlias System.getenv('ZAMAKAN_KEY_ALIAS')
            keyPassword System.getenv('ZAMAKAN_KEY_PASSWORD')
        }
    }
    buildTypes {`).replace('        release {\n            minifyEnabled','        release {\n            signingConfig signingConfigs.release\n            minifyEnabled');
 if(!gradle.includes('signingConfig signingConfigs.release'))throw Error('Release signing configuration not assigned');
 await writeFile(path,gradle);
}
console.log('Release signing configured (credentials not printed).');
