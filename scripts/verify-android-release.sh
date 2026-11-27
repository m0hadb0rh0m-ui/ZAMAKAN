#!/usr/bin/env bash
set -euo pipefail
export LC_ALL=C
apk=android/app/build/outputs/apk/release/app-release.apk
aab=android/app/build/outputs/bundle/release/app-release.aab
fail(){ echo "Release verification failed: $*" >&2; exit 1; }
test -s "$apk" && test -s "$aab" || fail "expected APK/AAB output missing"
sdk="${ANDROID_HOME:-${ANDROID_SDK_ROOT:?Android SDK unavailable}}"
apksigner=$(find "$sdk/build-tools" -name apksigner -print | sort -V | tail -1)
test -x "$apksigner" || fail "apksigner not found"
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
"$apksigner" verify --verbose --print-certs "$apk" > "$tmp/apk.txt" || { cat "$tmp/apk.txt"; fail "APK signature invalid"; }
# JAR signatures for AAB: self-signed upload certificate is expected.
jarsigner -verify "$aab" > "$tmp/aab.txt" || { cat "$tmp/aab.txt"; fail "AAB signature invalid"; }
grep -qi 'jar verified' "$tmp/aab.txt" || { cat "$tmp/aab.txt"; fail "bundle was not verified"; }
normalize(){ tr '[:upper:]' '[:lower:]' | tr -d ':[:space:]'; }
actual=$(awk '/Signer #1 certificate SHA-256 digest:/{sub(/^.*digest:[[:space:]]*/, "");print;exit}' "$tmp/apk.txt" | normalize)
expected=$(printf '%s' "${EXPECTED_UPLOAD_SHA256:?Expected certificate SHA256 required}" | normalize)
[[ "$expected" =~ ^[0-9a-f]{64}$ ]] || fail "expected certificate fingerprint malformed"
[[ "$actual" == "$expected" ]] || fail "APK certificate mismatch (actual public fingerprint: $actual)"
# Read the actual signer certificate from the AAB, not a supplied certificate.
keytool -printcert -jarfile "$aab" -rfc > "$tmp/signer.pem" || fail "cannot read AAB certificate"
bundle=$(openssl x509 -in "$tmp/signer.pem" -noout -fingerprint -sha256 | cut -d= -f2 | normalize)
[[ "$bundle" == "$expected" ]] || fail "AAB certificate mismatch (actual public fingerprint: $bundle)"
sha256sum "$apk" "$aab" > release-checksums.sha256
echo "APK and AAB signatures match the expected upload certificate."
