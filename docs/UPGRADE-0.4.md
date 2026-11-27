# ZAMAKAN 0.4 release candidate
## New
- Noto Sans Arabic Variable and Inter Variable, self-hosted WOFF2, licensed OFL; coherent outline SVG navigation, accessible 44px controls, glass appearance, RTL/LTR, large-text / reduced-motion settings and persisted language/theme. Preferences contain no credentials.
- Optional username/password account backend (Node 24 SQLite). Registration, sign-in, sign-out, password rotation with old session revocation. Passwords are scrypt (N=131072,r=8,p=1) with independent random salts; session tokens generated with 256 bits of randomness, hashed at rest, HttpOnly, SameSite=Strict, 12-hour expiry, Secure and __Host- on HTTPS deployment. Origin checks, fixed-window rate limits, prepared statements, bounded request body/hash concurrency, security headers, CSP and HSTS at Caddy. No password recovery, email verification, MFA, external penetration test, high availability or distributed rate limiting. Public account service intentionally requires a configured HTTPS origin and database. Windows has an optional local-account database in userData; cloud and local accounts are different. Static Pages/Android builds are guest-only until native cloud-account integration is added.
- NOAA updated RTSW one-minute plasma and magnetometer data paths (active spacecraft only, numeric data) and GOES X-ray flux. Source age, source label, units, missing-data display, polling every two minutes while Space is selected. No data is invented.
- Civil SGP4 calculated positions for select civil science/meteorology satellites using CelesTrak OMM; position updates once per second locally and orbital data is cached. This is estimated propagation, not live spacecraft telemetry. TLE/GP age constraints apply.
- Separately cached MapLibre and orbit engine bundles; fonts are loaded on demand by browser font subsets; worker-based FFT. MapLibre chunk remains substantial, physical-device benchmarking is pending.
## Deployment
To enable local accounts: set ZAMAKAN_AUTH_DB to a database path outside the served dist directory and run the Node server using 127.0.0.1. Docker Compose config enables HTTPS accounts with state volume and a domain controlled by the deployer. The backend must not be exposed directly to the Internet; the Caddy proxy terminates TLS. Configure backups and access permissions on the database. Static Pages does not run the account API.
## Data coverage
Global geographic coordinate selection and model/weather/earth data are not equivalent to global live sensor coverage. Radar, buildings, hazards, CAP, current satellite elements and observations have gaps and cadences. NWS is US jurisdiction, not worldwide CAP. This is a research app, never an official warning service.
## Primary references
- https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html
- https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- https://www.weather.gov/media/notification/pdf_2026/scn26-21_Data_Format_Changes_Impacting_SWPC_Products.pdf
- https://celestrak.org/NORAD/documentation/gp-data-formats.php

The release is not a production security certification; independent review, native tests and provider validation remain required.
