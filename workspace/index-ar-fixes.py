#!/usr/bin/env python3
"""Reviewed hand fixes to the Arabic build, run by rebuild-ar.sh after the import.

    python index-ar-fixes.py <build>/index.html <build>/script.js

Each fix states how many places it must match; a different count stops the build (the Hebrew or the translation
moved under it, and that needs looking at).
"""
import os
import sys

APPLETS = ["channels-demo", "flood-lab", "rain-graph", "soil-test"]

# (file key, old, new, expected count). Keys: html, js, or an applet name.
FIXES = [
    # Q5 cloze: the Hebrew text keeps a Latin comma between a blank and the line break (',<br>' after blanks 4 and 5);
    # it is made the Arabic comma. The comma is a text node outside every translation unit.
    ("html", '</span>,<br>', '</span>،<br>', 2),
    # Screen 9 narration: the Hebrew breaks its first sentences into short lines; the Arabic bubble is wider and lets them
    # flow, so the text is three lines (the break before the bold sentence stays). Round 3, 2026-11-24.
    ("html", 'بزيادة<br>أحداث', 'بزيادة أحداث', 1),
    ("html", 'فقط<br>فيضانات', 'فقط فيضانات', 1),
]
for a in APPLETS:
    # the applet is a separate document: Arabic language, then the Arabic typeface and line-height AFTER its own
    # inline @font-face (which re-declares Assistant): the later declaration wins.
    FIXES.append((a, '<html lang="he" dir="rtl">', '<html lang="ar" dir="rtl">', 1))
    FIXES.append((a, '</head>', '<link rel="stylesheet" href="../../fonts-ar.css">\n<link rel="stylesheet" href="../../applet-ar.css">\n</head>', 1))


def main():
    html_path, js_path = sys.argv[1], sys.argv[2]
    app_dir = os.path.join(os.path.dirname(html_path), "assets", "app")
    files = {"html": [html_path, open(html_path, encoding="utf-8").read()],
             "js": [js_path, open(js_path, encoding="utf-8").read()]}
    for a in APPLETS:
        p = os.path.join(app_dir, a + ".html")
        files[a] = [p, open(p, encoding="utf-8").read()]
    for key, old, new, n in FIXES:
        have = files[key][1].count(old)
        if have != n:
            sys.exit("FIX does not match %d place(s), found %d (%s): %r" % (n, have, key, old[:60]))
        files[key][1] = files[key][1].replace(old, new)
    for path, text in files.values():
        open(path, "w", encoding="utf-8", newline="").write(text)
    print("index-ar-fixes: %d fix(es) applied" % len(FIXES))


if __name__ == "__main__":
    main()
