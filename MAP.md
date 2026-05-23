# MAP.md — Where to look when something breaks

This is an index for the scanner codebase. The whole runtime app lives in
[`index.html`](index.html) (~34,800 lines, multiple `<script>` blocks). When a
feature breaks, find it in the **subsystem table** below, jump to the line
range, and read down. When you know the function name but not where it
lives, use the **function index** at the bottom.

This file is hand-maintained. If you add a new top-level function or
section, update both tables — `tools/audit/extract-sections.js` doesn't
regenerate this file because some hand-written context (the "if X breaks,
look here" pointers, the section descriptions) has no autogen source.

---

## Architecture in one paragraph

The scanner is a single-page vanilla-JS app served as a static
`index.html`. All Tradier API calls go through a Cloudflare Worker proxy
(`worker/tradier-proxy/`) that injects the API key server-side. A nightly
GH Actions cron (`industry/score_themes.py`) generates
`industry/theme_scores.json` for sector relative-strength data. There is
no build step — `index.html` is the source of truth and what GH Pages
serves.

Global state lives on a single object `G` (declared around line 3845).
Persistent state lives in `localStorage` under `rrjcar_*` keys. A
session-only trade token lives at `window._tradeToken` (never persisted).

---

## Subsystem map

Lookup pattern: find the symptom in the **owns** column, jump to the line
range, read top-to-bottom. The two main script blocks run lines 6055-20490
and 20492-34817.

| Subsystem | Lines | Owns |
|---|---|---|
| **Boot & API Counter** | 2427-2626 | Fetch monkey-patch, request counter, X-Live-Token + X-Trade-Token header injection |
| **Tradier auth** | 2628-2648 | `_getTradierKey`, proxy-aware key lookup |
| **Trade token** | 2650-2748 | `promptTradeToken`, modal, badge, `_ensureTradeToken` |
| **FMP queue / cache** | 3070-3860 | FMP rate-limited request queue, per-ticker FMP cache helpers |
| **Global state `G`** | 3845-3870 | `G = { results, filtered, gexData, ... }` declaration |
| **Utils** | 3869-3897 | `eid`, `_esc`, `fmt2`, `fmtP`, `fmtD`, `fmtK`, `clamp`, `toast` |
| **Sector multi-select** | 3898-4047 | Multi-sector filter dropdown, sector counts, label |
| **Sector exclusion** | 4049-4115 | Hard-filter entire sectors from scan results |
| **Mobile filter bar** | 4118-4150 | `toggleMobileFilters` collapse/expand |
| **Tab switcher** | 4155-4243 | `switchTab`, deep-link preservation |
| **ASR (auto-select)** | 4274-4502 | Auto-pick best contract by GEX score, expiration calendar |
| **Quote panel** | 4562-4776 | Live quote fetch, AH detection, render |
| **Step-fill engine** | 4783-4937 | Limit-at-each-step fill, slow market-fill fallback |
| **Order ticket** | 5074-5487 | `previewOrder`, `submitOrder`, OCC symbol builder, qty calc |
| **Order ticket UI** | 5489-6041 | Stock vs option mode, trailing stop UI wiring |
| **Equity trailing stop** | 5601-5847 | Poll Tradier price, trail stop server-side |
| **Smart Exits config** | 6043-6164 | ATR / EMA / HV math, config persist |
| **Smart Exits engine** | 6377-6505 | Poller, status render, intraday emergency + EOD logic |
| **Order block detector** | 6522-6892 | LuxAlgo SMC bearish OB + institutional OB, distance math |
| **Indicator math** | 6896-6947 | RSI, RSI accel, MFI, CMO |
| **FMP cache** | 6948-7019 | per-ticker FMP analyst data cache |
| **Performance analytics** | 7050-7261 | Kelly, per-rule win rate, IV/HV buckets, render |
| **Closed-trade enrichment** | 7278-7325 | `_captureEntrySnapshot` writes to `G.posOpenData` |
| **Theme overlay (daily)** | 7367-7444 | Loads `theme_scores.json`, applies to scoring |
| **Theme overlay (intraday)** | 7467-7625 | `_ensureIntradayThemeRS`, top-themes leaderboard strip |
| **Earnings calendar** | 7629-7733 | FMP bulk fetch, per-ticker DTE lookup |
| **Result rank comparator** | 7735-7787 | Multi-key tiebreaker for `G.results.sort()` |
| **`scoreIt` scoring** | 16352-16810 | OVTLYR Nine scoring — 9 booleans across Market (3) / Sector (2) / Stock (4) layers, F&G composite, exit signals, exclusions. Score = Nine × 10 + bonus, 0–100. Helpers: `_ovtComputeFG`, `_ovtFGRising`, `_ovtBollPctB`, `_ovtHvSeries`, `_ovtExtensionSeries`, `_ovtPctRank` |
| **TradingView embed** | 7996-8011 | (declined; render is no-op) |
| **Detail pane** | 8013-8420 | Per-ticker detail render, options chain table |
| **Push notifications** | 8480-8520 | Browser Notifications API |
| **Quick-buy / watchlist add** | 8521-8576 | Single-click market BUY for shares |
| **Theme toggle** | 8579-8642 | Light/dark mode |
| **renderBuySig** | 8640-8772 | Renders the BUY SIGNALS list (sticky tab) |
| **Custom tickers** | 8773-8819 | User-defined ticker overlay |
| **Scan progress** | 8820-8853 | Header pill + progress bar |
| **Auto-scan engine** | 8854-8965 | 15-min auto-rescan timer |
| **Scan dispatcher** | 8966-9356 | `setScanComplete`, FMP queue dispatch, indicator queue dispatch |
| **`finishScan`** | 9359-9742 | Final filter / sort / render after enrichment drains |
| **Filters** | 9743-9905 | `getIndFilter`, `applyFilters`, indicator-pass filtering |
| **Scan settings** | 9907-9990 | `saveScanSettings` / `loadScanSettings` / `resetScanSettings` (rrjcar_scan_settings_v2) |
| **OB filter** | 9991-10034 | Toggle OB-clear + instrument-OB filters |
| **Export GO** | 10035-10166 | Copy GO tickers as CSV |
| **Sentiment panel** | 10168-10353 | Adanos F&G iframe, regime badge, sparkline |
| **`renderScan`** | 10377-10538 | Renders the FULL SCANNER table |
| **GEX cache** | 10540-10588 | `loadGexCache`, `saveGexCache`, freshness check |
| **GEX auto-schedule** | 10590-10670 | Fire `runGex` at 9:35 / 12:00 / 15:00 ET |
| **`runGex`** | 10671-10918 | Pulls option chains, computes GEX magnitude, gamma flip strike |
| **Watchlist** | 10920-11050 | Add / remove / render WL tickers; copy / clear |
| **Watchlist chart panel** | 11053-11239 | Candle chart + EMA 10/20/50 + S/R for selected WL ticker |
| **Position parsing** | 11240-11250 | `parseOccSymbol` — OCC option symbol → underlying / strike / exp |
| **Positions tab** | 11252-11772 | Fetch positions from Tradier, render table, P&L per row |
| **Cumulative P&L stats** | 11774-11848 | Header stats: total P&L, day P&L, count |
| **Trailing stop engine** | 11850-12112 | Per-position trailing stop, poll, execute close |
| **P&L chart** | 12114-12451 | Position P&L payoff curve, breakeven, hover tooltip |
| **Position close** | 12453-12602 | `clearPositions`, `buyOrder`, `closePosition` |
| **Balances** | 12604-12646 | Fetch balances + cash from Tradier |
| **Roll engine** | 12648-13341 | Modal for rolling option to a new strike/expiry |
| **Midnight refresh** | 13347-13363 | Cron-style daily reset |
| **Closed trade matcher** | 13364-13772 | Match buy/sell pairs from Tradier order history → closed trades |
| **Closed-trade chart** | 13778-13828 | Per-trade P&L curve at close |
| **Notifications config** | 13830-13947 | Cooldown persistence, EmailJS settings, browser permission |
| **High-conviction alerts** | 13948-14199 | Browser notif + email + auto-fill modal flow |
| **Auto-trader** | 14200-14623 | (Disabled per user) auto-execute on high-conviction signals |
| **Strategy modes** | 26595-26825 | OVTLYR-aligned presets: HIGH CONVICTION (Nine 9/9) / BUY CANDIDATES (8+/9) / WATCHLIST (7+/9) / GREEN REGIME (6+/9) / PRE/POST MARKET |
| **API tab** | 14680-15104 | Save/test/clear keys, FMP cache clear, live-mode token UI |
| **Header clock + quotes** | 15105-15208 | SPY/QQQ live ticker in header |
| **App settings** | 15210-15321 | App-level settings persistence |
| **Version banner** | 15323-15349 | One-time post-deploy "UPDATED" banner |
| **Contract panel** | 15351-15596 | All-calls-through-365d table for a single ticker, sorted by GEX score |
| **Contract watchlist** | 15598-15831 | Per-contract watchlist (separate from ticker WL) |
| **Tradier fetch wrapper** | 15833-15976 | `tradierFetch` with TTL cache + global rate limiter |
| **Bounded localStorage** | 15978-16071 | Per-ticker cache eviction, stale banner |
| **Portfolio builder** | 16073-17807 | Multi-column portfolio (paste/CSV/Tradier auto-pull), charts, recompute |
| **`init`** | 17811-17978 | Bootstrap on DOMContentLoaded — wires every UI element, restores state |
| **Industry strength tab** | 17980-18404 | Renders `theme_scores.json` as a sortable theme leaderboard |

---

## "If X breaks, look here"

Symptom-driven cheat sheet. Use this when you see a bug but don't know
the function name. Each entry points to the line range and the function
that owns the rendering / behavior.

| Symptom | Look at |
|---|---|
| "GO/NO-GO classification is wrong" | `scoreIt` (line 16352). OVTLYR Nine layer checks, F&G composite, exit signals, and exclusions are all here. |
| "Sort order is weird, similar tickers in weird order" | `_resultRankCompare` (line 7735). Multi-key tiebreaker. |
| "Strong Sector lights up but daily theme says weak" | `_ensureIntradayThemeRS` (line 7467) + `getThemeStrengthLive` (line 7593). Combined daily + intraday RS. |
| "Theme leaderboard strip empty / wrong" | `renderTopThemesStrip` (line 7535). Filters by member count >=3. |
| "Earnings filter not catching X" | `getDaysToEarnings` (line 7707) + `G_EARNINGS_CACHE` at line 7584. |
| "Scan stalls at 199/200 forever" | Watchdog logic in indicator queue around line 9605. There's a comment from a prior fix. |
| "Auto-scan didn't fire" | `autoScanTick` (line 8896) — checks market hours + `isMarketHours`. |
| "GEX didn't auto-fire at 9:35" | `_gexScheduleTick` (line 10630) — F-1 fix to range debounce is here. |
| "GEX Call% number looks wrong" | `runGex` line ~10744 — `callPctOI * 0.6 + callPctVol * 0.4` blend. |
| "Position DTE shows --" | `renderPositionsTable` (line 11502). A-1 fix (regex `\d{2}` not `d{2}`) lives in the consolidated DIT/DTE block ~11505. |
| "Trailing stop didn't trigger" | `executeTsClose` (line 12049) + `startTsPoller` (line 11878). |
| "Smart Exit fired at wrong price" | `startSmartExitsPoller` (line 6377) → uses `computeATR` (6093), `computeEMA` (6147). |
| "Closed trade missing entry rules / IV / HV" | `_captureEntrySnapshot` (line 7278) writes; `matchTrades` (line 13372) reads. localStorage key: `rrjcar_pos_open`. |
| "Roll modal shows wrong chain" | `rollLoadChain` (line 12843) + `rollFetchBest` (line 13102). |
| "Portfolio cash not showing" | `pfAutoPullTradier` (line 16887). F-7 wraps positions in sentinel-catch so cash still renders if positions error. |
| "Portfolio paste lost a row" | `pfParseLine` (line 17404), `pfParseBlock` (line 17536), `pfNormalizeDate` (line 17631). |
| "Industry tab shows 'No data yet'" | `renderIndustryTab` (line 17992). Fetches `industry/theme_scores.json`. |
| "High-conviction modal won't dismiss" | `hcModalSubmit` / `hcModalCancel` / `hcModalSkip` (line 14096+). |
| "Alert spam on page reload" | `G_NOTIF_COOLDOWNS` at line 13831 — F-2 added localStorage persistence with 24h TTL. |
| "Email alert never sends" | `sendEmailJsAlert` (line 13993) — needs EmailJS keys configured in API tab. |
| "TRADE badge stuck on locked" | `promptTradeToken` (line 2689). Token lives at `window._tradeToken`, memory-only. |
| "Auth error: X-Live-Token" | Worker side: `worker/tradier-proxy/src/index.js:147`. Client side: `_getTradierKey` (line 2642), fetch monkey-patch line 2552. |
| "Sandbox vs live mode toggling weirdly" | `getTradierCreds` (line 4244) + URL `?mode=` query. Worker default is sandbox. |
| "API call counter at 0 despite scan running" | Fetch monkey-patch at line 2552 — only counts when `endpointLabel` returns truthy. |
| "Theme overlay shows zero / stale" | `_loadThemeOverlayFromStorage` (line 7367), `loadThemeOverlay` in `init`. Source: `industry/theme_scores.json`. |

---

## Persistence / state map

When state is wrong on reload, check both the in-memory `G` and the
localStorage key.

| In-memory | localStorage key | Owns |
|---|---|---|
| `G.results`, `G.filtered` | (none — recomputed) | Scan results |
| `G.gexData` | `rrjcar_gex_cache_v1` | Last GEX run |
| `G.gexAutoSchedule` | `rrjcar_gex_schedule_v1` | "off" / "open" / "3x" |
| `G.wlTickers` | `rrjcar_wl` | Watchlist tickers |
| `G.positions` | (none — pulled fresh) | Tradier positions |
| `G.posOpenData` | `rrjcar_pos_open` | Entry-snapshot for closed-trade enrichment |
| `G.tsConfig`, `G.tsState`, `G.tsTriggered` | `rrjcar_ts_config`, `rrjcar_ts_state` | Trailing-stop config + state |
| `G.alerts` | (in-memory only) | Recent alerts (max ~50) |
| `G.equityTrail` | `rrjcar_eq_trail` | Equity-side trailing stop |
| `G.selectedSectors` | `rrjcar_sel_sectors` | Sector multi-select |
| `G.detailOpt` | (in-memory only) | Currently-open detail pane |
| `G_EARNINGS_CACHE` | `rrjcar_earnings_v2` | Earnings calendar |
| `G_NOTIF_COOLDOWNS` | `rrjcar_notif_cooldowns_v1` | High-conviction alert cooldowns (F-2) |
| `G_THEME_OVERLAY` | `rrjcar_theme_overlay_v1` | Daily theme RS scores |
| (closed trades) | `rrjcar_closed_trades` | Performance analytics input |
| (FMP cache) | `rrjcar_fmp_<ticker>` | Per-ticker FMP analyst data |
| (scan settings) | `rrjcar_scan_settings_v2` | F-6 schema bump |
| (smart exits) | `rrjcar_smart_exits_v1` | Smart Exits config |
| (auto-scan) | `rrjcar_auto_scan` | Auto-scan settings |
| (notif settings) | `rrjcar_notif_settings_v1` | Browser/email notif prefs |
| (app settings) | `rrjcar_app_settings_v1` | App-level prefs |
| `window._tradeToken` | **NEVER PERSISTED** — memory only, re-prompted per session | Trade-token gate for orders |
| `window._liveTokenCache` | (cached from `rrjcar_tradier_proxy_live_token`) | Live mode token |

---

## Workflow recipes

**"Modify OVTLYR scoring"** — edit `scoreIt` (line 16352). The Nine
booleans are in the `mkt*`, `sec*`, `stk*` variables. F&G composite
helpers start at `_ovtPctRank` (16682). Exit signals and exclusions are
inline. If adding a new filter checkbox, register it in
`SCAN_FILTER_CHECKBOXES` (line 19853) and `getIndFilter` (line 19618).

**"Add a new tab"** — add the tab button in HTML, add the panel div, then
register the tab id in `switchTab` (line 4155). If the tab needs
data-loading on activation, add the loader call inside `switchTab`'s
switch.

**"Add a new persisted setting"** — pick a localStorage key with the
`rrjcar_*_v<n>` convention. Write a save / load pair near the existing
ones at the end of the relevant subsystem. Hook the load into `init`
(line 17811). If the schema can ever change, version the key.

**"Change something the cron writes to `theme_scores.json`"** — edit
`industry/score_themes.py`. Run `python3 -m pytest industry/test_theme_scores.py`
to confirm the smoke test still passes against the new shape, OR update
the test if the shape itself is intentionally changing. The cron will
run the test as a hard gate before commit.

**"Tighten the worker's path allowlist"** — edit
`worker/tradier-proxy/src/index.js` (`ALLOWED_PATH_PREFIXES`,
`ALLOWED_EXACT_PATHS`). Run `bash tools/audit/fuzz-tradier-proxy.sh`
locally before deploying. Then `cd worker/tradier-proxy && npx wrangler
deploy`. Re-run the fuzz to confirm the gate behaves as intended.

---

## Function index (alphabetical)

When you know the function name and want the line, search this table.
Generated from `index.html`; regenerate with:

```bash
python3 -c "
import re
lines = open('index.html').read().split('\n')
fns = []
in_script = False
for i, ln in enumerate(lines):
    if '<script>' in ln: in_script = True
    if '</script>' in ln: in_script = False
    if not in_script: continue
    m = re.match(r'^function\s+([A-Za-z_\$][\w\$]*)\s*\(', ln)
    if m: fns.append((m.group(1), i+1))
for name, ln in sorted(fns, key=lambda x: x[0].lower()):
    print(f'| \`{name}\` | {ln} |')
"
```

| Function | Line |
|---|---|
| `_apiTestAppend` | 26964 |
| `_apiTestReset` | 26971 |
| `_applyAutoStepDelay` | 10628 |
| `_assertOrderInvariants` | 11519 |
| `_assertScanRuleNames` | 8161 |
| `_b64decode` | 6909 |
| `_b64encode` | 6903 |
| `_chartModalDrawCandles` | 21986 |
| `_chartModalRender` | 21916 |
| `_chartModalUpdateTfButtons` | 21910 |
| `_chgColLabel` | 26652 |
| `_clearTradeToken` | 6423 |
| `_computeIntradayThemeRanked` | 31541 |
| `_countTierPasses` | 14085 |
| `_currentETSession` | 26631 |
| `_dbg` | 8206 |
| `_doSpreadSubmit` | 10476 |
| `_drainTradierQueue` | 28608 |
| `_ensureIntradayThemeRS` | 15962 |
| `_esc` | 7998 |
| `_etDateKey` | 8140 |
| `_etDayOfWeek` | 8147 |
| `_etMinuteOfDay` | 20745 |
| `_etOffsetHoursAt` | 8023 |
| `_exportSheetCopy` | 30759 |
| `_exportSheetOpenTab` | 30784 |
| `_fmpMarkQuotaExhausted` | 7124 |
| `_fmpProcessQueue` | 7133 |
| `_fmtCstClock` | 20704 |
| `_fmtCT_Date` | 8055 |
| `_fmtCT_NowTime` | 8083 |
| `_fmtCT_Time` | 8065 |
| `_fmtCT_TimeSec` | 8074 |
| `_freeLocalStorageSpace` | 13978 |
| `_getManualBp` | 24267 |
| `_getTradierKey` | 6286 |
| `_gexFreshWithin` | 20537 |
| `_gexNextFireDescription` | 20667 |
| `_gexScheduleTick` | 20760 |
| `_intradayDetachFromTicket` | 9732 |
| `_intradayDetectSignal` | 9640 |
| `_intradayRenderBadge` | 9738 |
| `_intradayUpdate` | 9623 |
| `_isOpenedTodayET` | 22517 |
| `_isPendingStatus` | 11782 |
| `_isRulesViolatingTrade` | 13615 |
| `_isWeekendET` | 8152 |
| `_ivHvAssess` | 11437 |
| `_jsq` | 8103 |
| `_kbFree` | 28525 |
| `_lazyHydrateTab` | 8806 |
| `_loadNotifCooldowns` | 25805 |
| `_loadThemeOverlayFromStorage` | 15855 |
| `_markQuotaError` | 28499 |
| `_matchesPreset` | 18548 |
| `_maybeShowEarningsSoonPopup` | 22567 |
| `_mirrorIndicesToDup` | 27313 |
| `_openInGoogleSheet` | 30699 |
| `_optScore` | 14234 |
| `_osmFmtElapsed` | 10720 |
| `_osmLoadResubmitChain` | 11249 |
| `_osmLoadResubmitChainForExp` | 11293 |
| `_overheadFromObs` | 15399 |
| `_ovtBollPctB` | 16693 |
| `_ovtComputeFG` | 16756 |
| `_ovtExtensionSeries` | 16726 |
| `_ovtFGRising` | 16801 |
| `_ovtHvSeries` | 16708 |
| `_ovtPctRank` | 16682 |
| `_parseTradierDate` | 8036 |
| `_pauseBgEnrichment` | 15067 |
| `_positionFixedDD` | 8367 |
| `_proactiveSeedIndexAnchors` | 27342 |
| `_purgeStaleDailyKeys` | 8114 |
| `_pushHydrateUi` | 17871 |
| `_pushPermBtnUpdate` | 17920 |
| `_pushStatus` | 17696 |
| `_reapplySort` | 20118 |
| `_recommendStepDelay` | 10158 |
| `_removeOrderStatusChip` | 11080 |
| `_renderBgEnrichBadge` | 15080 |
| `_renderGexCacheAge` | 20629 |
| `_renderProbePanel` | 26733 |
| `_renderQuotaBadge` | 28508 |
| `_renderScanCategoryStrip` | 18595 |
| `_renderScanDataStatus` | 18475 |
| `_renderSkeletonRows` | 18401 |
| `_renderSmartExitStatus` | 14789 |
| `_restoreFixedDD` | 8384 |
| `_resultRankCompare` | 16287 |
| `_resumeBgEnrichment` | 15073 |
| `_rhPickPrice` | 10180 |
| `_rhStepLimit` | 10602 |
| `_rhUpdatePicker` | 10171 |
| `_rulePassedByName` | 14077 |
| `_runSectorGexFollowup` | 21319 |
| `_saveNotifCooldowns` | 25819 |
| `_saveThemeOverlayToStorage` | 15868 |
| `_scheduleFilterRescan` | 19627 |
| `_seConfigKey` | 14441 |
| `_sectDDOutsideClick` | 8408 |
| `_seedIdxAnchorFromHistory` | 27366 |
| `_setBpBadges` | 24249 |
| `_setManualBp` | 24275 |
| `_setSelDetailWidth` | 17561 |
| `_shadowHasPending` | 13897 |
| `_shadowLoad` | 13489 |
| `_shadowLogScanRow` | 13709 |
| `_shadowLogScanRowsBatch` | 13717 |
| `_shadowMaybeLog` | 13500 |
| `_shadowSave` | 13493 |
| `_showExportSheetModal` | 30718 |
| `_showFallbackExportModal` | 30799 |
| `_showOrderStatusChip` | 11043 |
| `_showSpreadConfirmSheet` | 10428 |
| `_skelLoadingHtml` | 8213 |
| `_startBgEnrichment` | 14955 |
| `_stopBgEnrichment` | 15044 |
| `_strategyWarnings` | 11474 |
| `_submitVerticalSpread` | 10388 |
| `_supportFromObs` | 15419 |
| `_syncIncludesTradeToken` | 6928 |
| `_syncSnapshot` | 6934 |
| `_syncStatus` | 6873 |
| `_themeDDOutsideClick` | 8567 |
| `_todayUtc` | 16158 |
| `_toggleSpreadMode` | 10371 |
| `_tradierGcCache` | 28589 |
| `_updateHelpFab` | 8772 |
| `_updatePosHeroMobile` | 23178 |
| `_updatePreMarketPill` | 26661 |
| `_updateSandboxBanner` | 6300 |
| `_updateScanFreshness` | 18423 |
| `_updateTradeTokenBadge` | 6387 |
| `_whyRankedBelow` | 16327 |
| `_wlCopyFallback` | 21579 |
| `_wlDrawCandles` | 21724 |
| `_wsAttachToTicket` | 9505 |
| `_wsBuildSubMsg` | 9390 |
| `_wsConnect` | 9398 |
| `_wsDetachFromTicket` | 9543 |
| `_wsSubscribe` | 9461 |
| `addAlert` | 8752 |
| `addWL` | 21445 |
| `ahDelta` | 9935 |
| `applyAutoScanSettings` | 18305 |
| `applyCandidate` | 9230 |
| `applyDefaultsToAll` | 22451 |
| `applyDefaultTsConfig` | 22433 |
| `applyFilters` | 19651 |
| `applySmartExitsToUi` | 14824 |
| `applyStrategyMode` | 26747 |
| `applyTheme` | 18036 |
| `atCountAutoPositions` | 26259 |
| `atExecuteTrade` | 26504 |
| `atHasOpenPosition` | 26253 |
| `atLog` | 26223 |
| `atUpdateStats` | 26235 |
| `autoFillHighConviction` | 26004 |
| `autoScanCheckAlerts` | 18361 |
| `autoScanTick` | 18322 |
| `autoSelectContract` | 9057 |
| `autoSelectSimulated` | 9238 |
| `bsGC` | 28728 |
| `bsHardPrune` | 28758 |
| `bsSet` | 28718 |
| `buildDetail` | 16836 |
| `buildOccSym` | 12313 |
| `buyOrder` | 23937 |
| `cacheAge` | 28764 |
| `cacheGet` | 28560 |
| `cacheSet` | 28539 |
| `calcADX` | 15578 |
| `calcATR` | 15645 |
| `calcBreakeven` | 23610 |
| `calcCMO` | 15525 |
| `calcEffectiveStepSize` | 10137 |
| `calcEMA` | 15628 |
| `calcEx` | 26834 |
| `calcMACD` | 15542 |
| `calcMFI` | 15510 |
| `calcPnlAtPrice` | 23577 |
| `calcQtyFromBudget` | 12325 |
| `calcRSIAccel` | 15501 |
| `calcRSIatIndex` | 15489 |
| `calcTfAligned` | 15683 |
| `cancelOrder` | 11733 |
| `cancelOrderFromModal` | 11130 |
| `cancelPendingOrder` | 11866 |
| `cancelRollFill` | 24862 |
| `cancelStepFill` | 10679 |
| `chainRowClick` | 17306 |
| `chainSort` | 17293 |
| `chartIconBtnHtml` | 22119 |
| `chartModalSetTf` | 21905 |
| `checkHighConvictionSignals` | 26113 |
| `clamp` | 8262 |
| `clearBudget` | 12346 |
| `clearCustomTickers` | 18206 |
| `clearFilters` | 19927 |
| `clearFmpCache` | 26938 |
| `clearKeys` | 26950 |
| `clearOrder` | 12977 |
| `clearPositions` | 23924 |
| `closeChartModal` | 21899 |
| `closeContractPanel` | 27853 |
| `closeDetailPane` | 16828 |
| `closeDetailPanel` | 17584 |
| `closeHelpModal` | 8793 |
| `closeOrderStatusModal` | 10981 |
| `closePosition` | 24000 |
| `closeRollModal` | 24397 |
| `closeSectorDropdown` | 8422 |
| `closeThemeDropdown` | 8578 |
| `computeATR` | 14456 |
| `computeEMA` | 14510 |
| `computeHV` | 14486 |
| `computeRuleIC` | 13648 |
| `computeScanRuleIC` | 13775 |
| `computeTrailInitialStop` | 13116 |
| `copyExportModalText` | 20094 |
| `cpBuyNow` | 28083 |
| `cpSortBy` | 28071 |
| `cwAutoAddFromPositions` | 28161 |
| `cwClearExpired` | 28362 |
| `cwGetAll` | 28116 |
| `cwGetFilter` | 28233 |
| `cwRemove` | 28354 |
| `cwRenderTable` | 28241 |
| `cwSaveAll` | 28120 |
| `cwSetFilter` | 28236 |
| `cwToggleWatch` | 28124 |
| `decorateIndustry` | 31870 |
| `detectInstitutionalOBs` | 15288 |
| `detectOrderBlocks` | 15160 |
| `doBuyCall` | 23951 |
| `doBuyPut` | 23952 |
| `doClose` | 23953 |
| `doRoll` | 24355 |
| `drawPnlChart` | 23620 |
| `eid` | 7992 |
| `excludedFilteredResults` | 8668 |
| `executeTsClose` | 23512 |
| `exportGoTickers` | 20008 |
| `exportPositionsLongForm` | 30886 |
| `fetchBalances` | 24090 |
| `fetchClosedPositions` | 25446 |
| `fetchLiveQuote` | 9763 |
| `fetchOptionContract` | 14245 |
| `fetchOptionQuote` | 9837 |
| `fetchPendingOrders` | 11787 |
| `fetchPositions` | 22142 |
| `fetchPositionsDirect` | 22176 |
| `fetchStockQuote` | 9795 |
| `filterSectorOptions` | 8467 |
| `filterThemeOptions` | 8612 |
| `findExtendedTrend` | 14158 |
| `findHighConvictionSetups` | 14097 |
| `finishScan` | 19127 |
| `fireBrowserNotif` | 25923 |
| `fireEmailAlert` | 25940 |
| `fmpCacheKey` | 15741 |
| `fmt2` | 8004 |
| `fmtComma` | 8239 |
| `fmtD` | 8232 |
| `fmtDateUS` | 8090 |
| `fmtK` | 8233 |
| `fmtP` | 8231 |
| `forceReloadFresh` | 32027 |
| `formatCommaInput` | 8248 |
| `formatOpenedDateTime` | 22536 |
| `gatherKnownSectors` | 8274 |
| `gatherKnownThemes` | 8493 |
| `generateLiveModeToken` | 27248 |
| `getAutoTraderSettings` | 26207 |
| `getCustomTickerList` | 18218 |
| `getDaysToEarnings` | 16256 |
| `getIndFilter` | 19618 |
| `getNotifSettings` | 25878 |
| `getRegime` | 8678 |
| `getThemeStrength` | 15940 |
| `getThemeStrengthLive` | 16122 |
| `getTradierCreds` | 8965 |
| `getTradierCredsQuick` | 13138 |
| `getTsConfig` | 22467 |
| `getTsDefaultSettings` | 22422 |
| `getTvSettings` | 16811 |
| `getVisibleSectors` | 8314 |
| `getVisibleThemes` | 8499 |
| `hcModalCancel` | 26092 |
| `hcModalSkip` | 26104 |
| `hcModalSubmit` | 26074 |
| `hideStaleBanner` | 28784 |
| `histCacheKey` | 14844 |
| `indCopyFallback` | 31462 |
| `indCopyMembers` | 31442 |
| `indDraw` | 31615 |
| `indDrawHist` | 31905 |
| `indEsc` | 31408 |
| `indFmt` | 31409 |
| `indFmtAsOf` | 31514 |
| `indRenderUnassigned` | 31470 |
| `indRsClass` | 31410 |
| `indScoreClass` | 31418 |
| `indSetTF` | 31503 |
| `init` | 30996 |
| `initCollapsibles` | 31980 |
| `intradayGetState` | 9689 |
| `intradayRsToScore` | 16021 |
| `inWatchlist` | 17994 |
| `isAHTrade` | 9916 |
| `isCloseAction` | 10084 |
| `isMarketHours` | 26246 |
| `isPreMarketET` | 26646 |
| `isSellAction` | 10078 |
| `loadAppSettings` | 27708 |
| `loadAutoScan` | 18280 |
| `loadAutoTraderSettings` | 26192 |
| `loadAutoTraderState` | 26357 |
| `loadBsHideNoGo` | 18026 |
| `loadCustomTickers` | 18211 |
| `loadEarningsCacheFromStorage` | 16160 |
| `loadFmpCache` | 15743 |
| `loadGexCache` | 20549 |
| `loadGexSchedule` | 20737 |
| `loadHistCache` | 14846 |
| `loadKeys` | 27143 |
| `loadNotifSettings` | 25857 |
| `loadOBCache` | 15117 |
| `loadPortfolio` | 30690 |
| `loadScanSettings` | 19879 |
| `loadSmartExitsConfig` | 14442 |
| `loadWL` | 21443 |
| `makeMeter` | 25783 |
| `marketDaysBetween` | 8986 |
| `matchTrades` | 25343 |
| `minimizeOrderStatusModal` | 11000 |
| `minutesUntilMarketClose` | 14533 |
| `obCacheKey` | 15115 |
| `onBsSearch` | 18015 |
| `onEditOrderTypeChange` | 11930 |
| `onOBFilterChange` | 19964 |
| `onOrderOtypeChange` | 13068 |
| `onOrderTypeChange` | 12997 |
| `onScSearch` | 18033 |
| `onSectorCheckboxChange` | 8449 |
| `onSymbolChange` | 9315 |
| `onThemeCheckboxChange` | 8596 |
| `openChartModal` | 21880 |
| `openContractPanel` | 27816 |
| `openEditOrderModal` | 11878 |
| `openHelpFor` | 8779 |
| `openOrderStatusModal` | 10726 |
| `opPushSend` | 17851 |
| `ordChainRowClick` | 17527 |
| `osmResubExpChange` | 11370 |
| `osmResubPickStrike` | 11381 |
| `osmResubStrikeChange` | 11376 |
| `overheadInstOBDistance` | 15450 |
| `overheadOBDistance` | 15441 |
| `parseOccSymbol` | 22130 |
| `parseOccSymbolFull` | 25336 |
| `pfAddColumn` | 29208 |
| `pfAddRow` | 29148 |
| `pfAutoPullTradier` | 29618 |
| `pfBuilderAdd` | 29986 |
| `pfBuilderClear` | 30023 |
| `pfBuilderKindChange` | 29976 |
| `pfChartOpts` | 29836 |
| `pfClearColumn` | 29223 |
| `pfClosePasteModal` | 30119 |
| `pfColor` | 28819 |
| `pfCopyAllTickers` | 21600 |
| `pfDeleteColumn` | 29215 |
| `pfDeleteRow` | 29153 |
| `pfDownloadCSVTemplate` | 30050 |
| `pfEnrichUnknownSectors` | 28929 |
| `pfEsc` | 29070 |
| `pfExportCSV` | 30508 |
| `pfExportMatrix` | 30809 |
| `pfGenId` | 28890 |
| `pfGetCol` | 28891 |
| `pfGetRow` | 28892 |
| `pfImportPasted` | 30446 |
| `pfInferYear` | 30125 |
| `pfLoad` | 28834 |
| `pfLoadStrikesFor` | 29321 |
| `pfNormalizeDate` | 30362 |
| `pfOccSymbol` | 28895 |
| `pfOpenPasteModal` | 29957 |
| `pfParseBlock` | 30267 |
| `pfParseLine` | 30135 |
| `pfParseMultiSharesLine` | 30230 |
| `pfParsePreview` | 30388 |
| `pfPopulateExpiries` | 29296 |
| `pfPopulateStrikes` | 29399 |
| `pfRecomputeStats` | 29803 |
| `pfRefreshAll` | 29527 |
| `pfRefreshRow` | 29480 |
| `pfRenameColumn` | 29203 |
| `pfRenderCharts` | 29868 |
| `pfRenderColumn` | 28994 |
| `pfRenderColumnCharts` | 29920 |
| `pfRenderRow` | 29072 |
| `pfRenderStaged` | 30028 |
| `pfResetAll` | 29230 |
| `pfRowField` | 29158 |
| `pfSave` | 28887 |
| `pfSaveRow` | 29185 |
| `pfSectorFor` | 28907 |
| `pfTickerChanged` | 29240 |
| `pfUploadCSV` | 30069 |
| `pollOrderDetails` | 11720 |
| `pollOrderStatus` | 11706 |
| `populateAsrMonths` | 9027 |
| `populateSectorCheckboxes` | 8293 |
| `populateThemeCheckboxes` | 8517 |
| `populateThemeDropdown` | 19634 |
| `previewOrder` | 12354 |
| `probePreMarketData` | 26671 |
| `promptTradeToken` | 6433 |
| `pushNotify` | 17889 |
| `pushSendTest` | 17761 |
| `pushSubscribe` | 17719 |
| `pushUnsubscribe` | 17835 |
| `quickBuyShares` | 17948 |
| `reclassifyGoThreshold` | 8717 |
| `refreshWL` | 21467 |
| `regimeAdjustedThreshold` | 8712 |
| `removeWL` | 21446 |
| `renderAlerts` | 26827 |
| `renderBuySig` | 18067 |
| `renderClosedTable` | 25578 |
| `renderContractPanel` | 27989 |
| `renderGex` | 21186 |
| `renderIndustryTab` | 31420 |
| `renderPendingOrders` | 11826 |
| `renderPortfolio` | 28947 |
| `renderPosChart` | 23886 |
| `renderPositionsTable` | 22614 |
| `renderQuotePanel` | 9947 |
| `renderScan` | 20167 |
| `renderTopThemesStrip` | 16030 |
| `renderTsStatusRow` | 23353 |
| `renderTV` | 16821 |
| `requestNotifPermission` | 25904 |
| `requestPushPerm` | 17927 |
| `resetOneTsState` | 23499 |
| `resetOrderForm` | 23958 |
| `resetQuotePanel` | 9296 |
| `resetScanSettings` | 19898 |
| `resetTotalPnl` | 23159 |
| `resetTsState` | 23916 |
| `restoreOrderStatusModal` | 11015 |
| `resubmitFromModal` | 11163 |
| `rnd` | 8261 |
| `rollFetchBest` | 24818 |
| `rollFetchLeg1Quote` | 24442 |
| `rollGetCreds` | 24422 |
| `rollLoadChain` | 24560 |
| `rollLoadExpirations` | 24521 |
| `rollLog` | 24402 |
| `rollRenderChainTable` | 24794 |
| `rollSelectBest` | 24680 |
| `rollSelectContract` | 24636 |
| `rollUpdateNet` | 24822 |
| `runGex` | 20839 |
| `runGexForTicker` | 21362 |
| `saveAlertSettingsBtn` | 25824 |
| `saveAppSettings` | 27659 |
| `saveAutoScan` | 18292 |
| `saveAutoTraderSettings` | 26178 |
| `saveAutoTraderState` | 26346 |
| `saveCustomTickers` | 18199 |
| `saveEarningsCacheToStorage` | 16182 |
| `saveEquityTrail` | 7988 |
| `saveFmpCache` | 15754 |
| `saveGexCache` | 20509 |
| `saveGexSchedule` | 20740 |
| `saveHistCache` | 14868 |
| `saveKeys` | 26845 |
| `saveNotifSettings` | 25838 |
| `saveOBCache` | 15127 |
| `savePushAppId` | 17700 |
| `saveScanSettings` | 19860 |
| `saveSelectedSectors` | 7985 |
| `saveSelectedThemes` | 8490 |
| `saveSmartExitsConfig` | 14451 |
| `saveTsConfig` | 22479 |
| `saveWL` | 21444 |
| `scheduleMidnightRefresh` | 25319 |
| `scoreGexForDate` | 8995 |
| `scoreIt` | 16352 |
| `searchCustomTicker` | 18229 |
| `sectorAllowed` | 8476 |
| `sectorCounts` | 8284 |
| `selectAllSectors` | 8434 |
| `selectAllThemes` | 8584 |
| `selectOnlyTheme` | 8628 |
| `sendEmailJsAlert` | 25968 |
| `setGexSchedule` | 20829 |
| `setLimitToAsk` | 10059 |
| `setLimitToBid` | 10043 |
| `setLimitToMid` | 10051 |
| `setScanComplete` | 18622 |
| `setScanProgress` | 18246 |
| `sfLog` | 10669 |
| `shadowBookStats` | 14196 |
| `showAutoSubmitModal` | 26043 |
| `showExportModal` | 20058 |
| `showOrderTerminalBanner` | 11089 |
| `showPosError` | 22420 |
| `showQuoteLoading` | 9309 |
| `showSimQuote` | 9891 |
| `showStaleBanner` | 28783 |
| `showUncoveredTrailBanner` | 13382 |
| `showVersionBanner` | 27779 |
| `simInd` | 13438 |
| `simOpt` | 13460 |
| `simQuote` | 13428 |
| `sleep` | 12005 |
| `sortTable` | 20127 |
| `starHTML` | 18006 |
| `startAutoScan` | 18316 |
| `startEquityTrailPoller` | 13147 |
| `startGexAutoSchedule` | 20807 |
| `startSmartExitsPoller` | 14755 |
| `startTsPoller` | 23341 |
| `stopAutoTrader` | 26330 |
| `stopEquityTrailPoller` | 13158 |
| `stopGexAutoSchedule` | 20826 |
| `stopSmartExitsPoller` | 14768 |
| `stopTsPoller` | 23349 |
| `submitEditOrder` | 11937 |
| `submitLimitAtPrice` | 11574 |
| `submitOrder` | 12417 |
| `supportInstOBDistance` | 15454 |
| `supportOBDistance` | 15445 |
| `switchDetTab` | 17007 |
| `switchTab` | 8817 |
| `syncSmartExitsFromUi` | 14813 |
| `tagOutlierTrades` | 13628 |
| `testEmailAlert` | 25984 |
| `themeAllowed` | 8620 |
| `themeMemberCounts` | 8503 |
| `tickerPassesSectorExclusion` | 8654 |
| `toast` | 8264 |
| `toggleAutoScanPanel` | 18337 |
| `toggleAutoTrader` | 26264 |
| `toggleBsHideNoGo` | 18019 |
| `toggleClosedChart` | 25749 |
| `toggleLightMode` | 18055 |
| `toggleMobileFilters` | 8750 |
| `togglePosChart` | 23871 |
| `toggleSecSeg` | 32052 |
| `toggleSectorDropdown` | 8390 |
| `toggleSegGroup` | 32070 |
| `toggleSmartExits` | 14774 |
| `toggleStepFill` | 10123 |
| `toggleThemeDropdown` | 8553 |
| `toggleTrailingStop` | 23323 |
| `toggleTsRow` | 22504 |
| `toggleWatchlistTicker` | 17995 |
| `tradierFetch` | 28663 |
| `tsLog` | 23313 |
| `updateAsrMonthLabel` | 9016 |
| `updateAutoScanPill` | 18342 |
| `updateClock` | 27271 |
| `updateClosedStats` | 25703 |
| `updateHeaderQuotes` | 27415 |
| `updateNotifPermStatus` | 25886 |
| `updateOrdChart` | 23825 |
| `updateOrderStatusModal` | 10879 |
| `updatePosStats` | 23209 |
| `updateSectorLabel` | 8329 |
| `updateStepCalcDisplay` | 10651 |
| `updateStepFillMode` | 10092 |
| `updateThemeLabel` | 8534 |
| `viewDetail` | 17597 |
| `wlClearAll` | 21584 |
| `wlCollapseChart` | 21634 |
| `wlCopyTickers` | 21570 |
| `wlNudge` | 21450 |
| `wlRenderChart` | 21674 |
| `wlSelectTicker` | 21647 |
| `wlSetTimeframe` | 21623 |

---

## Adjacent files (not in `index.html`)

| Path | Owns |
|---|---|
| `worker/tradier-proxy/src/index.js` | Cloudflare Worker proxy: origin allowlist, path allowlist, X-Live-Token + X-Trade-Token gates, body cap, constant-time token compare |
| `worker/tradier-proxy/wrangler.toml` | Worker config: `ALLOWED_ORIGINS` |
| `industry/score_themes.py` | Nightly cron — fetches yfinance data, computes theme RS scores, writes `theme_scores.json` |
| `industry/build_master_list.py` | Builds `master_tickers.json` from `CURATED_THEMES` + `alex_tickers.csv` |
| `industry/audit_unassigned.py` | Auto-assigns themes to unassigned tickers via heuristic |
| `industry/test_theme_scores.py` | pytest smoke test — runs as a hard gate before cron commits new snapshot |
| `industry/master_tickers.json` | Generated — ticker → theme mappings |
| `industry/theme_scores.json` | Generated — daily theme RS scores (consumed by scanner's industry tab + theme overlay) |
| `alex_tickers.csv` | Curated ticker universe (~2,500 symbols) |
| `tools/audit/eslint.config.mjs` | ESLint config — security plugins only |
| `tools/audit/extract-scripts.js` | Pulls `<script>` blocks out of index.html for ESLint |
| `tools/audit/extract-sections.js` | Splits index.html along section dividers (audit aid only) |
| `tools/audit/fuzz-tradier-proxy.sh` | Read-only fuzz of the deployed worker |
| `.github/workflows/score_themes.yml` | Cron workflow with smoke-test gate + failure-issue notification |
| `.github/workflows/static-analysis.yml` | ESLint + Semgrep on every push/PR |
| `HANDOFF.md` | Session-handoff briefing for new Claude conversations |
