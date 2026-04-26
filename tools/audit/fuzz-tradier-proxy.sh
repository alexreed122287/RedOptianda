#!/usr/bin/env bash
# Read-only fuzz of the deployed Tradier proxy. Probes auth gates, origin
# allowlist, path allowlist, method handling, and body cap. Does NOT require
# real Tradier tokens — every probe expects a non-2xx response. Real tokens
# never touch this script.
#
# Usage:  bash tools/audit/fuzz-tradier-proxy.sh
#
# Exits non-zero if any probe with a hard expectation (origin/path/method
# gates, body cap) fails. Probes marked "informational" (expected=0) just
# print the actual code without affecting exit status.
set -u
PROXY="${PROXY_URL:-https://tradier-proxy.alexander-s-reed.workers.dev}"
LEGIT_ORIGIN="${LEGIT_ORIGIN:-https://alexreed122287.github.io}"
EVIL_ORIGIN="https://attacker.example.com"

fails=0
probe() {
  local label="$1"; shift
  local expected="$1"; shift
  local actual=$(curl -sk -o /dev/null -w "%{http_code}" "$@")
  local status="PASS"
  if [ "$expected" != "0" ] && [ "$actual" != "$expected" ]; then
    status="FAIL"; fails=$((fails+1))
  fi
  printf "%-58s expected=%-4s actual=%-4s [%s]\n" "$label" "$expected" "$actual" "$status"
}

echo "=== Origin gate (expect 403 unless origin matches allowlist) ==="
probe "evil origin"                        403 -H "Origin: $EVIL_ORIGIN" "$PROXY/v1/user/profile?mode=live"
probe "no origin"                          403 "$PROXY/v1/user/profile?mode=live"
probe "legit origin live mode no token"    403 -H "Origin: $LEGIT_ORIGIN" "$PROXY/v1/user/profile?mode=live"

echo
echo "=== Path allowlist (expect 403 for unlisted paths) ==="
probe "evil path /admin"                   403 -H "Origin: $LEGIT_ORIGIN" "$PROXY/admin"
probe "evil path /v2/markets"              403 -H "Origin: $LEGIT_ORIGIN" "$PROXY/v2/markets/quotes?mode=sandbox"
probe "evil path / (root)"                 403 -H "Origin: $LEGIT_ORIGIN" "$PROXY/?mode=sandbox"
probe "watchlistsBOMB prefix smuggle"      403 -H "Origin: $LEGIT_ORIGIN" "$PROXY/v1/watchlistsBOMB?mode=sandbox"

echo
echo "=== Method gate ==="
probe "PATCH method (not in allowed list)" 405 -X PATCH -H "Origin: $LEGIT_ORIGIN" "$PROXY/v1/markets/quotes?symbols=AAPL&mode=sandbox"
probe "OPTIONS preflight"                  204 -X OPTIONS -H "Origin: $LEGIT_ORIGIN" "$PROXY/v1/markets/quotes"

echo
echo "=== Mode gate (live without X-Live-Token expects 403) ==="
probe "mode=live no token"                 403 -H "Origin: $LEGIT_ORIGIN" "$PROXY/v1/user/profile?mode=live"
probe "mode=LIVE (case)"                   403 -H "Origin: $LEGIT_ORIGIN" "$PROXY/v1/user/profile?mode=LIVE"

echo
echo "=== Body size cap (POST 16KB, expect 413) ==="
BIG_BODY=$(python3 -c "print('x'*16384)")
probe "16KB POST"                          413 -X POST -H "Origin: $LEGIT_ORIGIN" -H "Content-Type: application/x-www-form-urlencoded" --data "$BIG_BODY" "$PROXY/v1/accounts/X/orders?mode=sandbox"

echo
echo "=== Path-traversal canonicalization (informational) ==="
echo "(URL.pathname canonicalizes .., so /v1/markets/../user/profile resolves"
echo " to /v1/user/profile and IS legitimately in the allowlist.)"
probe "/v1/markets/../user/profile"        0   -H "Origin: $LEGIT_ORIGIN" "$PROXY/v1/markets/../user/profile?mode=sandbox"

echo
if [ "$fails" -eq 0 ]; then
  echo "All hard-expectation probes passed."
  exit 0
else
  echo "$fails probe(s) failed."
  exit 1
fi
