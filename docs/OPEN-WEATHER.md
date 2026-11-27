# ZAMAKAN independent weather — operator guide

No Open-Meteo subscription is needed for the independent weather mode. It uses
original forecast fields from ECMWF IFS / AIFS Single, NOAA GFS fallback and
ECMWF wave forecasts. Native grid files are sampled to 1 degree to bound payload
size; not observations and not city- or building-scale weather. No data is
generated when a source fails. Missing fields are null. Rain is model accumulation
(not mm/h); wind animation is illustrative, based on model U/V and accelerated
for visibility. Air quality accepts an original CAMS GRIB file after the owner
downloads it and accepts its license; no automatic CAMS download is claimed.

## Owner deployment
On an existing Linux host (no paid provider purchase required):
```sh
python -m venv .venv
. .venv/bin/activate
pip install -r scripts/weather-requirements.txt
export WEATHER_DATA_DIR="$PWD/weather-data"
sh scripts/update-weather.sh
```
Set WEATHER_DATA_DIR to the absolute directory in the Node server environment.
Keep the previous successful snapshots on disk; run update-weather.sh every six
hours via the host scheduler (avoid overlapping runs). The server rejects old
model runs and does not silently use the noncommercial public API. The build
profile needs VITE_BACKEND_URL to address the owner HTTPS backend. Set budgets
and approved origins as documented in OWNER-PROVIDERS.md. Do not set the paid
Open-Meteo key if using this mode.

GitHub Actions produces downloadable snapshot artifacts when run explicitly /
on a default branch schedule. The default branch remains untouched; a scheduled
workflow will not execute from this feature branch until merged to default.
Artifacts are not a production CDN; copy to the owner backend or use a separately
authorized distribution service. Check runner quotas and bandwidth limits.
No live deployment, scheduler or forecast ingestion is certified solely by CI.

For air quality: download regular latitude/longitude GRIB surface PM10/PM2.5
(kg/m³) from https://ads.atmosphere.copernicus.eu/datasets/cams-global-atmospheric-composition-forecasts
using the owner's licensed account. Run
`python scripts/ingest-weather.py --model cams --input downloaded.grib --output "$WEATHER_DATA_DIR/cams.json"`.
The air card stays unavailable when the file is absent or stale. Dust and AQI
are not invented. Marine wave height/direction/period use the ECMWF wave model;
current velocity and salinity are not implemented.

Sources: ECMWF Open Data CC BY 4.0
https://www.ecmwf.int/en/forecasts/datasets/open-data ; NOAA NOMADS
https://nomads.ncep.noaa.gov/ ; CAMS attribution and license from ADS.
Verify exact model distribution and commercial rights before launch.

## Map credentials
Set MAPTILER_PUBLIC_KEY and CESIUM_PUBLIC_TOKEN once on the deployed backend;
never put the values in a source file or a GitHub issue. They are intentionally
restricted public credentials, observable in provider network requests; never
use a private/admin token. See OWNER-PROVIDERS.md. The signed Android release
requires HTTPS backend configuration and signing secrets separately.
