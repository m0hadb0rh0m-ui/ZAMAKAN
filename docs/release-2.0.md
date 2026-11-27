# ZAMAKAN 2.0 RC — report implementation and release gates
Source: ZAMAKAN_Development_Report.docx. This is a research release, NOT a certified warning system.

## Implemented
- Five primary destinations (Home, Map, Observe, Lab, More); eight home observatories; standalone weather, environment, marine, space and signal screens; local bilingual fonts, accessibility settings, glass cards, favorites, manual coordinates and location search.
- Map engine loaded on demand; regional 25-point weather and marine model grids, day/night geometry, local GeoJSON/KML/GPX import, approximate area/distance, available DEM terrain, USGS US-only faults, date toggling for archived NASA imagery. Existing OSM-derived approximate buildings and user-supplied height polygons, not survey-grade digital twins.
- Hourly and daily forecasts, humidity chart, multi-location weather comparison; existing UTC-aligned IFS/GFS/ICON comparison. Marine speed, waves, sea surface temperature; air quality, particulate matter, UV and dust where available; model soil moisture is not a drought classification. NASA Worldview link for external NDVI.
- Disaster filters (category, time, magnitude, distance), USGS M4.5+ monthly archive, existing point EONET and CAP/NWS. Official issuer authenticity and global alert coverage are not guaranteed.
- Civil SGP4 propagation, 24-hour approximated ISS passes, solar wind speed chart, existing NOAA telemetry. Ground tracks are projected to Earth; not orbital altitude visualization or live spacecraft telemetry.
- Independent worker-based FFT/PSD/WASM and STFT spectrogram, waveform, CSV import/export, series correlation and RMSE. Synthetic samples are labeled.
- IndexedDB source cache bounded by count and bytes; low-data mode pauses periodic fetches; PWA shell precaches core assets; uncached maps and sources may not work offline. Fine/coarse Android permissions configured during native project generation. APK release build unsigned.
- Existing local account service, feature flags, source health, OpenAPI contract tests, server CSP and security limits. Local Ollama assistant remains opt-in. No paid service or secrets configured.

## Gates still open
- Actual global availability varies by national coverage, source latency, API limits and licenses. No second-by-second worldwide meteorological observations; local clock and SGP4 propagation can update every second.
- Map terrain, regional source grids, satellite-pass estimates, real-device GPS and input permissions require real-network/device validation. True orbital altitude paths, official drought index and integrated NDVI tiles, complete digital twins, and worldwide official CAP issuers remain incomplete.
- FCM requires a Firebase project, authenticated device enrollment/consent, sender credentials and authorized alert feeds; no push or background-alert guarantee.
- Accounts/cloud sync in an actual deployed service, public HTTPS endpoint, production AI provider, signed Android/Windows artifacts and store review require separate configuration. No live server or production signing credentials have been provisioned.
- Release CI must pass web browser smoke, Android and Windows packaging; validate physical devices, startup time/memory/network usage, offline first install and end-to-end security audit before launch.
