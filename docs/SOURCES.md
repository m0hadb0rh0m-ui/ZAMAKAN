# Official source register — 2026-11-27

**ULTRA update:** Current basemap and geocoding provider terms, optional MapTiler and NASA overlay setup are documented in [ULTRA](ULTRA.md). Natural Earth below is historical and no longer the basemap; browser cross-origin vector, feeds and search have been exercised.
All URLs used by the application are in src/data.js. HTTP probes returned 200 for the six core feeds in this environment; browser cross-origin operation not yet verified. TTL is app refresh policy, not provider guarantee.

| Source | Official docs | Data and coverage | Terms / cost / update |
|---|---|---|---|
| USGS | https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php | Global catalog past 24h; coverage/completeness vary; time, magnitude, depth, review status | USGS government data generally public domain, check contributions and attribution: https://www.usgs.gov/information-policies-and-instructions/copyrights-and-credits ; public feed, no API key, 1 min feed update; TTL 90s |
| NASA EONET v3 | https://eonet.gsfc.nasa.gov/docs/v3 | Open curated global events, capped at 100 results; only point geometries mapped | No API key; NASA data policy https://www.nasa.gov/nasa-brand-center/images-and-media/ ; underlying sources may have their own terms; no SLA or fixed update cadence established; TTL 15 min |
| NOAA SWPC | https://services.swpc.noaa.gov/products/ | Estimated planetary Kp time series (3h bins); schema may change | Public JSON, attribution NOAA; check third-party exceptions https://www.noaa.gov/disclaimer ; no published quota verified; TTL 5 min |
| Open-Meteo | https://open-meteo.com/en/docs | Global numerical model forecast, current model values, hourly series | CC BY 4.0 with attribution; hosted free tier non-commercial only, less than 10,000 requests/day, 5,000/hour, 600/min; https://open-meteo.com/en/terms ; commercial plan https://open-meteo.com/en/pricing ; cadence depends on model; TTL 15min |
| Open-Meteo Air Quality / CAMS | https://open-meteo.com/en/docs/air-quality-api | Model PM10, PM2.5, European AQI, dust; model grids and coverage vary | Same hosted terms, attribution to Open-Meteo and CAMS; TTL 15min |
| Open-Meteo Marine | https://open-meteo.com/en/docs/marine-weather-api | Model waves and period for available water regions; land points may be missing | Same hosted terms; TTL 15min |
| Natural Earth | https://www.naturalearthdata.com/about/terms-of-use/ | Static 1:110m land generalization; source https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_land.geojson | Public domain; local copy rounded to 4 decimals; not an accurate street map |

No independent proof of hazard impact zones, ground truth, numeric uncertainty or all-data spatial resolution supplied. Missing values stay blank. NOAA Kp is estimated and USGS magnitude is not a damage severity. EONET reported events are not hotspot counts. Source update timestamp and retrieval timestamp are distinct.

| Open-Meteo Geocoding | https://open-meteo.com/en/docs/geocoding-api | GeoNames locations, WGS84 coordinates | Hosted usage terms as above; GeoNames attribution https://www.geonames.org/ ; requested on search submission |
| NASA GIBS | https://www.earthdata.nasa.gov/data/tools/gibs | MODIS Terra true-color daily WMTS imagery up to level 9; availability varies by day/coverage | NASA EOSDIS attribution; public tile endpoint, no key required; no quota/SLA confirmed; test tile HTTP 200 image/jpeg |

## Deferred integrations
NASA FIRMS: https://firms.modaps.eosdis.nasa.gov/api/ — requires MAP_KEY for many routes, hotspot product terms and quotas to verify.
NASA GIBS: more sensors, historical comparisons and full imagery coverage verification deferred.
CelesTrak: https://celestrak.org/NORAD/documentation/gp-data-formats.php — TLE/OMM and SGP4 to implement and verify.
Google 3D Tiles / Cesium ion / Mapbox: account, service terms and possible billing; no credentials requested or activated.
ECMWF, WMO, CAP alert providers, CNEOS, NHC, GNSS TEC, AIS/ADS-B: not yet integrated.
