# HANDOFF BRIEFING — RedOptianda OVTLYR Scanner

> Paste this entire file as the first message in a new Claude conversation, then add your specific request after it.

## What this is

OVTLYR-only scanner ("RedOptianda") for long-calls-only swing trading. Single-file vanilla-JS app at `/tmp/RedOptianda/index.html` (~26,460 lines), deployed to GitHub Pages at https://alexreed122287.github.io/RedOptianda/. Backed by:

- Cloudflare Worker for Tradier API proxying (server-side keys, X-Live-Token gate)
- Python pipeline (`industry/score_themes.py`) for nightly sector RS scoring via GH Actions cron

User: solo developer/trader. Live Tradier account `6YB72268`. Mode: `live`.

**Strategy:** long calls only, ~25-50 DTE, ~0.70 delta, swing horizon (days to weeks).

## Architecture

```
/tmp/RedOptianda/
  index.html                           # Scanner app (single file ~26.5k lines)
  worker/tradier-proxy/
    src/index.js                       # Tradier proxy — origin/path/token gates,
                                       #   115/min rate limit
    wrangler.toml                      # KV ns 168aef8dca8444cfbc96d989d09b5cca
  industry/
    score_themes.py                    # nightly RS scoring (Tradier-primary)
    master_tickers.json                # ticker-to-theme assignments
    theme_scores.json                  # daily theme composite scores
  alex_tickers.csv                     # ~2,500 ticker universe
  .github/workflows/
    score_themes.yml                   # Mon-Fri 22:00 UTC cron
    deploy-pages.yml                   # GitHub Pages deploy on push to main
```

## Deployed infrastructure

| Service | URL |
|---|---|
| Scanner | https://alexreed122287.github.io/RedOptianda/ |
| Tradier proxy | https://tradier-proxy.alexander-s-reed.workers.dev |

## What was stripped (PR #6, 2026-05-23)

Everything except the OVTLYR scanner + API tab was removed (~8,400 lines):

**REMOVED:** order ticket, positions tab, GEX/flow tab, industry tab, watchlist tab, portfolio tab, alerts tab, news tab, how-to tab, splash animation, trade-token auth, WebSocket quotes, smart exits engine, trailing stops, auto-trader, push notifications, contract panel, roll engine, closed trades matcher, P&L chart, chart modal, help/feedback modals, buy-signals tab, bottom-nav "MORE" sheet

**KEPT (two tabs only):**
- **FULL SCANNER** — OVTLYR Nine scoring, ranked results table, strategy presets, sector/theme filtering, background enrichment, auto-scan
- **API** — key management, sync, diagnostics

## Scoring: OVTLYR Nine (current, PR #3)

Score = Nine x 10 + small bonus, clamped 0-100. `isGo` requires signal=BUY (Nine >= 8) + score >= minScore.

**Market layer (3 booleans):**
- SPY Bullish Trend — EMA 10 > 20 > 50
- Market F&G Active Buy — market F&G composite 30-70 AND rising
- Market Breadth — SPY trend proxy

**Sector layer (2 booleans):**
- Sector F&G Rising > Market — sector ETF F&G rising faster than market
- Sector ETF Bullish Trend — sector ETF EMA 10 > 20

**Stock layer (4 booleans):**
- Stock Bullish Trend — EMA 10 > 20 > 50
- Stock F&G Active Buy — stock F&G > 30 AND rising
- Stock F&G Rising — period-over-period increase
- No Overhead Block — no bearish OB within 2% above price

**F&G Composite** (per-ticker, 0-100): RSI rank (0.25) + MFI rank (0.20) + Bollinger %B (0.20) + inverted HV rank (0.20) + extension rank (0.15).

**Signal classification:** BUY / WATCH / HOLD / EXIT / EXCLUDE.

**Exit signals:** 10/20 EMA bear cross, gap-and-crap (5%+ gap closing below wick), stale OB hit (120+d), extreme greed stall, earnings <4d.

**Exclusions:** Healthcare (XLV), extended >18% in 5d, price <$10, low vol (<1M), AVOID list.

**Strategy presets:** HIGH CONVICTION (90, 9/9), BUY CANDIDATES (80, 8+/9), WATCHLIST (70, 7+/9), GREEN REGIME (60, 6+/9), PRE/POST MARKET (80).

**Default GO threshold:** 80.

## Key function line numbers (commit 268ea76)

| Function | Line | Purpose |
|---|---|---|
| `scoreIt` | 12656 | OVTLYR Nine core scoring |
| `_ovtComputeFG` | 13060 | F&G composite calculation |
| `_ovtFGRising` | 13105 | F&G rising detection |
| `_ovtPctRank` | 12986 | Percentile rank helper |
| `_ovtBollPctB` | 12997 | Bollinger %B helper |
| `_ovtHvSeries` | 13012 | Historical volatility series |
| `_ovtExtensionSeries` | 13030 | Price extension series |
| `detectOrderBlocks` | 11464 | LuxAlgo SMC order block detector |
| `calcRSIatIndex` | 11793 | RSI calculation |
| `calcMFI` | 11814 | Money Flow Index |
| `calcMACD` | 11846 | MACD calculation |
| `calcADX` | 11882 | Average Directional Index |
| `calcEMA` | 11932 | Exponential Moving Average |
| `calcATR` | 11949 | Average True Range |
| `renderScan` | 15996 | Scanner results table rendering |
| `finishScan` | 14956 | Post-scan processing |
| `applyFilters` | 15480 | Filter/sort scan results |
| `setScanComplete` | 14451 | Scan completion handler |
| `STRATEGY_MODES` | 19241 | Strategy preset definitions |
| `applyStrategyMode` | 19393 | Apply a strategy preset |
| `_startBgEnrichment` | 11259 | Background enrichment engine |
| `tradierFetch` | 20922 | Tradier API wrapper |
| `init` | 22959 | App initialization |
| `switchTab` | 6885 | Tab switcher (sc + api only) |

## Recent commits (most recent first)

- `268ea76` — strip to OVTLYR-only scanner (#6)
- `59a99e4` — ci: add .nojekyll for GitHub Pages static deploy
- `7540a7e` — ci: add GitHub Pages deploy workflow
- `4a7832a` — docs: refresh all docs for OVTLYR Nine scoring system (#5)
- `acfc36c` — presets+filters: rewrite for OVTLYR scoring scale (#4)
- `e33537d` — strategy: replace 19-rule scoreIt with OVTLYR Plan M replica (#3)

## Conventions

- Single-file vanilla JS, no build step. Parse-check CI runs on push.
- No icons/Unicode glyphs in nav tabs or dashboard labels.
- User has standing approval to push and squash-merge PRs.
- Don't relax the loadHistCache 100-bar minimum.
- Don't write to op_cache_scan_results without the 5MB size check.
- Don't add fields to r.ind without considering simInd.

## Open items / next steps

| Item | Notes |
|---|---|
| Signal validation | User to provide list of known OVTLYR BUY/SELL tickers with signal start dates for calibration against scanner output |
| Deferred scoring upgrades | IV bid-ask spread gate, Yang-Zhang HV, OBV/Price divergence, Weinstein Stage 2A, MACD zero-line cross, EMA 8/21/55 swing variant |
| Backtest | vectorbt backtest of last 90 days against OVTLYR signals |

---

**Last updated:** 2026-05-23 — post-strip, OVTLYR-only scanner live, commit 268ea76, deployed to GitHub Pages.
