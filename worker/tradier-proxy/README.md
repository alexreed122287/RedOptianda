# Tradier API Proxy

Cloudflare Worker that lets your scanner talk to the Tradier API **without ever putting your API key in the browser**. The key lives as a Cloudflare secret; the worker injects it into every upstream request.

## Why bother

| Before | After |
|---|---|
| Tradier key + account number stored in browser `localStorage` | Key lives in Cloudflare secrets, never sent to browser |
| Anyone with `view-source` access to a tab on your Mac sees your key | Browser only ever sees the worker URL |
| Key shipped in the static HTML's hardcoded fallback constants | No fallback constants needed |
| Throttle responses opaque to caller | Worker forwards `Retry-After` so the scanner's rate limiter behaves |

## One-time setup (~10 minutes)

You need a free Cloudflare account (no credit card required for Workers).

### 1. Install wrangler

```bash
npm i -g wrangler
```

### 2. Log in to Cloudflare

```bash
cd worker/tradier-proxy
npx wrangler login
```

### 3. Set your Tradier API tokens as secrets

```bash
npx wrangler secret put TRADIER_LIVE_TOKEN
# Paste your production key when prompted
```

If you have a separate sandbox key (recommended for testing):

```bash
npx wrangler secret put TRADIER_SANDBOX_TOKEN
```

If you don't set a sandbox token, the worker falls back to the live token for sandbox-mode requests.

### 3b. (Recommended for live trading) Set the LIVE_MODE_TOKEN gate

Without this gate, anyone who learns your `workers.dev` URL can pass `?mode=live` and use your live API key (the path allowlist permits `/v1/accounts/{ANY_ID}/orders`, so they could place trades against any account they discover via `/v1/user/profile`). The origin allowlist is browser-only — `curl` ignores CORS.

The gate adds a shared secret that the scanner sends as an `X-Live-Token` header on every `mode=live` request. Sandbox mode stays open (synthetic data, no real account exposure).

1. In the scanner's API tab, scroll to **TRADIER PROXY LIVE-MODE TOKEN** and click **GENERATE**. The field unmasks for 60s and the value is copied to your clipboard.
2. In your terminal:
   ```bash
   npx wrangler secret put LIVE_MODE_TOKEN
   # paste the same value when prompted
   ```
3. Click **SAVE KEYS** in the scanner so the token is persisted to `localStorage`.
4. Re-deploy the worker: `npx wrangler deploy`

From now on, any `mode=live` request without the matching header gets `403 Live mode requires X-Live-Token header`. Sandbox is unaffected.

If you skip this step, the gate is bypassed (no `LIVE_MODE_TOKEN` secret = backward compat) and the worker behaves exactly as before. Recommended once you're trading real money through the proxy.

### 4. (Optional) Update the origin allowlist

Edit `wrangler.toml`'s `ALLOWED_ORIGINS` if your scanner runs at a different URL than `https://alexreed122287.github.io`. Comma-separated.

### 5. Deploy

```bash
npx wrangler deploy
```

Output looks like:

```
Uploaded tradier-proxy (1.50 sec)
Published tradier-proxy (5.43 sec)
  https://tradier-proxy.<your-subdomain>.workers.dev
```

**Copy that URL.**

### 6. Wire the scanner to the proxy

1. Open the scanner — `https://alexreed122287.github.io/scanner/`
2. Click the **API** tab
3. Find the new field labeled **"Tradier proxy URL (optional)"**
4. Paste the workers.dev URL from step 5
5. Click **SAVE KEYS**
6. **Clear the Tradier key fields** (live + sandbox) — the proxy doesn't need them
7. Hard-refresh the scanner (`Cmd+Shift+R`)

The header should still show `OPT BP: $XXX` and your positions/scans should work — but every Tradier request now goes through the proxy.

### 7. Verify

In the browser console:

```js
fetch('YOUR_WORKER_URL/v1/markets/quotes?symbols=SPY&mode=live')
  .then(r => r.json())
  .then(console.log)
```

Should return SPY quote JSON. If you get `403 Origin not allowed`, fix the `ALLOWED_ORIGINS` in `wrangler.toml` and redeploy.

## How it works

```
Scanner browser tab
  │  fetch('https://tradier-proxy.X.workers.dev/v1/markets/quotes?symbols=SPY&mode=live')
  │  (no Authorization header)
  ▼
Cloudflare Worker (this code)
  │  1. Verify Origin in allowlist
  │  2. Verify path starts with /v1/markets/, /v1/accounts/, /v1/user/, or /v1/watchlists
  │  3. Per-IP rate limit (100/min)
  │  4. Read mode=live from query → select TRADIER_LIVE_TOKEN
  │  5. Strip ?mode= from forwarded URL
  │  6. Inject Authorization: Bearer <secret>
  ▼
api.tradier.com (or sandbox.tradier.com)
```

## What the worker does NOT do

- **It is not a public API.** Origin allowlist + path allowlist + IP rate limit make it useless to anyone who doesn't load your scanner.
- **It does not cache responses.** GETs get a 10s edge cache (matches Tradier's quote cadence); orders + errors are `no-store`. The scanner's `tradierFetch` wrapper does the meaningful caching client-side.
- **It does not transform request bodies.** Order POSTs (`class=equity&symbol=...&side=buy_to_open&...`) pass through verbatim.

## Switching back / disabling

In the API tab, clear the proxy URL and re-enter your Tradier keys directly. The scanner falls back to direct `api.tradier.com` calls automatically.

## Troubleshooting

**`403 Origin not allowed`** — Your scanner's URL isn't in `ALLOWED_ORIGINS`. Edit `wrangler.toml` and redeploy.

**`403 Path not allowed`** — Some endpoint the scanner calls isn't in the allowlist. If you see this, paste the full path (without the params) and I'll add it.

**`429 Too many requests`** — Worker's per-IP limiter (100/min) tripped. Either you or the scanner is calling too fast. The scanner's `tradierFetch` should never trip this since it's also limited to 100/min — if you see it, something is bypassing the wrapper.

**`500 TRADIER_LIVE_TOKEN secret not configured`** — Run step 3 above.

**`502 Upstream fetch failed`** — Cloudflare couldn't reach Tradier. Usually transient.
