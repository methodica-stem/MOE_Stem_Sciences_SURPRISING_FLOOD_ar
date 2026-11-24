#!/usr/bin/env python3
"""Feedback states of the single-choice and multiple-choice questions, as screenshots (retry, final wrong, correct).

    py tools/fbshot.py --root STEM-Flood-AR --out qa/fb --screens 5,8,13,18,25,26 [--sheet qa/fb-sheet.jpg]

Picks wrong answers (and, for the correct state, the answers marked data-correct), presses the check button and shoots
after each press. Screens 22 (fill the blanks) and 24 (order the steps) are drag questions: shot by hand.
"""
import argparse, os, sys
sys.path.insert(0, os.path.expanduser("~/.claude/skills/lomda-he-to-ar/scripts"))
import layout_qa as L
from playwright.sync_api import sync_playwright
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument("--root", required=True); ap.add_argument("--out", required=True)
ap.add_argument("--screens", default="5,8,13,18,25,26"); ap.add_argument("--sheet")
a = ap.parse_args()
os.makedirs(a.out, exist_ok=True)
port = L.free_port(); L.serve(os.path.abspath(a.root), port)
files = []
with sync_playwright() as pw:
    br = pw.chromium.launch()
    for n in [int(x) for x in a.screens.split(",")]:
        pg = br.new_page(viewport={"width": 1920, "height": 1080})
        pg.goto("http://127.0.0.1:%d/index.html" % port, wait_until="load"); pg.wait_for_timeout(500)
        pg.evaluate(L.GOTO, n); pg.wait_for_timeout(4500)
        sc = pg.locator('.screen[data-screen="%d"]' % n)
        opts = sc.locator(".q-opt")
        wrong = [i for i in range(opts.count()) if opts.nth(i).get_attribute("data-correct") is None]
        right = [i for i in range(opts.count()) if opts.nth(i).get_attribute("data-correct") is not None]
        multi = opts.nth(0).get_attribute("data-multi") is not None
        def shoot(tag):
            f = os.path.join(a.out, "s%02d-%s.png" % (n, tag)); pg.screenshot(path=f); files.append(f)
        def check():
            sc.locator(".btn-check").click(timeout=3000); pg.wait_for_timeout(700)
        if multi:
            opts.nth(wrong[0]).click(); check(); shoot("1retry")
            # second try: a wrong one plus one right -> partial hint or final
            opts.nth(right[0]).click(); check(); shoot("2next")
        else:
            opts.nth(wrong[0]).click(); check(); shoot("1retry")
            opts.nth(wrong[1]).click(); check(); shoot("2final-wrong")
        pg.close()
        pg = br.new_page(viewport={"width": 1920, "height": 1080})
        pg.goto("http://127.0.0.1:%d/index.html" % port, wait_until="load"); pg.wait_for_timeout(500)
        pg.evaluate(L.GOTO, n); pg.wait_for_timeout(4500)
        sc = pg.locator('.screen[data-screen="%d"]' % n); opts = sc.locator(".q-opt")
        for i in right:
            opts.nth(i).click()
        sc.locator(".btn-check").click(timeout=3000); pg.wait_for_timeout(700)
        f = os.path.join(a.out, "s%02d-3correct.png" % n); pg.screenshot(path=f); files.append(f)
        pg.close()
        print("screen", n, "ok")
    br.close()
if a.sheet:
    W, H = 960, 540
    cols = 2
    rows = (len(files) + 1) // 2
    sh = Image.new("RGB", (W * cols, H * rows), (0, 0, 0))
    for i, f in enumerate(files):
        sh.paste(Image.open(f).convert("RGB").resize((W, H)), ((i % cols) * W, (i // cols) * H))
    sh.save(a.sheet, quality=85)
