#!/usr/bin/env bash
# Put a build at the root of this repo (what the QA system reads), replacing what is there.
#   bash workspace/sync-to-root.sh review   the reviewer's copy (workspace/STEM-Flood-AR_REVIEW: proposals drawn over the pictures)
#   bash workspace/sync-to-root.sh final    the clean build (workspace/STEM-Flood-AR): use this once the Arabic is approved
# Run rebuild-ar.sh first. Only the build files at the root are replaced: .git, workspace/, README.md, .gitignore and .gitattributes stay.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
case "${1:-}" in
  review) FROM="$HERE/STEM-Flood-AR_REVIEW" ;;
  final)  FROM="$HERE/STEM-Flood-AR" ;;
  *) echo "usage: bash workspace/sync-to-root.sh review|final"; exit 2 ;;
esac
[ -f "$FROM/index.html" ] || { echo "no build in $FROM: run workspace/rebuild-ar.sh first"; exit 1; }

cd "$ROOT"
for e in * .[!.]*; do
  case "$e" in .git|.gitignore|.gitattributes|workspace|README.md) continue ;; esac
  [ -e "$e" ] && rm -rf "$e"
done
( cd "$FROM" && find . -mindepth 1 -maxdepth 1 ! -name .git -exec cp -rf {} "$ROOT/" \; )
# developer notes live in workspace/, not at the root
rm -f "$ROOT/IMPORT_REPORT.md" "$ROOT/README_AR.md" "$ROOT/ASSET_LOCALIZATION.md"
echo "repo root now holds the $1 build ($(find "$ROOT" -type f ! -path '*/.git/*' ! -path '*/workspace/*' | wc -l) files)"
echo "next: git add -A, commit, push (GitHub Desktop)"
