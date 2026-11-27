# زَمَكان | ZAMAKAN 0.1.0
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
