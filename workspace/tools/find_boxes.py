#!/usr/bin/env python3
"""Bounding boxes of dark (or light) ink groups inside a region of a stage screenshot (1920x1080), to read the place of
Hebrew painted into a picture without a grid: py tools/find_boxes.py shot.png x0 y0 x1 y1 [--light] [--thresh 100] [--gap 25]"""
import argparse
import numpy as np
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument("image")
ap.add_argument("region", nargs=4, type=int)
ap.add_argument("--light", action="store_true")
ap.add_argument("--thresh", type=int, default=100)
ap.add_argument("--gap", type=int, default=25)
a = ap.parse_args()
im = np.array(Image.open(a.image).convert("RGB")).astype(int)
x0, y0, x1, y1 = a.region
lum = im[y0:y1, x0:x1].mean(axis=2)
mask = lum > a.thresh if a.light else lum < a.thresh
cols = np.where(mask.any(axis=0))[0]
if len(cols) == 0:
    raise SystemExit("no ink")
groups, start, prev = [], cols[0], cols[0]
for c in cols[1:]:
    if c - prev > a.gap:
        groups.append((start, prev)); start = c
    prev = c
groups.append((start, prev))
for s, e in groups:
    rows = np.where(mask[:, s:e + 1].any(axis=1))[0]
    print("x %d-%d  y %d-%d   [x, y, w, h] = [%d, %d, %d, %d]" % (x0 + s, x0 + e, y0 + rows.min(), y0 + rows.max(),
          x0 + s, y0 + rows.min(), e - s + 1, rows.max() - rows.min() + 1))
