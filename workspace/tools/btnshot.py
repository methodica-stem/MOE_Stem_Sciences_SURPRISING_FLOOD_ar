#!/usr/bin/env python3
"""Screens with their check button (and the finish button) forced visible, to see the words inside the skins.

    py tools/btnshot.py --root STEM-Flood-AR --out qa/btn [--screens 5,8,13,18,22,24,25,26,27]
"""
import argparse, os, sys
sys.path.insert(0, os.path.expanduser("~/.claude/skills/lomda-he-to-ar/scripts"))
import layout_qa as L
from playwright.sync_api import sync_playwright

ap = argparse.ArgumentParser()
ap.add_argument("--root", required=True); ap.add_argument("--out", required=True)
ap.add_argument("--screens", default="5,8,13,18,22,24,25,26,27")
a = ap.parse_args()
os.makedirs(a.out, exist_ok=True)
port = L.free_port(); L.serve(os.path.abspath(a.root), port)
with sync_playwright() as pw:
    br = pw.chromium.launch()
    pg = br.new_page(viewport={"width": 1920, "height": 1080})
    pg.goto("http://127.0.0.1:%d/index.html" % port, wait_until="load"); pg.wait_for_timeout(500)
    for n in [int(x) for x in a.screens.split(",")]:
        pg.evaluate(L.GOTO, n); pg.wait_for_timeout(4200)
        pg.evaluate("document.querySelectorAll('.btn-check').forEach(b => b.disabled = false)")
        pg.wait_for_timeout(300)
        pg.screenshot(path=os.path.join(a.out, "b%02d.png" % n))
        print("screen", n)
    br.close()
