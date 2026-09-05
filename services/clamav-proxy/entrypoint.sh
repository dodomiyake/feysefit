#!/bin/sh
set -e

CONF=/etc/clamav/clamd.conf

# clamd binds to loopback only — this container's proxy is the only client,
# and it always connects via 127.0.0.1. clamd's own port is never published
# by the Dockerfile or fly.toml.
if grep -q '^TCPSocket ' "$CONF" 2>/dev/null; then
  sed -i 's/^TCPSocket .*/TCPSocket 3310/' "$CONF"
else
  echo 'TCPSocket 3310' >> "$CONF"
fi
if grep -q '^TCPAddr ' "$CONF" 2>/dev/null; then
  sed -i 's/^TCPAddr .*/TCPAddr 127.0.0.1/' "$CONF"
else
  echo 'TCPAddr 127.0.0.1' >> "$CONF"
fi
# Keep in sync with proxy.js's MAX_BODY_BYTES default.
if grep -q '^StreamMaxLength ' "$CONF" 2>/dev/null; then
  sed -i 's/^StreamMaxLength .*/StreamMaxLength 30M/' "$CONF"
else
  echo 'StreamMaxLength 30M' >> "$CONF"
fi

echo "Fetching virus definitions (first boot can take a few minutes; mount a"
echo "persistent volume at /var/lib/clamav so this is fast on later deploys)..."
freshclam --quiet || echo "freshclam did not complete; clamd will retry on its own schedule"

echo "Starting clamd..."
clamd &

echo "Waiting for clamd to accept connections on 127.0.0.1:3310..."
node -e '
const net = require("node:net");
const deadline = Date.now() + 180000;
function tryConnect() {
  const s = net.createConnection({ host: "127.0.0.1", port: 3310 }, () => {
    s.end();
    process.exit(0);
  });
  s.on("error", () => {
    if (Date.now() > deadline) {
      console.error("clamd did not become ready in time");
      process.exit(1);
    }
    setTimeout(tryConnect, 2000);
  });
}
tryConnect();
'

echo "Starting scan proxy..."
exec node /app/proxy.js
