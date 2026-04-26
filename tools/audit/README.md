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
