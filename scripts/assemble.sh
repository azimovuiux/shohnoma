#!/usr/bin/env bash
# out/ (Next statik eksport) + php/ → dist/ — Plesk deploy papkasi tarkibi
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf dist
mkdir -p dist
cp -a out/. dist/
cp -a php/. dist/
cp php/.htaccess dist/.htaccess
# Guest taklifnoma qobig‘i: /_/index.html → invite.php shu faylni o‘qiydi
test -f dist/_/index.html || { echo "dist/_/index.html topilmadi"; exit 1; }
echo "dist tayyor: $(find dist -type f | wc -l) ta fayl"
