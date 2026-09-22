#!/usr/bin/env bash
# Builds the Finder Quick Look extensions (cover as file icon, cover on the
# space bar preview) that tauri.macos.conf.json copies into the app bundle.
# Runs as the macOS `beforeBundleCommand`; does nothing on other systems.
set -euo pipefail

[ "$(uname)" = "Darwin" ] || exit 0

HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="$HERE/build"
SDK="$(xcrun --sdk macosx --show-sdk-path)"
VERSION="$(sed -n 's/^version = "\(.*\)"/\1/p' "$HERE/../Cargo.toml" | head -1)"
APP_ID="fr.nytuo.cosmiccomics"
MIN_MACOS="12.0"
# Types of the archives the extensions read. The app exports the first ones;
# the others are declared by other comic readers for the same extensions.
TYPES="$APP_ID.cbz $APP_ID.cbt cx.c3.cbz-archive cx.c3.cbt-archive"

rm -rf "$OUT"
mkdir -p "$OUT"

# build <name> <principal class> <extension point> <source> <extra attributes>
build() {
  local name="$1" principal="$2" point="$3" source="$4" attributes="$5"
  local appex="$OUT/$name.appex"
  mkdir -p "$appex/Contents/MacOS"
  for arch in arm64 x86_64; do
    xcrun swiftc -O -sdk "$SDK" -target "$arch-apple-macos$MIN_MACOS" \
      -application-extension -module-name "$name" \
      -Xlinker -e -Xlinker _NSExtensionMain \
      "$HERE/Sources/ComicArchive.swift" "$HERE/Sources/$source" \
      -o "$OUT/$name-$arch"
  done
  lipo -create "$OUT/$name-arm64" "$OUT/$name-x86_64" -output "$appex/Contents/MacOS/$name"
  rm "$OUT/$name-arm64" "$OUT/$name-x86_64"

  local types=""
  for type in $TYPES; do types="$types<string>$type</string>"; done
  cat > "$appex/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CFBundleDevelopmentRegion</key><string>en</string>
	<key>CFBundleDisplayName</key><string>Cosmic Comics</string>
	<key>CFBundleExecutable</key><string>$name</string>
	<key>CFBundleIdentifier</key><string>$APP_ID.$(echo "$name" | tr '[:upper:]' '[:lower:]')</string>
	<key>CFBundleInfoDictionaryVersion</key><string>6.0</string>
	<key>CFBundleName</key><string>$name</string>
	<key>CFBundlePackageType</key><string>XPC!</string>
	<key>CFBundleShortVersionString</key><string>$VERSION</string>
	<key>CFBundleVersion</key><string>$VERSION</string>
	<key>LSMinimumSystemVersion</key><string>$MIN_MACOS</string>
	<key>NSExtension</key>
	<dict>
		<key>NSExtensionAttributes</key>
		<dict>
			<key>QLSupportedContentTypes</key><array>$types</array>
			$attributes
		</dict>
		<key>NSExtensionPointIdentifier</key><string>$point</string>
		<key>NSExtensionPrincipalClass</key><string>$principal</string>
	</dict>
</dict>
</plist>
PLIST

  codesign --force --options runtime --timestamp=none \
    --entitlements "$HERE/QuickLook.entitlements" \
    --sign "${APPLE_SIGNING_IDENTITY:--}" "$appex"
}

build CosmicComicsThumbnail ThumbnailProvider com.apple.quicklook.thumbnail \
  ThumbnailProvider.swift '<key>QLThumbnailMinimumDimension</key><integer>0</integer>'
build CosmicComicsPreview PreviewProvider com.apple.quicklook.preview \
  PreviewProvider.swift '<key>QLIsDataBasedPreview</key><true/><key>QLSupportsSearchableItems</key><false/>'

echo "Quick Look extensions built in $OUT"
