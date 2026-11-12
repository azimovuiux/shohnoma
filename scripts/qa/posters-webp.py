"""python3 scripts/qa/posters-webp.py <slug> — scripts/qa/out/*.png → public/templates/*.webp"""
import glob, os, sys
from PIL import Image
slug = sys.argv[1]
here = os.path.dirname(os.path.abspath(__file__))
dst = os.path.join(here, "..", "..", "public", "templates")
for f in sorted(glob.glob(os.path.join(here, "out", f"{slug}*.png"))):
    n = os.path.basename(f)[:-4]
    im = Image.open(f).convert("RGB")
    if n.endswith("-long"):
        w = 300 if "-phone" in n else 960
        im, q = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS), 64
    else:
        im, q = im.resize((600, 1300) if "-phone" in n else (1280, 800), Image.LANCZOS), 82
    im.save(os.path.join(dst, n + ".webp"), "WEBP", quality=q, method=6)
    print(n, im.size)
