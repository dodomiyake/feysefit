FROM clamav/clamav:1.4-stable

# clamd is already installed by the base image. Add a minimal Node.js
# runtime just for the authenticated HTTP proxy — no npm dependencies.
RUN apk add --no-cache nodejs

WORKDIR /app
COPY proxy.js entrypoint.sh ./
RUN chmod +x entrypoint.sh

# Only the proxy's HTTP port is published. clamd's own port (3310) is
# never exposed — the proxy is the only way in. See README.md.
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=90s \
  CMD wget -q -O- http://127.0.0.1:8080/health || exit 1

ENTRYPOINT ["./entrypoint.sh"]
