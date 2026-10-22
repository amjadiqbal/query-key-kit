#!/usr/bin/env bash
# Packs the package exactly as it would ship, installs that tarball into examples/react and
# type-checks the example against it.
set -euo pipefail
cd "$(dirname "$0")/.."
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
npm run --silent build
tarball=$(npm pack --silent --pack-destination "$tmp")
cd examples/react
npm install --no-audit --no-fund --no-save "$tmp/$tarball"
npx tsc --noEmit
echo "examples/react type-checks against $tarball"
