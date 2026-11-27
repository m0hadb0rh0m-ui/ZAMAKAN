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
s=re.sub(r'versionCode\s+\d+', 'versionCode 20', s)
s=re.sub(r'versionName\s+"[^"]+"', 'versionName "2.0.0"', s)
gradle.write_text(s)
