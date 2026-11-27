# Owner-only configuration — ZAMAKAN ULTRA

The end user never supplies credentials. There are no key input fields, provider
signup buttons, or "key required" prompts. Unconfigured premium map styles,
terrain and 3D are not shown. Commercial weather controls are hidden until the
gateway is configured. The public map and scientific sources remain.

## One-time owner configuration
Deploy the Node application/server to an owner-controlled HTTPS host. Do not
commit real credentials or send them in chat. In your hosting dashboard's
environment/secret variables, set:
| Server variable | Obtain it / purpose |
|---|---|
| MAPTILER_PUBLIC_KEY | https://cloud.maptiler.com/ → API keys → New key. Satellite, hybrid, terrain, topo, geocoding. Restricted client key only; use a commercial plan if publishing commercially. |
| CESIUM_PUBLIC_TOKEN | https://ion.cesium.com/tokens → create new read-only token, selected Google asset 2275207, required geocoder scope, allowed URLs. Verify appropriate commercial distribution entitlement. |
| OPEN_METEO_COMMERCIAL_KEY | https://open-meteo.com/en/pricing → commercial subscription → customer API key. Server-side secret only. |
| CLIENT_CONFIG_ALLOWED_ORIGINS | HTTPS web app origin and https://localhost (Capacitor Android). |
| WEATHER_ALLOWED_ORIGINS | Same allowed origins. CORS is NOT authentication. |
| WEATHER_PUBLIC_BASE | https://YOUR-SERVER/api/weather |
| CLIENT_CONFIG_PUBLIC_URL | https://YOUR-SERVER/api/client-config |
| WEATHER_DAILY_BUDGET / WEATHER_MINUTE_BUDGET | Integer limits; size to license/usage. Start conservatively. |
| HOST / PORT | Hosting platform requirements. |

For local research/use, copy .env.example to private .env, configure approved
client keys and run `npm run build && node --env-file=.env server/index.js`.
Keep .env off Git. Do not reuse provider account passwords, MapTiler service
tokens, Cesium write tokens, Google Cloud backend secret keys, or Android
keystore credentials as client credentials.

In GitHub, go to Settings → Environments → production → Variables and set
`BACKEND_URL` to your public HTTPS backend URL (e.g. https://maps.example.com).
The signed release workflow receives just this URL; the keys are not injected
into the bundle. If hosting web with the same server, its runtime config also
works in the preview via same-origin /api/client-config.

## Security / rotation
MapTiler and Cesium official browser/mobile SDKs use public client credentials
that can be observed in requests. Runtime config removes them from UI, APK and
Git; **they cannot be made truly secret in a client that makes direct provider
requests**. Limit origins, scopes, selected assets, quotas, and monitor billing.
MapTiler: Android WebView adds User-Agent substring `ZAMAKAN-ULTRA/1.0`; configure
provider restrictions for actual app Origin / User-Agent as appropriate, test on
real hardware. Origin, user-agent and CORS are not anti-abuse authentication.
Cesium: select the minimal assets:read and required geocode scope, allowed URL(s);
check actual native WebView capability before launch. Do not use account default
token. For stronger concealment of map credentials, a provider-authorized
server-side service/proxy contract is necessary; do not proxy tiles without
permission. Google/MapTiler provider attribution remains visible.

Open-Meteo customer credential never reaches the client. Backend validates
parameters, bounds the request budget, and does not cache API responses via SW.
Use managed authentication, abuse protection, distributed quotas and billing
alerts for a public commercial deployment.

To rotate credentials, edit the owner's server variables and restart/redeploy
the server. On next app opening or Refresh, clients request /api/client-config
with no-store. No new app build is necessary; existing authenticated map
sessions may remain until refresh. Unset a provider variable and restart to
disable corresponding controls. Only endpoint and client credentials are
observable; signing keys remain GitHub production environment secrets.

## Official docs
- https://docs.maptiler.com/guides/developer/credentials/api-key/
- https://cesium.com/learn/ion/cesium-ion-access-tokens/
- https://open-meteo.com/en/terms

## Independent weather option
For keyless weather, set WEATHER_DATA_DIR to the directory of verified open
model snapshots instead of OPEN_METEO_COMMERCIAL_KEY. See [OPEN-WEATHER.md](OPEN-WEATHER.md).

### Optional owner credential verification (no deployment)
Repository Settings → Secrets and variables → Actions → New repository secret:
`MAPTILER_PUBLIC_KEY`, `CESIUM_PUBLIC_TOKEN`. Set each value once. The
`Owner provider access check` workflow verifies provider access using them
without printing them or building a bundle. It is run manually when GitHub
recognizes the workflow on the default branch; this feature branch alone does
not enable default-branch dispatch. A passing check does not deploy keys to the
app: the owner backend must separately receive these environment variables.
