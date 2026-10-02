#!/bin/sh
# Builds recipes-by-ninjas-preview.zip: the built site + an in-browser stand-in for /api/chat,
# so it can be viewed with `python3 -m http.server` (no Node, no deploy).
set -e
node build/build.mjs >/dev/null
T=$(mktemp -d); R="$T/recipes-by-ninjas"
cp -r dist "$R"; cp lib/picker.mjs "$R/assets/picker.mjs"; cp data/catalog.json "$R/data/catalog.json"
cp scripts/preview/preview-api.js "$R/assets/"; cp scripts/preview/START-HERE.txt "$R/"
find "$R" -name "*.html" -exec sed -i.bak 's#<script src="/assets/assistant.js" defer></script>#<script type="module" src="/assets/preview-api.js"></script><script src="/assets/assistant.js" defer></script>#' {} +
find "$R" -name "*.bak" -delete
rm -f recipes-by-ninjas-preview.zip; (cd "$T" && zip -qr - recipes-by-ninjas) > recipes-by-ninjas-preview.zip; rm -rf "$T"
echo "wrote recipes-by-ninjas-preview.zip"
