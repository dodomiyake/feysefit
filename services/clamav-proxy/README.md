# ClamAV scan proxy

Malware scanning for FeyseFit's upload path. This is a separate deployable
service — it does not run inside the Next.js app or on Vercel.

## Why a proxy instead of exposing clamd directly

`clamd`'s own wire protocol (`INSTREAM`) has **no authentication**. Anyone
who can reach the TCP port can submit files to scan or, on some builds,
issue admin commands. Exposing it straight to the internet — which a
serverless Next.js function on Vercel would need, since it can't reach a
private network by default — would hand that to anyone who finds the port.

So this image runs both processes in one container: `clamd` bound to
`127.0.0.1` only (never published), and a small dependency-free Node HTTP
server (`proxy.js`) that checks a bearer token and forwards the request
body to `clamd` over loopback. Only the proxy's HTTP port is ever exposed.

## Deploy (Fly.io)

1. Install the [Fly CLI](https://fly.io/docs/flyctl/install/) and `fly auth login`.
2. From this directory:
   ```bash
   cd services/clamav-proxy
   fly launch --no-deploy --copy-config
   ```
   Accept or rename the app (matches `fly.toml`'s `app` value), pick a region
   close to your Vercel deployment's usual edge, and skip the Postgres/Redis
   prompts — this app needs neither.
3. Create the persistent volume for virus definitions (keeps `freshclam`
   from re-downloading the full database on every deploy):
   ```bash
   fly volumes create clamav_data --size 2 --region <your-region>
   ```
4. Generate a long random token and set it as a secret — this is the value
   the main app will present as `Authorization: Bearer <token>`:
   ```bash
   fly secrets set SCAN_PROXY_TOKEN="$(openssl rand -hex 32)"
   ```
   Save this value; you'll paste it into the main app's env as
   `CLAMAV_SCAN_TOKEN` in the next step.
5. Deploy:
   ```bash
   fly deploy
   ```
   The first boot fetches virus definitions before `clamd` will accept
   connections — expect the health check to take a few minutes to go green
   on the very first deploy. Watch it with `fly logs`.

## Wire it into the FeyseFit app

In the main repo's environment (locally in `.env`, and in Vercel's
Production environment variables), set:

```
CLAMAV_SCAN_URL=https://<your-app-name>.fly.dev/scan
CLAMAV_SCAN_TOKEN=<the SCAN_PROXY_TOKEN value from step 4>
```

Leaving `CLAMAV_SCAN_URL` unset disables scanning entirely — the app skips
this layer and falls back to the existing magic-byte + re-encode checks
only (see `docs/security/malware-scanning.md` in the main repo for the
full threat model and that decision). Once both variables are set, uploads
are scanned before they're processed, and a detection fails the upload
closed.

## Operating notes

- **Cost**: `shared-cpu-1x` / 1GB is enough for on-demand image scanning at
  MVP volume. ClamAV's resident memory with definitions loaded is
  typically 200–400MB; 1GB leaves headroom. Scale the VM up if you see
  OOM kills in `fly logs`.
- **Definition updates**: `freshclam` runs once at container start. For a
  long-running instance, run `fly ssh console -C "freshclam"` periodically
  (e.g. via a scheduled Fly Machine or your own cron) to keep signatures
  current — this image does not run a background freshclam daemon.
- **Rotating the token**: `fly secrets set SCAN_PROXY_TOKEN=...` again,
  then update `CLAMAV_SCAN_TOKEN` in Vercel and redeploy the main app.
  There's a brief window where old and new deploys disagree; scanning
  fails closed during that window (uploads are rejected, not silently
  unscanned).
- **Local testing**: `docker build -t clamav-proxy . && docker run -p 8080:8080 -e SCAN_PROXY_TOKEN=dev-token-please-change clamav-proxy`, then
  `curl -X POST -H "Authorization: Bearer dev-token-please-change" --data-binary @somefile.jpg http://localhost:8080/scan`.
