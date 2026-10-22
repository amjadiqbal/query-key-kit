#!/usr/bin/env bash
# Local CI: GitHub workflows never run on this repo, so every change runs this and pastes the summary
# into the PR or commit notes. Typecheck, lint, tests, build, a TypeScript 5.0 check of the built
# types, publint, then a dry-run pack. `npm run check:example` is the separate example-app check.
set -uo pipefail
cd "$(dirname "$0")/.."

RESULTS=(); FAILED=0
step() { local name=$1; shift; printf '\n== %s\n' "$name"; if "$@"; then RESULTS+=("pass  $name"); else RESULTS+=("FAIL  $name"); FAILED=1; fi; }

[ -f package.json ] || { echo "no package.json yet"; exit 1; }
step "install"   npm ci --no-audit --no-fund
step "typecheck" npm run --silent typecheck
step "lint"      npm run --silent lint
step "test"      npm test --silent
step "build"     npm run --silent build
step "ts 5.0"    npm run --silent typecheck:ts5
step "publint"   npx --no-install publint
step "pack"      npm pack --dry-run

printf '\n== summary\n'; printf '%s\n' "${RESULTS[@]}"
exit $FAILED
