# زَمَكان | ZAMAKAN 2.1.0 RC
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

## الموجود فعليًا
- MapLibre globe/mercator مع خطوط سواحل Natural Earth الحقيقية (دقة 1:110m، ليست خريطة شوارع أو صور أقمار).
- اختيار موقع بالنقر، البحث عن المدن عبر GeoNames/Open-Meteo، GPS بإذن المتصفح، قياس مسافة الدائرة العظمى.
- طبقة NASA GIBS MODIS Terra اختيارية بتاريخ محدد؛ مربعات 256px، حتى zoom 9، قد توجد فجوات أو سحب؛ لا تمثل التصوير اللحظي.
- طبقات زلازل USGS وEONET للأحداث ذات الهندسة النقطية فقط؛ مؤشر NOAA Kp.
- طقس حالي نموذجي وتوقعات بالساعة؛ جودة الهواء والأمواج عند الطلب.
- شريط زمني UTC يعرض بيانات التغذية المتوفرة وناتج النموذج؛ ليس أرشيفًا كاملًا أو محاكاة.
- AR/EN وRTL/LTR، تصميم متجاوب، مظهر فاتح وداكن، منصة بيانات واضحة المصدر.
- محلل إحصائي حتمي بسيط؛ ليس LLM ولا يقدم تحذيرات رسمية.
- فشل الشبكة يظهر غير متاح أو قديم عند وجود نسخة ذاكرة سابقة.
- خادم ملفات HTTP صغير بحدود مسارات وCSP؛ لا API أسرار أو حسابات.

## التوثيق
- [Architecture and API](docs/ARCHITECTURE.md)
- [Data sources and licenses](docs/SOURCES.md)
- [Security, tests and roadmap](docs/DELIVERY.md)
- [Proposed PostGIS schema](docs/schema.sql)

Open-Meteo free tier is for non-commercial use. No billing authorized or activated.

## 0.2 — Glass Control Center (research preview)
- Glass dashboard with responsive navigation, accessible focus states, map focus and reset.
- SGP4 ground tracks via satellite.js (user-provided, checksummed TLE; ±7 days of epoch, not live telemetry). See [CelesTrak](https://celestrak.org/NORAD/elements/).
- RainViewer historical radar playback (coverage and availability vary). Point wind particles represent the selected **model** location only; no global gridded wind field.
- Compare ECMWF IFS, NOAA GFS and DWD ICON at a common UTC hour and location.
- FFT radix-2 one-sided spectrum (4–65,536 evenly spaced finite samples).
- Read CAP 1.2 XML locally (unverified imports; no issuer authentication, live alert feed or notifications).
- Extrude user-provided GeoJSON polygons with numeric metre heights. No automatically sourced city models, terrain fusion or real-time digital twin.
- Optional local generative assistant through Ollama, disabled by default. Run a model already installed in Ollama, then start the production server with `ZAMAKAN_LOCAL_MODEL` set to that model's exact name. It is accessible only at `http://127.0.0.1:4173`. No live-data tools, no paid API, no automatic model download. Static/PWA and Android packages do not expose the local model endpoint.
- Windows x64 portable EXE build job uses Electron; the artifact is unsigned and must be tested on Windows before distribution. Desktop currently denies permission requests including GPS.
- Cloud-ready via the existing Dockerfile; actual hosting, HTTPS certificates and public URL are not provisioned.

See [0.2 validation and limitations](docs/UPGRADE-0.2.md).

## 0.3 — Scientific operations upgrade
Supersedes the 0.2 feature descriptions above: regional sampled weather-model wind particles, UTC-aligned forecast charts, OSM vector building profiles, NWS alert integration, worker-based FFT/PSD, local AI snapshot grounding, Windows portable packaging checks and cloud deployment templates.
[Full implementation, testing, deployment instructions and known limitations](docs/UPGRADE-0.3.md).

The public cloud and desktop release are not currently deployed or certified. Test fixtures are not live measurements.

## 0.4 — Release candidate
Adds persistent language/accessibility settings, local fonts, coherent vector icons, optional SQLite account backend, stronger security controls and updated NOAA space telemetry with civilian SGP4 second-by-second propagation. See [release candidate scope and security limitations](docs/UPGRADE-0.4.md).

## 0.5.0 release

See [scientific reliability and staging guide](docs/release-0.5.md). Public source health is available on the Node server at `/status`; OpenAPI at `/openapi.json`.

## 2.0 — Mobile-first research release candidate

See [report implementation and release gates](docs/release-2.0.md) for scope, verified design decisions and remaining production dependencies.

## 2.1 — Production pilot

See [release and cloud operations](docs/release-2.1.md) for the hosted worker, account sync, CAP registry, 3D scene, optional FCM and verified-signature build workflow.
