#!/usr/bin/env python3
"""Bounding boxes (stage pixels, 1920x1080) of the elements matching CSS selectors on one screen.

    py tools/measure.py --root STEM-Flood-AR --screen 15 --sel ".ch-plate,.ch-card,.ch-credit,.ch-zoom-l"
    py tools/measure.py --root STEM-Flood-AR --screen 2 --sel ".term,.term-tip" --hover ".term"
"""
import argparse, os, sys, json
sys.path.insert(0, os.path.expanduser("~/.claude/skills/lomda-he-to-ar/scripts"))
import layout_qa as L
from playwright.sync_api import sync_playwright

ap = argparse.ArgumentParser()
ap.add_argument("--root", required=True); ap.add_argument("--screen", type=int, required=True)
ap.add_argument("--sel", required=True); ap.add_argument("--hover", default="")
ap.add_argument("--shot", default="")
a = ap.parse_args()
port = L.free_port(); L.serve(os.path.abspath(a.root), port)
JS = """(sels) => {
  const st = document.querySelector('.screen.is-active, .screen.active, .screen:not([hidden])') || document.body;
  const out = [];
  for (const s of sels) for (const el of document.querySelectorAll(s)) {
    const r = el.getBoundingClientRect();
    if (!r.width && !r.height) continue;
    out.push({sel: s, cls: el.className && el.className.baseVal === undefined ? el.className : '', text: (el.textContent||'').trim().slice(0,30),
              x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height),
              cx: Math.round(r.left + r.width/2), r: Math.round(r.right), b: Math.round(r.bottom)});
  }
  return out;
}"""
with sync_playwright() as pw:
    br = pw.chromium.launch()
    pg = br.new_page(viewport={"width": 1920, "height": 1080})
    pg.goto("http://127.0.0.1:%d/index.html" % port, wait_until="load"); pg.wait_for_timeout(500)
    pg.evaluate(L.GOTO, a.screen); pg.wait_for_timeout(4200)
    if a.hover:
        pg.hover(a.hover); pg.wait_for_timeout(500)
    for o in pg.evaluate(JS, a.sel.split(",")):
        print(json.dumps(o))
    if a.shot:
        pg.screenshot(path=a.shot)
    br.close()
