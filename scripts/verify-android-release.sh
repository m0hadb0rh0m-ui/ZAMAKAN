#!/usr/bin/env bash
set -euo pipefail
apk=android/app/build/outputs/apk/release/app-release.apk
aab=android/app/build/outputs/bundle/release/app-release.aab
test -s "$apk" && test -s "$aab"
apksigner=$(find "${ANDROID_HOME:-${ANDROID_SDK_ROOT:?Android SDK unavailable}}/build-tools" -type f -name apksigner | sort -V | tail -1)
test -n "$apksigner"
"$apksigner" verify --verbose --print-certs "$apk" > "$RUNNER_TEMP/zamakan-apk-cert.txt"
jarsigner -verify "$aab" > "$RUNNER_TEMP/zamakan-aab-verify.txt"
grep -q 'jar verified' "$RUNNER_TEMP/zamakan-aab-verify.txt"
actual=$(awk -F ': ' '/Signer #1 certificate SHA-256 digest:/{print $2}' "$RUNNER_TEMP/zamakan-apk-cert.txt" | tr '[:upper:]' '[:lower:]' | tr -d ':')
expected=$(printf '%s' "${EXPECTED_UPLOAD_SHA256:?Expected certificate SHA256 required}" | tr '[:upper:]' '[:lower:]' | tr -d ': ')
[[ "$expected" =~ ^[0-9a-f]{64}$ && "$actual" == "$expected" ]]
# Check the bundle certificate against the same expected certificate.
bundle=$(keytool -printcert -jarfile "$aab" | awk -F 'SHA256: ' '/SHA256:/{print $2;exit}' | tr -d ': ' | tr '[:upper:]' '[:lower:]')
[[ "$bundle" == "$expected" ]]
sha256sum "$apk" "$aab" > release-checksums.sha256
echo "APK and AAB signatures match the expected upload certificate."
