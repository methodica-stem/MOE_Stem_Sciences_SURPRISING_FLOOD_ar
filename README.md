# השיטפון המפתיע (STEM_Flood): Arabic version

The Arabic build of the lomda (الفيضان المفاجئ), **without the narrated videos**: `assets/videos` holds silent placeholder files of
the original length for the five narrated videos (the poster frame for the whole length); the Arabic videos are produced after the
text is approved and go in under the same names. The nine silent simulation clips (`lab-*.mp4`, `soil-test.mp4`, `channels-flow.mp4`)
are the Hebrew ones: no speech; two of them have Hebrew signs painted in.

- Hebrew source: the work repo `flood` at commit `eec6118` (delivery copy: `STEM_surprisingFlood_HE`).
- `index.html`, `script.js` and `styles.css` come from the Hebrew lomda; `styles.css` is identical to the Hebrew. The Arabic is written
  into `index.html`, `script.js` and the applets in `assets/app/`; `style-ar.css`, `applet-ar.css` and `fonts-ar.css` (Almarai) adapt the layout to Arabic.
- Text painted into the pictures and videos, and what is still Hebrew there (including the Ministry logo): `ASSET_LOCALIZATION.md`.
- This repo is **generated** from the translation master by the Arabic workspace (`rebuild-ar.sh`). Do not edit the files here: correct the
  translation or the style files in the workspace and rebuild.
