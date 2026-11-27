# ZAMAKAN 0.3 — science and deployment upgrade
Research preview, not a certified early-warning service.

## 8 requested subsystems
| Module | Implemented in source | Remaining / operational limitations |
|---|---|---|
| Wind | Regional 5×5 Open-Meteo model grid, selectable named model/extent, meteorological FROM direction converted to vector, bilinear interpolation, geographic particle advection, adaptive Canvas, reduced motion | Coarse regional sampling, not global gridded observations; direct API quota/coverage and field accuracy not confirmed |
| Weather | ECMWF IFS, NOAA GFS and DWD ICON; UTC-time alignment, unit validation, missing-value gaps, 24/48-hour curves and spread, CSV | Spread is not calibrated uncertainty; actual provider data and validation against observations |
| 3D | OpenFreeMap/OpenMapTiles vector building extrusion plus water/road context, WGS84 GeoJSON local import | Approximate OSM heights and variable coverage, not photorealistic survey data, no real-time digital twin |
| CAP | CAP 1.2 XML metadata/lifecycle/area polygons, distinguish imported from official-source polygons; official US NWS GeoJSON active-alert adapter with deduplication and source URLs | NWS region only, no international CAP aggregation, signatures, authenticated issuing, automated push, guaranteed delivery or official decision system |
| FFT | Radix-2 FFT in Web Worker, arbitrary samples 4–65,536 padded to nearest power of two, rectangular/Hann/Hamming/Blackman, DC removal, one-sided calibrated amplitude and PSD, relative dB, CSV input/export, Nyquist/bin resolution | Uniformly sampled input required; no live sensor stream, no external physical calibration |
| AI | Optional local Ollama generation, explicit weather/Kp snapshot with source/time/state, no location in snapshot, allowlisted fields, same-origin loopback API, one concurrent request | Actual inference requires installed model; no autonomous access to the web, no verified conclusions |
| Windows | Electron 45.5.0, locked packaging dependencies, portable x64 CI build and packaged-app startup smoke + SHA-256 manifest | Build/launch workflow not executed in this workspace; unsigned, no EXE produced here |
| Cloud | Node 24 non-root container, health check, hardened Compose app service, Caddy TLS reverse proxy; separately manual Pages deployment workflow | No live hosting provisioned, no domain or certificate, no paid services or credentials activated |

## Technical verification
- 26 automated Node tests: scientific computation, validation, and mocked local Ollama API; all passed.
- Production web build: passed.
- Chromium browser integration: tested FFT worker, wind canvas, model comparison, imported 3D building, CAP import, NWS response, disabled AI state, navigation and responsive width. Wind/model/API responses were deterministic fixtures, not live feed verification.
- npm audit for the root web/Android dependency tree reported zero known vulnerabilities at time of check; this is not a security certification.
- Windows, APK on physical devices, cloud and real Ollama inference remain to be verified.
- No public publication has been carried out by this upgrade.

## Deployment (only after explicit authorization)
- Static web: choose GitHub Actions as the Pages source, manually run the `ZAMAKAN public web (manual)` workflow. Static hosting does not run the optional AI server.
- A compatible Docker host with DNS: set ZAMAKAN_DOMAIN to a domain you control, point A/AAAA DNS to the host and run `docker compose -f deploy/compose.yaml up -d --build`. Configure network/firewall and monitor logs; Caddy requests TLS certificate. This does not provision a cloud account. Public model APIs have their own terms and rate limits.
- Windows: run the build workflow on a Windows runner. Download ZAMAKAN-Windows-portable artifact only after successful packaging and smoke test. Verify SHA-256 and signing status.
- Local AI: install a suitable Ollama model separately, set ZAMAKAN_LOCAL_MODEL to the exact installed model and run the Node production server on loopback; AI is disabled when public-facing, and on static/Android packages.

## Technical primary documentation
- https://open-meteo.com/en/docs
- https://github.com/open-meteo/open-meteo/blob/main/openapi/forecast.yml
- https://maplibre.org/maplibre-gl-js/docs/examples/display-buildings-in-3d/
- https://openmaptiles.org/docs/schema/
- https://www.weather.gov/documentation/services-web-alerts
- https://github.com/ollama/ollama/blob/main/docs/api.md
- https://www.electron.build/docs/nsis/
