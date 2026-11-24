# השיטפון המפתיע (STEM_Flood) — Arabic workspace

`STEM-Flood-AR` is **generated** by `rebuild-ar.sh` from the pinned Hebrew source and the Arabic translation. Never edit the
build: every edit goes in one of the masters below, then `bash rebuild-ar.sh` (about 30 s).

Status 2026-11-24: first Arabic build, **without the narrated videos**. 492 of 492 strings placed (489 exact, 3 with `{n}`),
0 flagged, `styles.css` identical to the Hebrew, no Hebrew left on screen except the artwork listed in `ASSET_LOCALIZATION.md`.
Translated with the `stem-lomda-ar-translate` skill (ERROR 0, 15 CHECKs all explained in the notes, teacher read), built with
`lomda-he-to-ar`. Waiting for: the Arabic reviewer, the Ministry's Arabic logo, the designer's pictures, the Arabic videos.

| Path | What |
|---|---|
| `he-source/` | The Hebrew lomda at commit `eec6118` of the work repo `flood` (`he-source.txt`). Read-only. It still holds the Hebrew work notes; the build leaves them out. |
| `translation/flood_he.xlf` | Hebrew XLIFF (492 units, `export_xliff.py`, prefix FLOOD). |
| `translation/translations.json` | **The Arabic.** Single source of truth: by_source / by_id / notes. Reviewer corrections go here. |
| `translation/translations.seed.json` | 36 strings of chrome and feedback furniture from Recycle, Drone grid and Chem volume. |
| `translation/brief.md`, `project-rules.json` | Unit brief (names, terms); the terms enforced by the check. |
| `translation/flood.he-ar.xlf`, `review.xlsx`, `check.log` | Generated. |
| `translation/teacher-read.md`, `teacher-changes.md` | The teacher read and the units it changed. |
| `translation/review-layer.json` | Proposed Arabic over the Hebrew painted into pictures (review version only). |
| `style-ar.css`, `fonts-ar.css`, `applet-ar.css`, `index-ar-fixes.py` | Authored masters copied into the build (Almarai in `fonts/`). |
| `assets-ar/videos` | Silent same-length placeholders of the five narrated videos. |
| `tools/` | `make_placeholders.py`, `shoot.py` (screenshots), `fbshot.py` (feedback states), `appshot.py` (applet steps), `states.py` (pop-ups), `find_boxes.py`. |
| `VIDEO_SCRIPT_AR.docx` | Word file for the studio. Regenerated, never edited. |
| `ASSET_LOCALIZATION.md` | Hebrew painted into artwork and video, proposed Arabic, names and terms to confirm. |
| `STEM-Flood-AR_REVIEW` | The review version for the QA system (a folder, no zip): the clean build plus the proposals over the pictures. |
| `qa/` | QA outputs. |

Hebrew repo: `...\STEM\STEM מדעים\_יסודי_\השיטפון המפתיע - כיתה ה\הפקה\Source Code\flood` (work repo; `origin` =
methodica-stem/STEM_surprisingFlood_HE, not yet on GitHub). To move to a newer Hebrew commit see `he-source.txt`.
