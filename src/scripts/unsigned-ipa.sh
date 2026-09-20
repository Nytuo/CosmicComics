#!/usr/bin/env bash
# Repackages the app inside an .xcarchive as an unsigned IPA for sideloading
# (AltStore, Sideloadly, TrollStore ...). Those tools sign the app again with
# the user's own certificate, so the archive's signature and provisioning
# profile, which are tied to our team, are stripped.
#
# Usage: unsigned-ipa.sh <path/to/app.xcarchive> <output.ipa>
set -euo pipefail

[ $# -eq 2 ] || { echo "usage: $0 <app.xcarchive> <output.ipa>" >&2; exit 2; }
ARCHIVE="$1"
OUT="$(cd "$(dirname "$2")" && pwd)/$(basename "$2")"

APP=$(find "$ARCHIVE/Products/Applications" -maxdepth 1 -name '*.app' | head -n1)
[ -n "$APP" ] || { echo "no .app found in $ARCHIVE" >&2; exit 1; }

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT
mkdir "$WORK/Payload"
ditto "$APP" "$WORK/Payload/$(basename "$APP")"
BUNDLE="$WORK/Payload/$(basename "$APP")"

rm -rf "$BUNDLE/_CodeSignature" "$BUNDLE/embedded.mobileprovision"

# Nested code (frameworks, dylibs, extensions) carries its own signature.
while IFS= read -r -d '' item; do
  codesign --remove-signature "$item" 2>/dev/null || true
done < <(find "$BUNDLE" \( -name '*.framework' -o -name '*.dylib' -o -name '*.appex' \) -print0)
codesign --remove-signature "$BUNDLE"

# codesign -d exits non-zero for an unsigned bundle, hence the capture.
STATE=$(codesign -d "$BUNDLE" 2>&1 || true)
case "$STATE" in
  *"not signed at all"*) ;;
  *) echo "app is still signed after stripping: $STATE" >&2; exit 1 ;;
esac

rm -f "$OUT"
(cd "$WORK" && zip -qry "$OUT" Payload)
echo "wrote $OUT ($(du -h "$OUT" | cut -f1))"
