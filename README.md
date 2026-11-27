# زَمَكان | ZAMAKAN ULTRA
Global Earth, Weather, Disaster & Space Intelligence

**Research MVP — not a certified early warning or emergency system.**
نواة تشغيلية فعلية وليست منظومة إنذار معتمدة. لا تستخدمها لاتخاذ قرارات إخلاء أو سلامة حرجة.

## التشغيل المحلي (Windows / Linux / macOS)
يتطلب Node.js 22.12+ (يفضل إصدار LTS حديث).
```sh
npm ci
npm test
npm run build
npm run serve
```
افتح http://127.0.0.1:4173. يتم جلب البيانات من المصادر الأصلية عبر HTTPS عند وجود اتصال؛ لا بيانات مختلقة ولا مفاتيح مضمّنة.
بديل التطوير: `npx vite --host 127.0.0.1`.

## Android
Java 21 وAndroid SDK وAndroid Studio متوافقان مع Capacitor 8، ثم:
```sh
npm ci
npm run build
npm run android:init
npm run android:sync
npx cap open android
```
في Android Studio اختر Build APK (debug). للنسخة الإنتاجية أنشئ توقيعًا خاصًا خارج المستودع. GitHub Actions يوفر مسار بناء APK تجريبي عند توفر صلاحيات Actions. GPS داخل WebView يحتاج اختبارًا على الجهاز؛ لا يعد جاهزًا دون ذلك.

## الكمبيوتر: PWA
انشر الملفات الناتجة `dist/` عبر HTTPS. افتح باستخدام Edge/Chrome واختر Install app إذا أتاح المتصفح ذلك. ليس ملف EXE مستقلًا. Dockerfile لتشغيل خادم الإنتاج، وخدمة HTTPS تكون على مستوى موازن/خادم الاستضافة.

## الموجود فعليًا — ULTRA
- OpenFreeMap / OpenMapTiles vector street maps via MapLibre GL — real streets, POIs and building footprints where mapped.
- 2D / 3D building extrusions and globe, adaptive camera zoom, map-first responsive UI, Arabic/English.
- Photon / OpenStreetMap geographic search, autocomplete, reverse lookup and coordinates; optional licensed MapTiler integration.
- MapTiler satellite HD, hybrid, outdoor/topographic and DEM require an owner-approved restricted public key. No charges activated. See [owner-only provider setup](docs/OWNER-PROVIDERS.md); customers never enter keys.
- USGS and NASA EONET clustered events; scientific NASA MODIS overlay; NOAA Kp; Open-Meteo weather, air and marine; nine-point weather model overlay, distance and timeline.
- Native Capacitor geolocation with foreground permissions; browser smoke tests and debug APK/AAB build workflow.
- Sources, limits, known gaps and setup: [ULTRA technical notes](docs/ULTRA.md).

## التوثيق
- [ULTRA technical notes](docs/ULTRA.md)
- [Architecture and API](docs/ARCHITECTURE.md)
- [Data sources and licenses](docs/SOURCES.md)
- [Security, tests and roadmap](docs/DELIVERY.md)
- [Proposed PostGIS schema](docs/schema.sql)

Open-Meteo free tier is for non-commercial use. No billing authorized or activated.
