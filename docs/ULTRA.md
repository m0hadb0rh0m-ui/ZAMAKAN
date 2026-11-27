# ZAMAKAN ULTRA — map and interface reconstruction

Branch: `feature/zamakan-ultra-map-ui`. The original `main` branch is unchanged.

## Run
```sh
npm ci
npm test
npm run build
npm run serve
```
Open http://127.0.0.1:4173. HTTPS is required for browser geolocation outside localhost. The startup center is a fixed Khan Younis map coordinate, not a detected user's location. Press the location button to request permission.

## Providers and legal boundaries

| Service | Enabled by default | Role and conditions |
|---|---|---|
| [OpenFreeMap](https://openfreemap.org/quick_start/) | Yes | Liberty streets, Positron light, Fiord dark. Vector OpenMapTiles / OpenStreetMap; retain attribution. [Terms](https://openfreemap.org/tos/) and [ODbL attribution](https://www.openstreetmap.org/copyright). Public service is as-is, no SLA; self-host for availability guarantees. No bulk tile downloading. |
| [Photon](https://github.com/komoot/photon) | Yes | Limited public geocoder with forward and reverse search, OSM data, autocomplete with 750 ms debounce and cancellation. Suitable for reasonable prototype/small-scale usage only; self-host or contract an authorized service for large-scale production. |
| [MapTiler](https://docs.maptiler.com/cloud/api/) | No | Optional satellite-v4, hybrid-v4, outdoor-v4, topo-v4, geocoding and raster DEM terrain-rgb-v2. Provide an explicitly approved **restricted public client key** in `.env.local` (`VITE_MAPTILER_PUBLIC_KEY`) then rebuild. A Vite public key is visible in client bundles and is not a secret. Restrict it to approved sites/apps, review quota and billing. Never enter account secrets, unrestricted credentials or private API keys. No account or paid service created. |
| [NASA EOSDIS GIBS](https://www.earthdata.nasa.gov/data/tools/gibs) | Optional scientific overlay | MODIS Terra scientific observation, requested day (not necessarily available), level 9 maximum, not HD building imagery. |
| [Open-Meteo](https://open-meteo.com/en/terms) | Yes | Existing non-commercial weather, air quality, marine and nine-location batch weather samples. Commercial deployment needs an appropriate plan or self-hosting; no activation here. |
| USGS / NASA EONET / NOAA SWPC | Yes | Original event and space-weather feeds; source timestamps and retrieval status shown. No emergency alerts or fabricated readings. |

Satellite acquisition date cannot be obtained from the general MapTiler style; do not claim an acquisition date. Tile-level coverage, building records, road names and addresses are dependent on OSM/provider coverage and may predate physical changes, especially in conflict areas. Do not use the map as an assessment of building condition or safety.

The stylesheet's preview swatches are symbolic selectors, not satellite photographs.

## Engine and UI
- Default vector street map instead of local low-resolution `land.geojson` (that historical file remains in repository but is not rendered).
- MapLibre GL WebGL, tile streaming and bounded tile cache; adaptive zoom (country 5, city 12, district 14, street 17, address 19, GPS by accuracy). Explicit 2D, globe and 3D controls, smooth camera, reduced-motion preference.
- Building footprints, street labels, POIs and house numbers where present. Real OSM geometry extruded using OpenMapTiles `render_height` and `render_min_height`. **Provider does not expose provenance distinguishing measured, derived and default heights**, so all rendered heights are marked unverified. DEM is optional. No photorealistic meshes or physically simulated shadows.
- Full map, floating search and controls, dock, hideable settings/layers, draggable/expandable scientific sheet, responsive RTL/LTR and safe areas.
- Event clustering; app state and scientific layers restored after style changes. NASA science as separate raster overlay. Weather model points represent nine sampled locations, not continuous raster interpolation. Actual provider coordinates and model timestamp are displayed; choose temperature, clouds, precipitation, winds or pressure.
- Search sends map viewport center as proximity bias, not continuous tracking; coordinates follow latitude, longitude syntax. Reverse can be explicitly requested on selected point. Queries and positional data may go to providers. No private data stored persistently.
- No external tile service worker caching; app shell only. Offline UI may remain accessible but maps can be unavailable.
- `npm run android:init` and `npm run android:sync` generate the Android project and insert foreground GPS permissions. Native geolocation uses Capacitor plugin and runtime permission checks; web uses navigator.geolocation. Debug APK/AAB workflow configured. Release signing is separate; no keystore in repository.

## Evidence and limitations
- Live Chromium test with real provider responses: 219 successful OpenFreeMap requests in the first complete run; no unhandled page errors. Geolocation uses a **browser test fixture**, not user GPS.
- 25 unit tests passed; Vite production build succeeded. Warning: WebGL bundle exceeds default 500 kB chunk size threshold (not a build failure).
- Android init + sync passed, including plugin installation. Android SDK / emulator absent in local execution environment; physical Android WebView, thermal/battery behavior, pinching and APK/AAB compilation still require CI/device testing.
- No MapTiler key available. HD satellite, hybrid, terrain, topo and DEM adapters are implemented but not end-to-end validated. Google Maps needs separate official SDK and approval; no Google map tile scraping. Cesium/3D Tiles, global continuous weather rasters, routing, offline map downloads, measured-height provenance and native sensor benchmarks remain outside this increment.
- Browser screenshots are actual app capture, not generated mockups. See screenshots directory and workflow artifacts.
