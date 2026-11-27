# Commercial release — owner acceptance gates (2026-11-27)

This is a technical compliance review, not legal advice. Do not treat a successful
HTTP response as proof of commercial licensing. No subscription has been bought.

## Provider register
| Service | Commercial status and operational constraints | Official references |
|---|---|---|
| OpenFreeMap (OSM/OpenMapTiles) | Public service available for commercial integration, as-is without SLA; preserve source attribution; no automated scraping. Self-host or contract capacity for strict SLA. | [Terms](https://openfreemap.org/tos/), [FAQ](https://openfreemap.org/), [OSM copyright/ODbL](https://www.openstreetmap.org/copyright) |
| MapTiler Cloud | Free plan only noncommercial/R&D; commercial plan/contract required. Client key owned by project, restricted, attribution, direct requests, monitor quotas. | [Terms](https://www.maptiler.com/terms/cloud/), [pricing](https://www.maptiler.com/cloud/pricing/), [attribution](https://www.maptiler.com/copyright/) |
| Cesium ion / Google Photorealistic 3D Tiles | Commercial entitlement/contract appropriate to distribution; confirm integration/end-user licensing with Cesium, not merely account access. No scraping, offline use, height extraction or mixing Google content with incompatible geocoder. Keep attribution visible. | [Cesium terms](https://cesium.com/legal/terms-of-service/), [pricing](https://cesium.com/platform/cesium-ion/pricing/), [Google policies](https://developers.google.com/maps/documentation/tile/policies) |
| Open-Meteo weather/air/marine | Data CC BY 4.0 with source attribution, but free hosted API is noncommercial. Paid customer API or licensed self-hosting needed. CAMS and weather-model attributions apply. | [terms](https://open-meteo.com/en/terms), [pricing](https://open-meteo.com/en/pricing), [air docs](https://open-meteo.com/en/docs/air-quality-api), [marine docs](https://open-meteo.com/en/docs/marine-weather-api) |
| Photon and Overpass | Public instances best-effort limited usage; commercial build disables direct public Photon/Overpass, uses licensed MapTiler geocoding and municipal height where available. | [Photon](https://github.com/komoot/photon), [Overpass service guidance](https://wiki.openstreetmap.org/wiki/Overpass_API) |
| NASA EONET/GIBS, USGS, NOAA SWPC | Government/public scientific sources; acknowledge source, check third-party event/image credits and disclaimer, no implied endorsement or official logo; best-effort only. | [NASA media guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/), [GIBS](https://www.earthdata.nasa.gov/data/tools/gibs), [USGS data policy](https://www.usgs.gov/data-management/data-licensing), [NOAA disclaimer](https://www.noaa.gov/disclaimer) |
| NYC OTI BUILDING | Municipal roof heights from as-built plans or controlled imagery. Coverage NYC only; not survey certificate or verified current height. | [Dataset](https://data.cityofnewyork.us/City-Government/BUILDING/5zhs-2jue), [Metadata](https://github.com/CityOfNewYork/nyc-geo-metadata/blob/main/Metadata/Metadata_BuildingFootprints.md), [Open Data standards](https://opendata.cityofnewyork.us/wp-content/uploads/NYC_OpenData_TechnicalStandardsManual.pdf) |

Live NYC test: a spatial query at public landmark Empire State Building
(40.7484,-73.9857) returned HTTP 200, DOITT_ID 778052, BIN 1015862,
height_roof 1238.79032716 ft (about 377.58 m), geometry source Photogrammetric,
record edit 2017-08-22. This is a roof measurement from the city record, not
the antenna height, date of measurement or a field survey conducted by ZAMAKAN.
No worldwide authoritative coverage is claimed.

## Activate in owner-controlled accounts
1. MapTiler: https://cloud.maptiler.com/ — select commercially authorized plan,
   configure a restricted client key for actual web and Capacitor origins.
2. Cesium ion: https://ion.cesium.com/ — commercial agreement covering ZAMAKAN
   distribution; enable Google asset 2275207 and issue asset-read client token,
   with minimum scopes and origin restrictions. Check actual credits/rendering.
3. Open-Meteo: https://open-meteo.com/en/pricing — owner authorizes subscription
   or deploys licensed self-hosting. Weather gateway must be publicly reachable
   over HTTPS for mobile; configure the paid key SERVER ONLY and CORS origins
   (native Capacitor uses https://localhost on Android by default).
   WEATHER_DAILY_BUDGET and WEATHER_MINUTE_BUDGET are explicit weighted limits;
   process-local counters reset on restart, and CORS is not authentication.
   For internet deployment require a managed authenticated API gateway,
   distributed rate limits, provider billing alerts and hard caps as applicable.
   Weather service avoids API caching; application memory retains recent model data.
4. Deployment: set VITE_RELEASE_MODE=commercial and VITE_BACKEND_URL to the owner HTTPS server only.
   Set MAPTILER_PUBLIC_KEY and CESIUM_PUBLIC_TOKEN as SERVER environment variables.
   Runtime /api/client-config returns only restricted public client credentials.
   They are not baked into the APK, but may be inspected in network traffic.
   Never put privileged management tokens or secret weather keys in client config.
   Without approved configuration the commercial mode cannot silently call the
   noncommercial hosted weather, Photon or Overpass endpoints.

## Physical Android acceptance
Install test build on a midrange and high-end physical phone, run
`python scripts/android-benchmark.py --serial DEVICE --seconds 600 --perfetto`.
Use matched brightness/network/temperature, unplug charging (wireless ADB if
possible), same route and interaction pattern; repeat normal and power-saving.
Record swipe/rotation/pinch, zoom 18, GPS permission and denial, 2D/3D transition,
offline recovery, heat, memory, WebView frames and battery raw readings. Use the
optional local Perfetto trace for frame timeline/GPU/CPU; use Android
Macrobenchmark PowerMetric only on supported physical device power rails.
No device/ADB was connected here. Do not upload traces/screenshots with private
data. Set owner_approved only when a real test has passed.

## Production signing
The `ZAMAKAN signed commercial release` Actions workflow is manual, with
owner_approved and production environment. Set GitHub production environment
required reviewer(s) and restrict deployments to reviewed feature/main branch.
Owner creates or reuses their Play upload key (never replace an existing key
without Play Console reset). Follow
https://developer.android.com/studio/publish/app-signing ; Google Play App Signing
uses a separate app signing key. On owner-controlled computer, for NEW app only:
```bash
keytool -genkeypair -v -storetype PKCS12 -keystore zamakan-upload.p12 -alias zamakan-upload -keyalg RSA -keysize 3072 -validity 10000
keytool -export -rfc -keystore zamakan-upload.p12 -alias zamakan-upload -file upload-certificate.pem
keytool -list -v -keystore zamakan-upload.p12 -alias zamakan-upload
```
Keep encrypted keystore and password backed up independently; do not send in chat.
Environment secrets: ANDROID_UPLOAD_KEYSTORE_B64 (base64 of encrypted keystore),
ANDROID_STORE_PASSWORD, ANDROID_KEY_ALIAS, ANDROID_KEY_PASSWORD.
Environment variables: BACKEND_URL, ANDROID_UPLOAD_CERT_SHA256 (registered
upload certificate fingerprint). The workflow checks actual provider HTTP access,
then signs a release build and verifies both APK/AAB against the expected public
certificate, publishes binaries and checksums only. Run with a monotonically
increasing version code and correct semantic version. No store upload or billing.
MapTiler origin restrictions must allow the authorized preflight request; if
restricted to app origin, run equivalent preflight in the actual client before
signing, not by removing restrictions. CI debug build also performs disposable
test-certificate release signing; test artifact is NOT a production signing key.

GitHub manual workflow registration requires the workflow to exist on the
default branch. Review/merge the pull request before dispatching the commercial
workflow; the development branch is deliberately not merged automatically.

Browser acceptance additionally confirmed the live NYC response (HTTP 200) at
the public landmark coordinate and displayed 377.6 m, official record link,
geometry source and last edit date in the actual selection card, with no uncaught
JavaScript errors. See [the actual capture](screenshots/municipal-height.jpg).
