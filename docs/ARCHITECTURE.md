# Architecture v0.1

Android Capacitor / browser PWA → Vite JS application → MapLibre GL (WebGL) → Natural Earth GeoJSON + normalized event GeoJSON.
Public REST APIs are requested directly with no credentials, 18s timeout, small in-memory TTL cache and in-flight deduplication. Weather location is rounded to three decimals and sent to the public provider when explicitly selecting a point. Default location is Khan Younis, not the user's detected location. GPS only when user presses GPS.
No database is required at this MVP stage; proposed schema is not applied. No account service, push notifications, or private signal collection.
The Node server serves built static assets and /health; it deliberately does not act as a generic URL proxy. Service worker caches same-origin app assets only, not remote datasets. A full offline mode requires further validation.

## Local/API endpoints
GET /health → {"status":"ok","version":"0.1.0"}
GET / → app
GET /assets/* → build assets
GET /land.geojson → public domain generalized land polygons
Non-GET/HEAD requests return 405; invalid paths are rejected.
Feed endpoints and data licensing are documented in SOURCES.md.
External services are authoritative for their data; users must check official disaster alerts separately.

## Deployment
Docker: docker build -t zamakan . ; docker run --rm -p 8080:8080 zamakan
Cloud Run: deploy Docker image using an authorized GCP project; PORT=8080 and HOST=0.0.0.0 are configured. Enable HTTPS, monitor traffic and provider quotas, confirm billing *before* deployment. No cloud service provisioned.
Static PWA can be hosted on GitHub Pages after enabling Pages with approved workflow. Avoid deploying commercial traffic using free Open-Meteo endpoint.
