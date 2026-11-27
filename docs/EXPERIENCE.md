# ZAMAKAN Experience implementation

This increment implements sections 23–25 of the engineering specification in the actual map application, preserving its geographic sources and provider restrictions.

- Four customer destinations: Explore, Observe, Saved and Account. Account contains settings, not vendor credentials.
- No customer input for MapTiler or Cesium tokens. Commercial imagery and photorealistic tiles appear only when public restricted deployment credentials are configured. The free NASA MODIS dated imagery remains available through Layers.
- Easy mode defaults to three map actions; professional mode reveals more tools. Adaptive layout, compact source freshness chip, quiet transient notices, local time, and source details.
- Six searchable settings groups with persisted preferences, local saved places, share link, RTL/LTR and power-saving display.
- PRIME card communicates intended functionality but does not charge or grant unimplemented entitlements.

## Verification
Run `npm test` and `npm run build`; live browser validation must verify real tiles, source failures, overlay controls, saved places and responsive navigation.

## Not implemented by this increment
A production entitlement/billing backend and Google Play account; cloud ingestion and OSM replication for global building changes; satellite orbit propagation, aviation and marine tracking; licensed commercial imagery/DEM/photorealistic entitlement; cloud watch zones, push notifications, imagery change detection and licensed offline packs. None of these features should be marketed as active until they are integrated, licensed and tested. OpenFreeMap freshness depends on the provider's published basemap. Commercial weather requires the licensed gateway. The display retrieval timestamp is not the observation timestamp.
