import {readFile,writeFile,copyFile} from 'node:fs/promises';
const path=new URL('../android/app/src/main/java/org/zamakan/earth/',import.meta.url);
await copyFile(new URL('../android-native/PrimeBillingPlugin.java',import.meta.url),new URL('PrimeBillingPlugin.java',path));
const main=new URL('MainActivity.java',path);
let source=await readFile(main,'utf8');
if(!source.includes('registerPlugin(PrimeBillingPlugin.class)')){
 source=source.replace(/public class MainActivity extends BridgeActivity\s*\{[\s\S]*?\}/,'public class MainActivity extends BridgeActivity {\n    @Override public void onCreate(android.os.Bundle savedInstanceState) {\n        registerPlugin(PrimeBillingPlugin.class);\n        super.onCreate(savedInstanceState);\n    }\n}');
 if(!source.includes('registerPlugin(PrimeBillingPlugin.class)'))throw Error('Native activity not recognized');
 await writeFile(main,source);
}
const gradle=new URL('../android/app/build.gradle',import.meta.url);
let build=await readFile(gradle,'utf8');
if(!build.includes('com.android.billingclient:billing:')){build=build.replace(/dependencies\s*\{/,'dependencies {\n    implementation "com.android.billingclient:billing:9.1.0"');await writeFile(gradle,build);}
