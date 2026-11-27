# ZAMAKAN 0.5.0 — Scientific reliability
- CAP: strict ordered structural/semantic checks, conditional scope, numeric-offset CAP times, reference triples with earlier timestamps, local inbox deduplication and supersession. Imported XML remains untrusted; no signature chain verification, no cross-sender invalidation, no delivery or official certification. Unknown reference remains unresolved and can be reimported after the referenced item. CAP and FFT modules are independent. IPAWS public checks cover core status/scope/code, info expiry, consistent category/event codes; they are not full channel-specific IPAWS certification. See [CAP 1.2](https://docs.oasis-open.org/emergency/cap/v1.2/CAP-v1.2.html) and [IPAWS profile](https://docs.oasis-open.org/emergency/cap/v1.2/ipaws-profile/v1.0/cap-v1.2-ipaws-profile-v1.0.html).
- DSP: deterministic, reproducibly generated 238-byte WASM radix-2 stage; Float64, transfer ownership of input and packed output in an independent Web Worker, fallback JS; windowed FFT/PSD. Rebuild with `python scripts/build_fft_wasm.py`. Local warm median example (7 repetitions after 2 warm-ups, Node 24): 8192 samples JS 2.10 ms / WASM 1.31 ms; 65536 JS 22.05 ms / WASM 15.96 ms. Not a universal speed ratio or browser/device guarantee.
- Flags: `ZAMAKAN_FLAGS_JSON` accepts known boolean flags or simple GrowthBook exported `{"features":{"newRadar":{"defaultValue":false,"rules":[]}}}`. Optionally supply the SDK connection key in `ZAMAKAN_GROWTHBOOK_CLIENT_KEY` to pull simple public booleans server-side, cached for 60 seconds with last-known-value fallback. No user attributes or experiment evaluation. No account or key provisioned. Flags gate functionality, not authorization. `capStrict=false` disables CAP instead of re-enabling unsafe parsing. Static builds use bundled defaults; restart server to apply environment updates, then reload browser.
- OpenAPI 3.1 contract at `/openapi.json`; black-box schema checks in CI for flags, status, auth, health, AI disabled response and account lifecycle in staging. Tests do not cover enabled Ollama service.
- Public `/status` and `/api/status` server probes include latency, source time (when available), age and state. A fixed shared 60-second cache with in-flight dedup avoids per-user upstream queries. Probe checks are sampled availability, not proof of every record or tile. GDACS RSS checks reachability and available build timestamp; no timestamp is invented. No raw upstream response or user coordinates exposed by the monitor. Live probe report requires external network.
- Data lineage shows source, UTC time, retrieval time, field, type, status and transformation for current and hourly weather, air and marine values. Other modules retain their source/record/time labels; an exhaustive persistent lineage graph for every pixel or calculated output is not included.
- Staging: deterministic mock monitor only on loopback, browser feed fixtures, distinct manual live-probe Actions job. This is a CI staging harness, not an independently hosted staging environment. No real service keys or paid services.

Local commands:
```sh
npm ci
npm test
npm run build
ZAMAKAN_SOURCE_MODE=mock ZAMAKAN_AUTH_DB=/tmp/zamakan-test.sqlite npm run serve
# in another terminal with Python jsonschema and Playwright:
python tests/api_contract.py
python tests/browser_smoke.py
# distinct live availability report (requires upstream network)
node scripts/live-probe.js
```
