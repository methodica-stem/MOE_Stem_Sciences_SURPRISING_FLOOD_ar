# השיטפון המפתיע (STEM_Flood) — Hebrew painted into artwork and video, with proposed Arabic

Everything in the "Proposed Arabic" columns is **Claude's proposal** (marked "اقتراح" in the review version), for the Arabic
reviewer to confirm or change. Nothing is redrawn: the clean build `STEM-Flood-AR` still shows the Hebrew in these pictures
until the designer / the video producer redo them from what the reviewer approves. In `STEM-Flood-AR_REVIEW` the proposals are
drawn over the pictures and clips.

## Pictures and clips that show Hebrew on a screen (in the review version)

| File | Screen | Hebrew painted in | Proposed Arabic | Who redoes it |
|---|---|---|---|---|
| `q3-frame.jpg` (the soil result picture; flat light-grey ground) | 13 (Q3) | 4 headings: קרקע חרסיתית 100% חרסית / 25% חול 75% חרסית / 50% חול 50% חרסית / קרקע חולית 100% | تربة طينيّة 100% طين / 25% رمل 75% طين / 50% رمل 50% طين / تربة رمليّة 100% | designer (a flat board: could be redrawn with `bake_picture.py` once approved) |
| | | 4 amounts: 30 / 100 / 250 / 480 סמ״ק | 30 / 100 / 250 / 480 سم مكعّب (units spelled out, as decided for the series) | same |
| `soil-test-poster.jpg` and the clip `soil-test.mp4` (20 s, silent) | 12 (soil simulation) | the same 4 headings, top of the picture, static in the clip | the same 4 Arabic headings | video producer (clip) and designer (poster). The clip is NOT replaced in the Arabic build: it is the simulation itself and has no speech |
| `channels-flow-poster.jpg`, `channels-demo-card.png` and the clip `channels-flow.mp4` (8.7 s, silent) | 17 (three channels) | 3 signs: ערוץ צר / ערוץ בינוני / ערוץ רחב | مجرى ضيّق / مجرى متوسّط / مجرى واسع | video producer (clip) and designer (the two pictures). Not replaced in the Arabic build either |
| `q4-frame.jpg` (also in the zoom window of screen 18, which has no proposal layer) | 18 (Q4) | the same 3 signs | the same 3 Arabic signs | designer |
| `video-test-poster.jpg`, `video-scientists-poster.jpg` (posters; the same board title is in the videos `video-test.mp4`, `video-scientists.mp4`, and in `video-intro.mp4` from 0:00 to about 0:17) | 10, 23 (and 2, inside the video) | the handwritten board title: טיול לרכס בוקר שבהר הנגב | رحلة إلى سلسلة بوكير في مرتفعات النقب (place names to be confirmed) | designer (posters) and video producer (the three videos) |
| `video-flow-poster.jpg` (and the video `video-flow.mp4`, all through the first part) | 20 | two map labels on the board picture: אזור גבוה (upper left) and אזור נמוך (lower right) | منطقة مرتفعة / منطقة منخفضة | designer (poster) and video producer |
| `finish-bg.jpg` (the school gate; the first word "בית" is under the banner) | 27 | the school sign: בית ספר נאות המדבר | مدرسة واحة الصحراء (school name translated as "واحة الصحراء"; to be confirmed) | designer (a painting with perspective lettering: not for `bake_picture.py`) |

## Not changed, and why

| File | Where | What | Note |
|---|---|---|---|
| `logo-moe.png` | 1 | the Ministry of Education lockup: משרד החינוך / מינהל חדשנות וטכנולוגיה (Hebrew letters in the picture; its alt text is Arabic) | needs the **official Arabic logo of the Ministry** from the Ministry, not a translation. Blocking for delivery. |
| wall posters in the classroom pictures (`bg-board.jpg`, `bg-question.jpg`, the posters in the videos): a map of Israel, pictures of flowers | most screens | too small to read at the stage size (a map of Israel with Hebrew place names at about 10 px) | the designer's call; the Hebrew notes say the map has Hebrew labels on purpose |
| `moodle-logo-white.svg`, `diagram-art.png`, the pictures of the students and the teacher | 28, 7, 9 ... | no Hebrew (the diagram labels are live text) | — |
| the nine clips `lab-*.mp4` (flood lab results, 10-15 s) | 21 | no text; they carry an audio track that was not listened to (no speech expected: simulation clips) | kept as they are; please listen once |

## Narrated videos (re-produced in Arabic: silent placeholders in the build)

`video-intro.mp4` (64.8 s, screen 2), `video-model.mp4` (18.1 s, 6), `video-test.mp4` (7.9 s, 10), `video-flow.mp4` (36.9 s, 20),
`video-scientists.mp4` (10.6 s, 23). The build ships silent same-length files (the poster frame for the whole length), made by
`tools/make_placeholders.py`; the Hebrew voices are never copied into the build. The captions are live Arabic text timed to the
Hebrew cut for now. When the Arabic videos arrive: same folder and name (`assets-ar/videos`), re-time the captions
(`retime_captions.py` of lomda-he-to-ar), rebuild. The text for the studio, with the Hebrew beside it, is `VIDEO_SCRIPT_AR.docx`
(speakers are inferred, not listened to: confirm). There are no audio files outside the videos (the Hebrew build has no `assets/audio`).

## Names and terms chosen by Claude (for the Arabic reviewer and the content owner to confirm)

- **שיטפון** = **فيضان مفاجئ** (flash flood; glossary entry still marked PROPOSED), title: **الفيضان المفاجئ**. Alternative: سيل.
- **נחל** = **واد** (plural أودية); **ערוץ** = **مجرى**; **תעלה** = **قناة**; **קרקע** = **تربة**; **חרסית** = **طين**; **חלחול** = **تسرّب**.
- **מגמה** = **منحى** (trend), **גרף** = **رسم بيانيّ** (a bar graph: the glossary خطّ بيانيّ is for line graphs), **שילוב** = **توليفة**,
  **בסיס** (base year) = **الأساس**, **השירות המטאורולוגי** = **دائرة الأرصاد الجويّة**, **לומדה** = **الوحدة التعليميّة**.
- **חלמונית** (the flower) is only **transliterated** (الحلمونيّة): no established Arabic name known. The popup explains the name
  through the egg yolk; the reviewer should give the Arabic name or accept the transliteration.
- Students: נועה = نور, עומר = عمر, אדם = آدم, איה = آية, תומר = تامر. School "נאות המדבר" = "واحة الصحراء". Places:
  רכס בוקר = سلسلة بوكير, הר הנגב = مرتفعات النقب, נחל דרגה = وادي درغا, נחל צפית = وادي تسافيت, מדבר יהודה = صحراء يهودا.
- The heart picture in "שימו ♥:" (screen 11) is hidden: the pun on לב does not exist in Arabic; the word is انتبهوا.
