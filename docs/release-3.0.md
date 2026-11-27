# ZAMAKAN Global Intelligence 3.0 — Blueprint implementation RC.1
Source: ZAMAKAN_3_Complete_Development_Blueprint.docx, 27 November 2026. Base: 2.1.0 RC (755b66b). Requirements are not deemed met by UI presence alone.

| Blueprint section | Implementation / gate |
|---|---|
| 1–5, 26–27 | Existing five-destination shell, Arabic/English fonts and safe-area navigation, independent screens; new exact dark/light palette tokens, 48px primary targets, module search, 12 direct shortcuts, source states; physical devices/accessibility audit pending. |
| 6–10 | Existing MapLibre globe/flat, date-based GIBS, terrain/buildings; new imagery toggle/opacity, scale, named archive/latest/forecast modes, UTC date and time; no complete ordered/drag layer manager or verified global tile archive; no interpolated data, invalid/too-distant hourly samples refused. |
| 11 | Existing weather model local hourly/daily, regional pressure/rain/wind and IFS/GFS/ICON comparison. AIFS, ensemble, full upper-air sections, IMERG unimplemented. |
| 12 | Standalone MODIS Terra daily imagery reader opening dated GIBS map; existing two-date toggle; STAC search, false-color, multi-sensor comparison, COG processing and actual scene metadata pending. |
| 13 | Existing USGS/EONET, history and filters, NWS and limited international RSS references. CAP structure and semantic checks and reference lifecycle exist; official OASIS XSD validation, complete issuer authentication, global alert coverage and GDACS live adapter remain required. |
| 14–16 | Existing marine Open-Meteo fields, NOAA space weather, SGP4 and CAMS model via Open-Meteo. GEBCO, Copernicus Marine depth/biogeochemistry, SWOT, station-level OpenAQ, integrated vegetation and official drought indicators pending. |
| 17 | New point ERA5 (1940–yesterday, max ten years per query; source latency applies) daily °C and mm via Open-Meteo. Two seasonally aligned periods, completeness counts, differences, gaps, CSV and JSON evidence. Not AOI zonal statistics, climatological baseline anomaly, or historical image change classification. |
| 18 | Standalone local GIS file reader with existing validated GeoJSON/KML/GPX parser and spherical distance/area, GeoJSON export, existing map tools. No polygon intersection/topology assurance, elevation profile, spatial heatmap or server raster processing. |
| 19 | Retained FFT/PSD, WASM worker, STFT, SGP4 and model comparison. Broader teaching simulations pending. |
| 20 | Existing local Ollama option and snapshot grounding; no production AI provider or autonomous actions. |
| 21–23 | New product catalog clearly separates partial connections, missing keys, and backend requirements. Existing source adapters/lineage and cache; full unified DataEnvelope and source-specific coverage/resolution/issue-time validation incomplete. |
| 24 | Existing low-data setting, IndexedDB cache, shell cache, Android permission script, opt-in FCM source. Offline tests on devices, LRU by access, quota, comprehensive security audit, public service and configured push pending. |
| 25 | Candidate source and test suite, not signed release. CI builds web/Android/Windows; actual signed release requires private signing credentials and physical-device acceptance. |
| Projects | Local snapshots of location, selected time, filters, event toggles, imagery/opacity and measurement vertices, save/open/delete/export. Does not archive source tiles or sync project files. |

## Tests
Run `npm ci && npm test && npm run build`. For cloud smoke: `node cloud/build.mjs && node tests/cloud-smoke.mjs`. Browser fixture tests: `ZAMAKAN_SOURCE_MODE=mock npm run serve` then `python tests/browser_smoke.py`. Fixtures are not live scientific data. All missing services remain unconnected rather than inventing observations.

## Source documentation
- ERA5 archive API: https://open-meteo.com/en/docs/historical-weather-api (reanalysis, non-commercial free API limits apply).
- MODIS Terra GIBS: https://worldview.earthdata.nasa.gov/ (daily product, gaps and coverage limits).
- Existing production pilot, signing and FCM requirements: [2.1 report](release-2.1.md).
