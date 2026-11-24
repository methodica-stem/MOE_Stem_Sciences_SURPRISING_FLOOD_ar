#!/usr/bin/env python3
"""Screenshots of the finished screens (after the float-in reveals), one PNG per screen.

    py tools/shoot.py --root STEM-Recycle-and-build-AR --out qa/shots-final [--screens 1-20] [--wait 7000]
                      [--sheet qa/sheet]      also write contact sheets (6 per sheet)

Navigation uses the shared GOTO of lomda-he-to-ar's layout_qa (it checks that the asked screen is the one shown).
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.expanduser("~/.claude/skills/lomda-he-to-ar/scripts"))
import layout_qa as L
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw


def parse(spec):
    out = []
    for part in spec.split(","):
        if "-" in part:
            a, b = part.split("-")
            out += list(range(int(a), int(b) + 1))
        else:
            out.append(int(part))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--screens", default="1-20")
    ap.add_argument("--wait", type=int, default=7000)
    ap.add_argument("--sheet")
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    port = L.free_port()
    L.serve(os.path.abspath(a.root), port)
    files = []
    with sync_playwright() as pw:
        br = pw.chromium.launch()
        pg = br.new_page(viewport={"width": 1920, "height": 1080})
        pg.goto("http://127.0.0.1:%d/index.html" % port, wait_until="load")
        pg.wait_for_timeout(800)
        for n in parse(a.screens):
            how = pg.evaluate(L.GOTO, n)
            pg.wait_for_timeout(a.wait)
            f = os.path.join(a.out, "s%02d.png" % n)
            pg.screenshot(path=f)
            files.append(f)
            print("screen", n, how)
        br.close()
    if a.sheet:
        W, H = 960, 540
        for si in range(0, len(files), 6):
            sh = Image.new("RGB", (W * 2, H * 3), (0, 0, 0))
            for i, f in enumerate(files[si:si + 6]):
                im = Image.open(f).convert("RGB").resize((W, H))
                d = ImageDraw.Draw(im)
                d.rectangle([0, 0, 60, 22], fill=(0, 0, 0))
                d.text((6, 5), os.path.basename(f)[:3], fill=(255, 255, 0))
                sh.paste(im, ((i % 2) * W, (i // 2) * H))
            sh.save("%s%d.jpg" % (a.sheet, si // 6 + 1), quality=85)


if __name__ == "__main__":
    main()
