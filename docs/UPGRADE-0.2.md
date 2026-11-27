# ZAMAKAN 0.2 — research preview
## Scope and acceptance
| Subsystem | Implemented | Remaining |
|---|---|---|
| Interface | Responsive glass control center, dark/light, RTL/LTR, focus and reset | Device QA and accessibility audit |
| Orbit | SGP4, checksummed TLE, ground track split across antimeridian, altitude | Catalog refresh, propagation benchmark, multi-satellite |
| Radar | RainViewer past frame manifest and raster playback | Provider coverage and quota checks, field validation |
| Wind | Animated local point model direction/speed | Actual gridded field, advection over globe |
| Weather | IFS/GFS/ICON point comparison with explicit time and source status | Model skill verification and uncertainty calibration |
| 3D | Import validated building polygons/heights, extrusion | Verified real building dataset, terrain, telemetry, integrated twin |
| CAP | Read CAP 1.2 file metadata/info in local browser | Trusted issuer, signatures, expiry/update reconciliation, authorized notification |
| FFT | Real radix-2 transform, frequency and amplitude | File streaming, window functions, sensor calibration |
| AI | Optional local Ollama connector, disabled default | Install/configure model, output evaluation; no field data tools |
| Windows | Pinned Electron portable build configuration | Successful CI artifact, signing, native Windows QA |
| Cloud | Docker-ready | Hosting account, HTTPS, production monitoring |

Sources:
- https://shashwatak.github.io/satellite-js/docs/propagation
- https://www.rainviewer.com/api/weather-maps-api.html
- https://github.com/open-meteo/open-meteo/blob/main/openapi/forecast.yml
- https://github.com/ollama/ollama/blob/main/docs/api.md
- https://www.electron.build/docs/nsis/

Local unit tests and production build are run before submitting. Local browser runtime is unavailable (Chromium executable missing, download blocked); expanded browser smoke is configured for GitHub Actions. Provider integration, Windows execution and Android device execution require independent checks. Never use this research preview as a certified warning system.
