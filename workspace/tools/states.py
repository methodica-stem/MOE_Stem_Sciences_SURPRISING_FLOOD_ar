#!/usr/bin/env python3
"""Pop-ups and overlays of the Flood build: the two term tips (screens 2 and 3), the reopened diagram (8), the zoomed
graph (5), the five student bubbles (9) and a final feedback of screens 25/26.

    py tools/states.py --root STEM-Flood-AR --out qa/states
"""
import argparse, os, sys
sys.path.insert(0, os.path.expanduser("~/.claude/skills/lomda-he-to-ar/scripts"))
import layout_qa as L
from playwright.sync_api import sync_playwright

ap = argparse.ArgumentParser()
ap.add_argument("--root", required=True); ap.add_argument("--out", required=True)
a = ap.parse_args()
os.makedirs(a.out, exist_ok=True)
port = L.free_port(); L.serve(os.path.abspath(a.root), port)
with sync_playwright() as pw:
    br = pw.chromium.launch()
    def page(n):
        pg = br.new_page(viewport={"width": 1920, "height": 1080})
        pg.goto("http://127.0.0.1:%d/index.html" % port, wait_until="load"); pg.wait_for_timeout(500)
        pg.evaluate(L.GOTO, n); pg.wait_for_timeout(4000)
        return pg
    for n in (2, 3):
        pg = page(n)
        t = pg.locator('.screen[data-screen="%d"] .term' % n).first
        t.hover(); pg.wait_for_timeout(700); pg.screenshot(path=os.path.join(a.out, "tip%02d.png" % n)); pg.close()
    pg = page(8)
    pg.locator('.screen[data-screen="8"] .reopen-btn').click(); pg.wait_for_timeout(900)
    pg.screenshot(path=os.path.join(a.out, "reopen08.png")); pg.close()
    pg = page(5)
    pg.locator('.screen[data-screen="5"] .zoom-btn').first.click(); pg.wait_for_timeout(900)
    pg.screenshot(path=os.path.join(a.out, "zoom05.png")); pg.close()
    pg = page(9)
    tiles = pg.locator('.screen[data-screen="9"] .tile')
    tiles.nth(0).click(); pg.wait_for_timeout(500); tiles.nth(3).click(); pg.wait_for_timeout(700)
    pg.screenshot(path=os.path.join(a.out, "tiles09.png")); pg.close()
    for n in (25, 26):
        pg = page(n)
        sc = pg.locator('.screen[data-screen="%d"]' % n); opts = sc.locator(".q-opt")
        right = [i for i in range(opts.count()) if opts.nth(i).get_attribute("data-correct") is not None]
        for i in right:
            opts.nth(i).click()
        sc.locator(".btn-check").click(); pg.wait_for_timeout(800)
        pg.screenshot(path=os.path.join(a.out, "fb%02d.png" % n)); pg.close()
    br.close()
