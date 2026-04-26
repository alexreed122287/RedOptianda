# Static analysis tooling

Local-only tooling that runs ESLint (with `eslint-plugin-security` and
`eslint-plugin-no-unsanitized`) and Semgrep (with the OWASP top-ten and
JavaScript rule packs) against the scanner. Intended to catch XSS / injection
patterns before they ship.

## What it scans

- `index.html` — extracted into a flat `extracted-scripts.js` for ESLint, scanned in-place by Semgrep
- `worker/tradier-proxy/src/index.js` — Cloudflare Worker proxy
- `industry/*.py` — pipeline scripts (Semgrep covers these via the JS pack's adjacent Python rules)

## Running locally

```bash
cd tools/audit

# Install ESLint + plugins (one-time)
npm install

# Extract <script> blocks and run ESLint
node extract-scripts.js
npx eslint --config eslint.config.mjs extracted-scripts.js

# Run Semgrep (requires `pip install semgrep` or `pipx install semgrep`)
cd ../..
semgrep --config=p/javascript --config=p/owasp-top-ten --config=p/xss \
        --config=p/security-audit --severity ERROR --severity WARNING \
        index.html industry/ worker/
```

## Running in CI

`.github/workflows/static-analysis.yml` runs both tools on every push to
`main` and every pull request. The job fails if either tool reports a new
ERROR-severity finding.

## Why the rule set is narrow

The full ESLint recommended ruleset would generate thousands of style/correctness
findings against a single 17,500-line legacy file. The config in
`eslint.config.mjs` enables only the **security** rules (`no-unsanitized/*`,
`security/detect-*`, `no-eval`, `no-new-func`) so signal stays high. To
broaden coverage later, add rules to that file rather than switching presets.

## Section-by-section view (for audits / code review)

`extract-sections.js` splits `index.html` along the `// ═══════` dividers
the source already uses, writing one `.js` file per labeled section into
`tools/audit/sections/`. This is a **navigation aid only** — `index.html`
remains the source of truth, and the output dir is gitignored / regenerated
on demand.

```bash
node tools/audit/extract-sections.js
ls tools/audit/sections/    # ~23 named files, one per major subsystem
```

This is intentionally NOT a real module split. A real split (each module
IIFE-wrapped, build pipeline, dependency declarations) would be a multi-day
project that risks introducing scope/ordering bugs in production trading
code. The extractor delivers the audit-cost benefit (subagents stop
mis-citing line numbers in a giant file) without any behavior change.

## Worker proxy fuzz test

`fuzz-tradier-proxy.sh` runs read-only probes against the deployed Tradier
worker proxy. Tests origin allowlist, path allowlist, method gate, mode
gate, and body-size cap. No real Tradier tokens used — every probe expects
a non-2xx response.

```bash
bash tools/audit/fuzz-tradier-proxy.sh    # exit 0 if all probes match
```

Re-run after every `wrangler deploy` of the worker.
