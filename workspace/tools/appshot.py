#!/usr/bin/env python3
"""Screenshots of the applets in their states.

    py tools/appshot.py --root STEM-Flood-AR --out qa/app

Screen 4 (rain graph): every step of the explanation. Screen 21 (flood lab): nothing chosen, three choices made, run,
and the end state; the same after "try another combination".
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
    br = pw.chromium.launch(); pg = br.new_page(viewport={"width": 1920, "height": 1080})
    pg.goto("http://127.0.0.1:%d/index.html" % port, wait_until="load"); pg.wait_for_timeout(500)
    # screen 4: the rain graph, step by step
    pg.evaluate(L.GOTO, 4); pg.wait_for_timeout(4000)
    fr = [f for f in pg.frames if "rain-graph" in f.url][0]
    for i in range(1, 9):
        pg.screenshot(path=os.path.join(a.out, "s04-%d.png" % i))
        btns = fr.locator("button:visible")
        names = [btns.nth(k).inner_text()[:20] for k in range(btns.count())]
        print("s4 step", i, names)
        try:
            fr.get_by_role("button", name="التالي").first.click(timeout=1500)
        except Exception as e:
            try:
                btns.first.click(timeout=1000)
            except Exception:
                break
        pg.wait_for_timeout(1800)
    # screen 21: the flood lab
    pg.evaluate(L.GOTO, 21); pg.wait_for_timeout(4000)
    fr = [f for f in pg.frames if "flood-lab" in f.url][0]
    pg.screenshot(path=os.path.join(a.out, "s21-1.png"))
    for val in ["strong", "clay", "wide"]:
        try:
            fr.locator('button.opt[data-val="%s"]' % val).click(timeout=2000)
        except Exception as e:
            print("click failed", val, str(e)[:80])
    pg.wait_for_timeout(600); pg.screenshot(path=os.path.join(a.out, "s21-2.png"))
    try:
        fr.locator("#run").click(timeout=2000)
    except Exception as e:
        print("run failed", str(e)[:80])
    pg.wait_for_timeout(2500); pg.screenshot(path=os.path.join(a.out, "s21-3.png"))
    pg.wait_for_timeout(9000); pg.screenshot(path=os.path.join(a.out, "s21-4.png"))
    br.close()
