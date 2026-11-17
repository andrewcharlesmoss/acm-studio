#!/bin/sh
set -eu
root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
for icon_name in arrange.reorder view.show view.hide; do
  if [ ! -f "$root/packages/acm-icons/dist/svg/$icon_name/Regular-M.svg" ]; then
    printf '%s\n' "Missing shared icon $icon_name; build the packages/acm-icons package first." >&2
    exit 1
  fi
done
swift build --package-path "$root/native/ACMReorderPreview" -c release --product ACMReorderPreview
bundle="$root/native/ACMReorderPreview/.build/ACMReorderPreview.app/Contents"
mkdir -p "$bundle/MacOS" "$bundle/Resources"
cp "$root/native/ACMReorderPreview/.build/release/ACMReorderPreview" "$bundle/MacOS/ACMReorderPreview"
cp "$root/packages/acm-icons/dist/svg/arrange.reorder/Regular-M.svg" "$bundle/Resources/reorder.svg"
for icon_name in view.show view.hide; do
  cp "$root/packages/acm-icons/dist/svg/$icon_name/Regular-M.svg" "$bundle/Resources/$icon_name.svg"
done
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
