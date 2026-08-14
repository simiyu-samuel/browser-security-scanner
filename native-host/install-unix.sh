#!/usr/bin/env sh
set -eu

EXTENSION_ID="${1:?usage: install-unix.sh EXTENSION_ID BROWSER}">
BROWSER="${2:?usage: install-unix.sh EXTENSION_ID BROWSER(chrome|edge|chromium)}"
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
HOST_DIR="${SENTINEL_HOST_DIR:-/opt/sentinel/native-host}"

case "$BROWSER" in
  chrome) TARGET_DIR="/etc/opt/chrome/native-messaging-hosts" ;;
  edge) TARGET_DIR="/etc/opt/edge/native-messaging-hosts" ;;
  chromium) TARGET_DIR="/etc/chromium/native-messaging-hosts" ;;
  *) echo "Unsupported browser: $BROWSER" >&2; exit 2 ;;
esac

sudo install -d "$HOST_DIR" "$TARGET_DIR"
sudo install -m 0755 "$SCRIPT_DIR/host.py" "$HOST_DIR/host.py"
sudo install -m 0755 "$SCRIPT_DIR/launcher" "$HOST_DIR/launcher"
sed -e "s#^  \"path\":.*#  \"path\": \"$HOST_DIR/launcher\",#" \
    -e "s/REPLACE_WITH_MANAGED_EXTENSION_ID/$EXTENSION_ID/" \
    "$SCRIPT_DIR/com.sentinel.local_auditor.json.template" | sudo tee "$TARGET_DIR/com.sentinel.local_auditor.json" >/dev/null
echo "Registered SENTINEL native host for $BROWSER"
