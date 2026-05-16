# Industry Strength Scanner

Multi-timeframe theme/sub-industry strength scoring layered on top of the
PANDA scanner universe. Identifies which themes are leading or lagging the
S&P 500 across daily, weekly, and monthly horizons.

**Live dashboard**: [alexreed122287.github.io/RedOptianda/industry/themes.html](https://alexreed122287.github.io/RedOptianda/industry/themes.html)

## What it scores

For each theme (e.g. Photonics, Memory, Drones, Uranium):

1. **Equal-weighted theme basket return** computed from member tickers
2. **Relative strength vs SPY** over 4 windows: 1W, 1M, 3M, 6M
3. **Percentile rank** (0-100) of each window's RS vs all other themes
4. **Breadth**: % of theme members above their 50-day and 200-day SMA
5. **Trend**: Theme composite price > 50-EMA (binary)

Three composite scores combine these inputs with different time-horizon weights:

| Score   | Formula                                                    | Use case |
|---------|-----------------------------------------------------------|----------|
| Daily   | 50% RS_1W + 25% RS_1M + 15% breadth_50 + 10% trend       | Spot fresh rotation; high noise |
| Weekly  | 20% RS_1W + 50% RS_1M + 15% RS_3M + 15% breadth_50       | Best for 14-21 DTE call entries |
| Monthly | 15% RS_1M + 40% RS_3M + 30% RS_6M + 15% breadth_200      | Durable leadership; LEAPs |

**Strongest signal**: themes ranking in the top decile across all three timeframes simultaneously.

## Files

```
industry/
├── build_master_list.py     One-time/monthly: build master_tickers.json
├── score_themes.py          Daily: pull prices, score themes, write JSON
├── master_tickers.json      Output of builder (themes + ticker→theme map)
├── theme_scores.json        Output of scorer (latest scores per theme)
├── theme_scores_history.json  Rolling 180-day history of scores
├── themes.html              Dashboard (reads JSON, renders ranked tables + heatmap)
└── README.md                This file
```

GitHub Actions workflow at `.github/workflows/score_themes.yml` runs the scorer
weekdays at 22:00 UTC (~30 min after US market close) and commits refreshed JSON.

## Setup

```bash
pip install yfinance pandas numpy requests

# 1. Build master ticker list (run once, or monthly to refresh)
python industry/build_master_list.py

# 2. Score themes (run daily; can also be triggered by GH Actions)
python industry/score_themes.py
```

Set `TRADIER_TOKEN` env var to use Tradier as the primary data source (faster,
more reliable than yfinance for large universes). Without it the scorer falls
back to yfinance, which works but is rate-limited.

For GitHub Actions: add `TRADIER_TOKEN` as a repo secret under
**Settings → Secrets and variables → Actions**.

## Curated themes

Defined in `build_master_list.py` under `CURATED_THEMES`. Currently includes:

**AI / Compute**: AI Infrastructure, Photonics, Fiber Optics, Memory & Storage,
Semi Equipment, Semiconductors, Big Tech

**Defense / Aerospace**: Defense, Drones, Space

**Energy / Power**: Uranium, Nuclear / SMR, AI Power, Solar, Oil & Gas E&P

**Financials / Crypto**: Crypto / Miners, Fintech, Mega Banks

**Healthcare / Other**: GLP-1 / Obesity, Biotech (large), Cybersecurity,
Quantum, Industrial / Picks, Travel & Leisure, Retail / Consumer

**Recurring picks**: Hogue 2026, Top Recurring

Edit the `CURATED_THEMES` dict in `build_master_list.py` and re-run the builder
to add or modify themes. The scorer auto-picks up changes on the next run.

The scorer also auto-generates themes from TradingView sectors (prefixed
`[TV]`) so every ticker in the universe gets some coverage even without curated
membership. TV sectors are sampled at 30 members each.

## Reading the dashboard

- **Score column**: 0-100, primary ranking metric for the selected timeframe
- **RS columns**: percentile rank (0-100) of theme's excess return vs SPY for
  that window. 90+ = top decile. Color: green (≥90), cyan (≥70), amber (≥30),
  pink (≥10), red (<10).
- **B50**: % of theme members trading above their 50-day SMA
- **Trend**: ▲ if theme composite > 50-EMA, ▼ otherwise
- **N**: Number of members with valid price data
- **Click any row** to expand and see all member tickers (with copy-ready
  comma-separated list for TradingView/TrendSpider import)
- **Triple-Timeframe Aligned panel**: themes in the top decile across daily,
  weekly, AND monthly — strongest cross-horizon signals
