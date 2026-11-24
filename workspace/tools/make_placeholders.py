#!/usr/bin/env python3
"""Silent stand-ins for the Hebrew-voiced media, for the Arabic build that is made before the Arabic videos exist.

    py tools/make_placeholders.py --src he-source --out assets-ar

For every narrated video and every narration recording the Hebrew unit plays, writes a file with the SAME NAME and
the SAME LENGTH that is silent: a video shows the video's poster frame, an audio file is silence. The lomda then
behaves as it does with the real media (play button, captions timed to the cue list, forward arrow at the end, the
speaker button, "אני רוצה לשמוע!") but carries no Hebrew voice.

Files go to <out>/videos and <out>/audio, which rebuild-ar.sh overlays on the build. When the Arabic videos and
recordings arrive, put them in the same folders under the same names (or under the studio's names, with a rename):
they replace the placeholders, and nothing else changes.

Not touched: the silent simulation clips (KEEP / KEEP_PREFIX): channels-flow, soil-test and the nine lab-* clips.
"""
import argparse
import os
import re
import subprocess
import sys

import imageio_ffmpeg

FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
KEEP = {"channels-flow.mp4", "soil-test.mp4"}      # silent simulation clips (no speech): shipped as they are
KEEP_PREFIX = ("lab-",)                            # the nine applet clips of the flood lab: silent, no text


def duration(path):
    p = subprocess.run([FFMPEG, "-i", path], capture_output=True, text=True, encoding="utf-8", errors="replace")
    m = re.search(r"Duration:\s*(\d+):(\d+):(\d+\.\d+)", p.stderr)
    if not m:
        raise SystemExit("cannot read the length of " + path)
    return int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3))


def posters(index_html):
    """-> {video file name: poster path relative to the unit}, from the <video poster=... src=...> pairs."""
    out = {}
    html = open(index_html, encoding="utf-8").read()
    for m in re.finditer(r"<video\b[^>]*>", html):
        tag = m.group(0)
        end = html.find("</video>", m.end())
        chunk = tag + html[m.end(): end if end > 0 else m.end() + 400]
        poster = re.search(r'poster="([^"]+)"', tag)
        src = re.search(r'src="([^"#]+\.mp4)', chunk)
        if poster and src:
            out[os.path.basename(src.group(1))] = poster.group(1)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True)
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    pos = posters(os.path.join(a.src, "index.html"))
    vdir, adir = os.path.join(a.out, "videos"), os.path.join(a.out, "audio")
    os.makedirs(vdir, exist_ok=True)
    os.makedirs(adir, exist_ok=True)
    n = 0
    for f in sorted(os.listdir(os.path.join(a.src, "assets", "videos"))):
        if not f.endswith(".mp4") or f in KEEP or f.startswith(KEEP_PREFIX):
            continue
        src = os.path.join(a.src, "assets", "videos", f)
        d = duration(src)
        poster = os.path.join(a.src, pos[f])
        out = os.path.join(vdir, f)
        subprocess.run([FFMPEG, "-y", "-v", "error", "-loop", "1", "-framerate", "5", "-i", poster,
                        "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo", "-t", "%.3f" % d,
                        "-vf", "scale=1920:1080:force_original_aspect_ratio=decrease,"
                               "pad=1920:1080:(ow-iw)/2:(oh-ih)/2,format=yuv420p",
                        "-c:v", "libx264", "-preset", "veryfast", "-crf", "32", "-tune", "stillimage",
                        "-c:a", "aac", "-b:a", "32k", "-movflags", "+faststart", out], check=True)
        print("video %-22s %6.2f s  poster %-34s -> %d KB" % (f, d, os.path.basename(poster), os.path.getsize(out) // 1024))
        n += 1
    audio_src = os.path.join(a.src, "assets", "audio")
    for f in sorted(os.listdir(audio_src) if os.path.isdir(audio_src) else []):
        if not f.endswith(".mp3"):
            continue
        d = duration(os.path.join(a.src, "assets", "audio", f))
        out = os.path.join(adir, f)
        subprocess.run([FFMPEG, "-y", "-v", "error", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono",
                        "-t", "%.3f" % d, "-c:a", "libmp3lame", "-b:a", "16k", out], check=True)
        print("audio %-22s %6.2f s  -> %d KB" % (f, d, os.path.getsize(out) // 1024))
        n += 1
    print("%d placeholder files in %s" % (n, a.out))


if __name__ == "__main__":
    main()
