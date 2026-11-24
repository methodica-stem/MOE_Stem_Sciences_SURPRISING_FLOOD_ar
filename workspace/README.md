# Workspace: how to continue the Arabic Flood lomda

The files at the **repo root** are generated. Do not edit them. Everything that makes them is in this folder.

## What is here

| Path | What it is |
|---|---|
| `translation/translations.json` | The Arabic text, one entry per Hebrew string (the master). Corrections go here. |
| `translation/translations.seed.json`, `brief.md`, `project-rules.json` | Wording shipped earlier, the translation brief, project-specific term rules |
| `translation/flood_he.xlf`, `flood.he-ar.xlf` | The Hebrew export (492 units) and the filled Arabic file (generated) |
| `translation/review-layer.json` | Which screens get proposed Arabic drawn over the Hebrew painted in pictures (review copy only) |
| `style-ar.css`, `applet-ar.css`, `fonts-ar.css`, `fonts/` | Layout changes for Arabic and the Almarai font |
| `index-ar-fixes.py` | Hand fixes to the page and applets; each has the number of places it must match |
| `assets-ar/videos/` | Silent placeholders for the five narrated videos. Replace them with the Arabic videos under the same names |
| `video-notes.json`, `VIDEO_SCRIPT_AR.docx` | Notes for the video script, and the Word script for the studio (generated) |
| `ASSET_LOCALIZATION.md` | Hebrew painted into pictures and videos, and what to redraw |
| `README_AR.md`, `he-source.txt` | Build notes; which Hebrew commit this is built from (`eec6118`) |
| `rebuild-ar.sh` | Rebuilds everything |
| `sync-to-root.sh` | Puts the review or the final build at the repo root |
| `tools/` | Screenshot helpers used for layout checks |

## What you need

- Git Bash (Windows), Python 3, Node (for a syntax check).
- Two skills, in `~/.claude/skills/`: `stem-lomda-ar-translate` and `lomda-he-to-ar` (set `SKILLS_DIR` if they are elsewhere).
- The Hebrew source in `workspace/he-source/` (not stored here, it is 115 MB): see `he-source.txt`.

## Change something and publish

1. Edit the master: the text in `translation/translations.json`, the layout in `style-ar.css`, `applet-ar.css` or `index-ar-fixes.py`, media in `assets-ar/`.
2. `bash workspace/rebuild-ar.sh` builds `workspace/STEM-Flood-AR` (clean) and `workspace/STEM-Flood-AR_REVIEW` (with proposals). It stops on a translation error.
3. `bash workspace/sync-to-root.sh review` (during review) or `final` (once approved) copies that build to the repo root.
4. Commit and push. The QA system reads the repo root.

## State

Review round of the first draft (2026-11-24). Final content replaces the root with `sync-to-root.sh final` after approval,
the artwork redraws and the Arabic videos.
