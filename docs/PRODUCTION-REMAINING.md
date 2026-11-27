# ZAMAKAN ULTRA — production readiness, second stage

## Licensed imagery
Open Settings → Licensed map providers. Enter a **client-use public MapTiler key**
restricted to approved production web origins / Android client configuration. The
application requests the official satellite-v4 style to check access, then switches
to Satellite HD. The same key enables hybrid, terrain and DEM. It is kept in JS
memory only for this session; Remove key switches back to streets. Never paste
account/admin secrets or use a key copied from another application. A production
deployment can instead inject VITE_MAPTILER_PUBLIC_KEY at build time (public client
keys are visible in web bundles; restrict them at the provider). Coverage, imagery
dates and resolution depend on the provider; no fabricated capture dates.
No paid plan has been activated. The current setup has no project key, so provider
authorization, satellite tile rendering and usage quotas are still acceptance gates.

## Photorealistic 3D
The separate CesiumJS viewer is loaded only when explicitly opened. Supply a
restricted Cesium ion **client access token** with access to Google's
photorealistic 3D Tiles asset (entitlement must be enabled in the owner account).
The viewer uses only the official Google tileset and Google geocoder, with provider
credits visible. Close destroys its WebGL viewer and returns to the previous map;
backgrounding also closes it. The token is not stored in browser storage or git.
Resolution, cache and frame-rate budgets are bounded; low-power mode lowers rendering
resolution. MapLibre remains the ordinary map. No data is scraped or mixed into
the Google tiles, and this appearance is not independent building-height evidence.
Cesium assets are bundled for web and Capacitor. A real entitlement is required to
verify actual 3D imagery, attribution, and Android GPU behavior.

## Weather
A 5×5 grid samples Open-Meteo model data using the response's actual coordinates
and common model timestamp. Inverse-distance interpolation generates a continuous
regional raster only inside the convex hull of available samples; no extrapolation
outside it. Temperature, clouds, precipitation, wind speed and surface pressure
share their corresponding legend. Original model sample points remain visible.
The layer is restored across map-style switches. This is a regional model visualization,
**not radar, observations, wind direction or global gridded forecast tiles**.
Load Visible Region refreshes it on demand; opt-in avoids background requests.
The free Open-Meteo endpoint is intended for eligible noncommercial use; verify
commercial terms/plan before production traffic.

## Building-height provenance
At building-level zoom tap a mapped building and select Check height provenance.
A single bounded read-only Overpass request checks current OSM building geometry
and retains the source record URL and last edit timestamp. A unique containing
closed building way is required; overlapping or uncertain relation geometry is
reported as ambiguous. The last edit timestamp is not a measurement date.
- Explicit height: parsed meters/feet, recorded in OSM, not independently surveyed.
- Levels only: estimate of 3 m per floor (not a measurement).
- Tile render height: for visualization only; no independent evidence.
- Unknown/ambiguous: no verified value.
Independent accuracy or survey-quality validation still requires an authoritative
local building inventory/survey with an appropriate license. Do not label all
OSM heights "verified". Use low-frequency user-initiated source checks, not bulk queries.

## Physical Android acceptance gate
Build the debug APK/AAB through Actions. Install debug APK on a physical Android
phone, enable USB debugging, and run:
```sh
adb devices -l
python scripts/android-benchmark.py --serial DEVICE_SERIAL --seconds 600
```
The script rejects known emulators, captures battery, app battery stats, frame stats,
memory, thermal data, before/after screenshots, OS/WebView details and operator
observations. Prefer a wireless ADB connection or an unplugged battery run for
energy measurements; compare same device, brightness, duration, network and map
route. Repeat on midrange and high-end phones and in low-power mode. For robust
WebView/GPU jank and power data supplement with Android Studio Profiler/Perfetto
and device power rails where supported. Raw gfxinfo is diagnostic, not a guaranteed
GPU FPS measurement; battery percentage alone cannot establish energy efficiency.
Do not commit device screenshots, serials or measurements with private information.
No physical phone/ADB is available in this execution environment; no device result
has been certified. Production signing, store compliance, provider quotas and
real-device UX all require owner-side validation.

## Local verification
35 unit tests passed; Vite production build succeeded, npm audit reported zero
known vulnerabilities. Live Chromium tests exercised street tiles and controls
with no uncaught JavaScript errors; the continuous regional raster was separately
visually confirmed using a successful 25-point Open-Meteo request. A live
Overpass request for a public Berlin building returned HTTP 503 in this
environment; provider lookup remains unverified live, and the UI reports the
failure rather than claiming a height. Licensed imagery and photorealistic
3D were not rendered because no authorized keys were supplied.
