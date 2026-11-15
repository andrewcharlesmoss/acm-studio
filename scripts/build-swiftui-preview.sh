#!/bin/sh
set -eu
root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
icon="$root/../acm-icons/dist/svg/arrange.reorder/Regular-M.svg"
if [ ! -f "$icon" ]; then
  printf '%s\n' 'Missing acm-icons reorder icon; build the sibling acm-icons package first.' >&2
  exit 1
fi
swift build --package-path "$root/native/ACMReorderPreview" -c release --product ACMReorderPreview
bundle="$root/native/ACMReorderPreview/.build/ACMReorderPreview.app/Contents"
mkdir -p "$bundle/MacOS" "$bundle/Resources"
cp "$root/native/ACMReorderPreview/.build/release/ACMReorderPreview" "$bundle/MacOS/ACMReorderPreview"
cp "$icon" "$bundle/Resources/reorder.svg"
cat > "$bundle/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleExecutable</key><string>ACMReorderPreview</string>
<key>CFBundleIdentifier</key><string>com.andrewmoss.acm-studio.reorder-preview</string>
<key>CFBundleName</key><string>SwiftUI Reordering Preview</string>
<key>CFBundlePackageType</key><string>APPL</string>
<key>NSHighResolutionCapable</key><true/>
</dict></plist>
PLIST
