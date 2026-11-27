"""Configure generated Capacitor Android project; no secret or background location permission."""
from pathlib import Path
from xml.etree import ElementTree as ET
p=Path('android/app/src/main/AndroidManifest.xml')
ns='http://schemas.android.com/apk/res/android'
ET.register_namespace('android',ns)
tree=ET.parse(p); root=tree.getroot()
for perm in ['android.permission.ACCESS_COARSE_LOCATION','android.permission.ACCESS_FINE_LOCATION']:
 if not any(x.get('{'+ns+'}name')==perm for x in root.findall('uses-permission')):
  ET.SubElement(root,'uses-permission',{'{'+ns+'}name':perm})
tree.write(p,encoding='utf-8',xml_declaration=True)

import re
gradle=Path('android/app/build.gradle')
s=gradle.read_text()
s=re.sub(r'versionCode\s+\d+', 'versionCode 22', s)
s=re.sub(r'versionName\s+"[^"]+"', 'versionName "2.2.0"', s)
gradle.write_text(s)

# FCM stays entirely disabled for builds without a real project configuration.
import json, shutil
config=Path('android/app/google-services.json')
if config.is_file():
    d=json.loads(config.read_text())
    if not any(c.get('client_info',{}).get('android_client_info',{}).get('package_name')=='org.zamakan.earth' for c in d.get('client',[])):
        raise SystemExit('Firebase Android package mismatch')
    app=root.find('application')
    for name,value in [('firebase_messaging_auto_init_enabled','false'),('firebase_analytics_collection_enabled','false')]:
        ET.SubElement(app,'meta-data',{'{'+ns+'}name':name,'{'+ns+'}value':value})
    ET.SubElement(root,'uses-permission',{'{'+ns+'}name':'android.permission.POST_NOTIFICATIONS'})
    svc=ET.SubElement(app,'service',{'{'+ns+'}name':'.ZamakanMessagingService','{'+ns+'}exported':'false'})
    ET.SubElement(ET.SubElement(svc,'intent-filter'),'action',{'{'+ns+'}name':'com.google.firebase.MESSAGING_EVENT'})
    tree.write(p,encoding='utf-8',xml_declaration=True)
    java=Path('android/app/src/main/java/org/zamakan/earth')
    for f in Path('native/android').glob('*.java'): shutil.copyfile(f,java/f.name)
    activity=java/'MainActivity.java'
    src=activity.read_text().replace('extends BridgeActivity {}','extends BridgeActivity {\n    @Override public void onCreate(android.os.Bundle savedInstanceState) {\n        registerPlugin(ZamakanPushPlugin.class);\n        super.onCreate(savedInstanceState);\n    }\n}')
    if 'registerPlugin(ZamakanPushPlugin.class)' not in src: raise SystemExit('Unexpected MainActivity layout')
    activity.write_text(src)
    gradle.write_text(gradle.read_text()+'\n dependencies { implementation platform("com.google.firebase:firebase-bom:35.2.0"); implementation "com.google.firebase:firebase-messaging" }\n')
