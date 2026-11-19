#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

corepack enable
corepack prepare pnpm@10.18.0 --activate

printf '%s\n' 'Installing locked dependencies...'
pnpm install --frozen-lockfile --child-concurrency=1 --network-concurrency=1

printf '%s\n' 'Running TypeScript validation...'
pnpm run check

printf '%s\n' 'Running automated tests...'
pnpm test

printf '%s\n' 'Building the production frontend and server bundle...'
pnpm run build

if [[ ! -f dist/public/index.html || ! -f dist/index.js ]]; then
  echo 'Production build did not create dist/public/index.html and dist/index.js.' >&2
  exit 1
fi

printf '%s\n' 'Production build is ready in dist/.'
