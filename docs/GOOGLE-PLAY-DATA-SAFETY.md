# Google Play submission: Data safety worksheet (review prior to submission)
This is a review worksheet, not a submitted or certified declaration. Assess actual signed AAB, network behavior, SDK versions, and production configurations before completing Play Console.
| Data category | Current behavior | Review before declaring |
|---|---|---|
| Approximate & precise location | Optional GPS and manually selected locations; location-dependent API requests transmit coordinates to Open-Meteo and mapping providers. | Declare collection/sharing as required by actual provider processing terms; purpose app functionality, optional GPS, no background location. |
| Search terms & map interactions | Requests to geocoding, map tile and other data providers can reveal location/search and IP. | Inspect actual data retention and sharing conditions. |
| User IDs/account | Hosted ChatGPT identity, optional self-hosted username and password hash; Android guest when backend unavailable. | Verify packaged Android account availability; declare actual identity data. |
| Favorites & preferences | Stored locally; explicit cloud sync stores named coordinates, preferences, account ID and timestamps. | Optional functionality; authenticated deletion implemented; verify site hosting logs and backups. |
| Device or other IDs | FCM registration/installation identifiers if FCM enabled and opted in. | Review Firebase SDK disclosures for actual AAB; no analytics SDK configured. |
| Diagnostics | Standard hosting/network logs possible. | Confirm host/provider retention and actual diagnostic SDK behavior. |
| User files | Local processing, no automatic upload. | Check any export/import changes. |
No ad monetization or advertising SDK currently configured. HTTPS for remote providers; account deletion requires authenticated user/confirmed request. Do not claim no collection without signed bundle and traffic review.
Privacy URL: https://zamakan-observatory.racingdot32.chatgpt.site/privacy.html (must verify deployed and publicly accessible). Add private publisher contact before submission. Data deletion URL: https://zamakan-observatory.racingdot32.chatgpt.site/privacy.html#delete. Hosted deletion removes ZAMAKAN cloud state only; external ChatGPT account remains. Self-hosted deletion revokes sessions and removes associated saved state.
