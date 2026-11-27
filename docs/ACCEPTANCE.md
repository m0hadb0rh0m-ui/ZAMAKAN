# Production acceptance gates
Passing CI is not equivalent to certification or hardware testing.
- Firebase: owner creates/connects project for org.zamakan.earth, sets Firebase Android config in a protected repository secret, builds signed package, installs on real Android, grants Android notification permission, tests a console test push while foreground/background and after reboot, verifies token rotation and opt-out. Record device/OS/result; never commit device tokens or service-account keys.
- Android: owner-controlled secure keystore (retain backups); protected environment production-signing; run signed-release and verify signer and SHA256 before public release.
- Windows: trusted Authenticode provider/certificate; existing signing workflow requires compatible credential. Validate Get-AuthenticodeSignature shows Valid with expected publisher, timestamp and actual physical Windows install.
- CAP: source freshness, region coverage, cancellation references and official authority links; network outage must never imply no alerts. RSS is a directory, not authentication.
- Terrain: compare against licensed surveyed geometry/elevations and disclose uncertainty.
- Independent security: commission a scoped human penetration test of authentication, isolation, CSP, data access and mobile packages; remediate and retest. CodeQL and dependency scans are complementary.
- Hardware: Android emulator and Windows runner smoke tests are not physical hardware field tests. Test Android permissions, FCM, network loss, low memory and RTL; Windows startup, GPU rendering, accessibility and signature on supported versions.
