#!/usr/bin/env bash
# Downloads the DataTourisme flux into dt-feed/, tolerating both delivery
# shapes: a zip archive of JSON-LD files, or a single plain JSON-LD document.
# Never fails the job — on any problem it prints a diagnosis, removes
# dt-feed/ and exits 0 so the agenda script falls back cleanly.
set -u

if [ -z "${DT_URL:-}" ]; then
  echo "DATATOURISME_WEBSERVICE_URL not set — skipping DataTourisme."
  exit 0
fi

case "$DT_URL" in
  *"{app_key}"*)
    echo "::warning::DATATOURISME_WEBSERVICE_URL still contains the literal {app_key} placeholder."
    echo "Replace {app_key} with the API key of your Application"
    echo "(diffuseur.datatourisme.fr -> Applications -> your app)."
    exit 0
    ;;
esac

echo "Downloading DataTourisme flux…"
status=$(curl -sSL --max-time 300 -w '%{http_code}' -o feed.bin "$DT_URL" || echo 000)
size=$(stat -c%s feed.bin 2>/dev/null || echo 0)
echo "HTTP $status — $size bytes"

if [ "$status" != "200" ]; then
  echo "Download failed. Server response (truncated):"
  head -c 400 feed.bin 2>/dev/null | tr -d '\0'
  echo
  echo "Common causes: wrong API key in the URL, or the flux has not finished"
  echo "its daily generation yet (this flux generates around 22:00 French time)."
  rm -rf dt-feed feed.bin
  exit 0
fi

mkdir -p dt-feed
if unzip -q -o feed.bin -d dt-feed 2>/dev/null; then
  echo "Zip flux unpacked: $(find dt-feed -name '*.json' | wc -l) JSON files."
elif head -c 64 feed.bin | grep -q '[{[]'; then
  cp feed.bin dt-feed/feed.json
  echo "Plain JSON-LD flux saved as dt-feed/feed.json."
else
  echo "Response is neither a zip nor JSON. First bytes (truncated):"
  head -c 400 feed.bin | tr -d '\0'
  echo
  rm -rf dt-feed
fi
rm -f feed.bin
