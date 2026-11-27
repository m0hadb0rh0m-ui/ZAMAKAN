# ZAMAKAN Global Intelligence 3.0 — Blueprint implementation RC.2
Source: ZAMAKAN_3_Complete_Development_Blueprint.docx, 27 November 2026. Base: 2.1.0 RC (755b66b). Requirements are not deemed met by UI presence alone.

| Blueprint section | Implementation / gate |
|---|---|
| 1–5, 26–27 | Existing five-destination shell, Arabic/English fonts and safe-area navigation, independent screens; new exact dark/light palette tokens, 48px primary targets, module search, 12 direct shortcuts, source states; physical devices/accessibility audit pending. |
| 6–10 | Existing MapLibre globe/flat, date-based GIBS, terrain/buildings; new imagery toggle/opacity, scale, named archive/latest/forecast modes, UTC date and time; no complete ordered/drag layer manager or verified global tile archive; no interpolated data, invalid/too-distant hourly samples refused. |
| 11 | Existing weather model local hourly/daily, regional pressure/rain/wind and IFS/GFS/ICON comparison. RC.2 adds AIFS as a fourth explicit model; ensemble, full upper-air sections and IMERG remain unimplemented. |
| 12 | Standalone imagery reader with five fixed NASA GIBS WMTS products (Terra and Aqua natural color, Terra false color 7-2-1, NOAA-20 and Suomi NPP VIIRS natural color); product/date/opacity persisted, existing two-date toggle; STAC search, side-by-side comparisons, COG processing and scene cloud metadata pending. Product capabilities checked live; date gaps remain possible. |
| 13 | Existing USGS/EONET, history and filters, NWS and limited international RSS references. CAP now validates locally against the unmodified official OASIS XSD via WASM before existing structural, semantic and reference checks. GDACS fixed 24h RSS reader parses reported point events and deduplicates event IDs; verified live response of 45 entries. Full issuer authentication and global official alert coverage remain open. |
| 14–16 | Existing marine Open-Meteo fields, NOAA space weather, SGP4 and CAMS model via Open-Meteo. GEBCO, Copernicus Marine depth/biogeochemistry, SWOT, station-level OpenAQ, integrated vegetation and official drought indicators pending. |
| 17 | New point ERA5 (1940–yesterday, max ten years per query; source latency applies) daily °C and mm via Open-Meteo. Two seasonally aligned periods, completeness counts, differences, gaps, CSV and JSON evidence. Not AOI zonal statistics, climatological baseline anomaly, or historical image change classification. |
| 18 | Standalone local GIS file reader with existing validated GeoJSON/KML/GPX parser and spherical distance/area, GeoJSON export, existing map tools. RC.2 adds bounded two-polygon intersection with basic topology checks and approximate area, excludes dateline crossings; 60-sample path DEM profile from Copernicus GLO-90 via Open-Meteo with CSV and missing samples. Spatial heatmaps, full topology assurance, AOI raster stats and server raster processing remain pending. |
| 19 | Retained FFT/PSD, WASM worker, STFT, SGP4 and model comparison. Broader teaching simulations pending. |
| 20 | Existing local Ollama option and snapshot grounding; no production AI provider or autonomous actions. |
| 21–23 | New product catalog clearly separates partial connections, missing keys, and backend requirements. Existing source adapters/lineage and cache; DataEnvelope now attached to normalized fetchSource results, separates retrieval/valid/observation times, requested and actual grid locations; unavailable metadata remains null. Other adapters still need migration and complete product-specific coverage/resolution metadata. |
| 24 | Existing low-data setting, IndexedDB cache, shell cache, Android permission script, opt-in FCM source. Access-based LRU in memory and IndexedDB; CAP schema WASM added to shell precache. Offline tests on devices, quota testing, comprehensive security audit, public service and configured push pending. |
| 25 | Candidate source and test suite, not signed release. CI builds web/Android/Windows; actual signed release requires private signing credentials and physical-device acceptance. |
| Projects | Local snapshots of location, selected time, filters, event toggles, imagery/opacity and measurement vertices, save/open/delete/export. Does not archive source tiles or sync project files. |

## Tests
Run `npm ci && npm test && npm run build`. For cloud smoke: `node cloud/build.mjs && node tests/cloud-smoke.mjs`. Browser fixture tests: `ZAMAKAN_SOURCE_MODE=mock npm run serve` then `python tests/browser_smoke.py`. RC.2: 60/60 Node tests pass; web build and cloud Worker smoke pass; Chromium browser smoke completed with zero uncaught page errors (fixture network responses for weather, climate and CAP feed). npm audit reported zero known vulnerabilities at test time. Separate live checks fetched the GDACS RSS, GIBS capabilities, two ERA5 days, and two DEM samples. These do not prove worldwide live coverage. Fixtures are not live scientific data. All missing services remain unconnected rather than inventing observations.

## Source documentation
- ERA5 archive API: https://open-meteo.com/en/docs/historical-weather-api (reanalysis, non-commercial free API limits apply).
- MODIS Terra GIBS: https://worldview.earthdata.nasa.gov/ (daily product, gaps and coverage limits).
- Existing production pilot, signing and FCM requirements: [2.1 report](release-2.1.md).

- OASIS CAP 1.2 official schema: https://docs.oasis-open.org/emergency/cap/v1.2/os/CAP-v1.2-os.xsd (unmodified local copy).
- GDACS: https://www.gdacs.org/feed_reference.aspx (reported events, not authenticated CAP).
- Copernicus DEM: https://doi.org/10.5270/ESA-c5d3d65 via https://open-meteo.com/en/docs/elevation-api.
- ECMWF AIFS: https://open-meteo.com/en/docs/ecmwf-api.
