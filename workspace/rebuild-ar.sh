#!/usr/bin/env bash
# Rebuild the Arabic Flood lomda (השיטפון המפתיע, STEM_Flood) from the pinned Hebrew source + the Arabic translation.
#
#   he-source/        the Hebrew lomda at the commit named in he-source.txt (read-only: never edited here)
#   translation/      Hebrew XLIFF, brief, glossary seed, translations.json (the single source of truth for the Arabic)
#   assets-ar/        Arabic media and artwork, overlaid on the Hebrew assets under the ORIGINAL file names
#   style-ar.css fonts-ar.css applet-ar.css index-ar-fixes.py   authored masters, copied into the build
#   STEM-Flood-AR/    the build. GENERATED: nothing is edited in it, everything is re-derived on each run.
#   STEM-Flood-AR_REVIEW/   the reviewer's copy: this build plus the layer of proposed Arabic over the Hebrew painted
#                     into the pictures (translation/review-layer.json). A folder, no zip (the QA system takes the folder).
#
# Videos: the Arabic videos do not exist yet, so assets-ar/videos holds silent same-length placeholders of the five
# narrated videos (tools/make_placeholders.py: the poster frame for the whole length). The Hebrew narrated videos are
# never copied into the build. The simulation clips (lab-*.mp4, soil-test.mp4, channels-flow.mp4) have no speech and are
# copied from the Hebrew source as they are; soil-test and channels-flow carry Hebrew signs painted in (ASSET_LOCALIZATION.md).
set -euo pipefail

# Paths: the folder this script is in (the workspace) and the two skills' folders. Override with FLOOD_WS / SKILLS_DIR
# if the skills are somewhere else (default: ~/.claude/skills).
_here() { pwd -W 2>/dev/null || pwd; }
W="${FLOOD_WS:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && _here)}"
SKILLS_DIR="${SKILLS_DIR:-$(cd "$HOME/.claude/skills" && _here)}"
SRC="$W/he-source"
AR="$W/STEM-Flood-AR"
SK="$SKILLS_DIR/lomda-he-to-ar"
TR="$SKILLS_DIR/stem-lomda-ar-translate"
T="$W/translation"
export PYTHONIOENCODING=utf-8
cd "$W"

# 0. the Arabic text: fill the XLIFF from the seed (shipped wording) and translations.json, then the rule checks.
#    An ERROR stops the build; CHECK lines are read by a person.
python "$TR/scripts/fill_xlf.py" "$T/flood_he.xlf" "$T/flood.he-ar.xlf" "$T/translations.seed.json" "$T/translations.json" --overwrite
python "$TR/scripts/check_translation.py" "$T/flood.he-ar.xlf" --xlsx "$T/review.xlsx" \
  --notes "$T/translations.json" --project-rules "$T/project-rules.json" --fail-on-errors > "$T/check.log" \
  || { head -30 "$T/check.log"; echo "ERROR in the translation: build stopped"; exit 1; }
head -8 "$T/check.log"

# 1. stage the runtime files from the Hebrew source. Overwrite in place (OneDrive: files may be open or syncing);
#    never copy .git; the work notes of the Hebrew repo (PROGRESS.md ...) and index_dev.html are not part of the build.
mkdir -p "$AR"
for f in index.html script.js styles.css; do cp -f "$SRC/$f" "$AR/$f"; done
mkdir -p "$AR/assets"
( cd "$SRC/assets" && for d in images fonts app; do [ -d "$d" ] && cp -rf "$d" "$AR/assets/"; done )
mkdir -p "$AR/assets/videos"
# the silent simulation clips (no speech) are shipped as they are; the five narrated videos come from assets-ar
( cd "$SRC/assets/videos" && for f in lab-*.mp4 soil-test.mp4 channels-flow.mp4; do cp -f "$f" "$AR/assets/videos/$f"; done )

# 2. overlay the Arabic media and artwork (same name, same path). A folder starting with "_" holds what a studio
#    delivered under its own names and is not shipped.
if [ -d "assets-ar" ]; then
  for d in assets-ar/*/; do
    case "$(basename "$d")" in _*) continue ;; esac
    [ -d "$d" ] && cp -rf "$d" "$AR/assets/"
  done
fi
echo "arabic assets overlaid: $(find assets-ar -type f ! -name 'README.md' ! -path 'assets-ar/_*' | wc -l)"

# 3. write the Arabic into the code, each string at its own recorded position (no duplicate sweep: it splits
#    sentences; anything left over is listed in IMPORT_REPORT.md and fixed in index-ar-fixes.py).
python "$SK/scripts/apply_xlf.py" --xlf "$T/flood.he-ar.xlf" --root "$AR" \
  --report "$AR/IMPORT_REPORT.md" || echo "  (units were flagged: see IMPORT_REPORT.md)"

# 4. language + stylesheets. styles.css is never touched.
sed -i '2s|<html lang="he" dir="rtl">|<html lang="ar" dir="rtl">|' "$AR/index.html"
grep -q 'style-ar.css' "$AR/index.html" || \
  sed -i 's|<link rel="stylesheet" href="styles.css">|<link rel="stylesheet" href="styles.css">\n<link rel="stylesheet" href="fonts-ar.css">\n<link rel="stylesheet" href="style-ar.css">|' "$AR/index.html"

# 4a. reviewed hand fixes to the markup / script / applets, each with the number of places it must match; a mismatch
#     stops the build (the Hebrew or the translation moved under a fix).
python "$W/index-ar-fixes.py" "$AR/index.html" "$AR/script.js"

# 5. authored Arabic files and the fonts, from here
for f in style-ar.css fonts-ar.css applet-ar.css; do cp -f "$f" "$AR/$f"; done
cp -f fonts/Almarai-*.woff2 "$AR/assets/fonts/"

# 6. mixed-script runs are the signature of a partial replacement; Hebrew letters left in the code are listed
python - "$AR" <<'PYEOF'
import sys, re, html
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
from pathlib import Path
HE = re.compile(r'[\u0590-\u05FF]'); AR = re.compile(r'[\u0600-\u06FF]')
bad, left = [], []
root = Path(sys.argv[1])
files = ['index.html', 'script.js'] + ['assets/app/' + p.name for p in sorted((root / 'assets' / 'app').glob('*.html'))]
for f in files:
    p = root / f
    if not p.exists():
        continue
    s = p.read_text(encoding='utf-8')
    for m in re.finditer(r'>([^<>]+)<', s):
        t = html.unescape(m.group(1)).strip()
        if t and HE.search(t) and AR.search(t) and len(t) < 300:
            bad.append((f, t))
    for m in re.finditer(r'(?:alt|title|aria-label|placeholder)="([^"]*)"', s):
        t = m.group(1).strip()
        if t and HE.search(t) and AR.search(t):
            bad.append((f, t))
    for i, line in enumerate(s.splitlines(), 1):
        if HE.search(line) and not line.lstrip().startswith(('//', '/*', '*', '<!--')):
            left.append((f, i, line.strip()[:110]))
for f, t in bad:
    print('   MIXED SCRIPT  %s  %r' % (f, t[:100]))
print('mixed-script check:', 'FOUND %d' % len(bad) if bad else 'clean')
print('lines with Hebrew letters left in the code: %d' % len(left))
for f, i, t in left[:12]:
    print('   HEBREW  %s:%d  %s' % (f, i, t))
PYEOF

# 7. hand-over documents. README_AR.md and ASSET_LOCALIZATION.md travel with the build workspace (not the repo).
[ -f README_AR.md ] && cp -f README_AR.md "$AR/" || true
[ -f ASSET_LOCALIZATION.md ] && cp -f ASSET_LOCALIZATION.md "$AR/" || true
#    The studio's Word file is regenerated into the workspace (not the build), from the filled XLIFF and the build's own
#    captions: never edited by hand. --reproduce: the videos are re-produced in Arabic. Skipped with a warning if the
#    file is open in Word.
python "$SK/scripts/video_script_docx.py" --xlf "$T/flood.he-ar.xlf" --root "$AR" --src-root "$SRC" \
  --notes "$W/video-notes.json" --reproduce --title "الفيضان المفاجئ — نصّ التعليق الصوتي للفيديوهات" \
  --out "$W/VIDEO_SCRIPT_AR.docx" > /dev/null || echo "WARNING: could not write VIDEO_SCRIPT_AR.docx (is it open in Word?)"

# 8. the reviewer's copy: this build plus the layer of proposed Arabic drawn over the Hebrew painted into the pictures
#    (translation/review-layer.json; stem-lomda-ar-translate: references/review-layer.md), uploaded to the QA system as a
#    folder (no zip, no repo). A separate folder; the clean build above never carries the layer.
if [ -f "$T/review-layer.json" ]; then
  RV="$W/STEM-Flood-AR_REVIEW"
  mkdir -p "$RV"
  rm -f "$RV/review-layer.css" "$RV/review-layer.js"
  ( cd "$AR" && find . -mindepth 1 -maxdepth 1 ! -name .git -exec cp -rf {} "$RV/" \; )
  # review_layer.py finds a screen by '<section class="screen" ... data-screen="N"': screen 1 here may carry
  # 'class="screen active"', so 'active' is taken off for the run and put back.
  sed -i 's|<section class="screen active" data-screen="1"|<section class="screen" data-screen="1"|' "$RV/index.html"
  python "$TR/scripts/review_layer.py" --spec "$T/review-layer.json" --root "$RV"
  sed -i 's|<section class="screen" data-screen="1"|<section class="screen active" data-screen="1"|' "$RV/index.html"
  # the folder is uploaded to the QA system as it is (no zip): the developer notes stay out of it
  rm -f "$RV/IMPORT_REPORT.md" "$RV/README_AR.md" "$RV/ASSET_LOCALIZATION.md"
fi

echo
echo "styles.css unchanged:"; cmp "$SRC/styles.css" "$AR/styles.css" && echo "  IDENTICAL"
node --check "$AR/script.js" && echo "script.js syntax OK"
echo "build: $AR"
