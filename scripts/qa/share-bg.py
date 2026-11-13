"""
Ulashish kartasi foni: scripts/qa/out/share-<slug>-{a,b}.png → public/templates/<slug>/share-bg.webp (1080×1440).
Surat o‘rni bo‘lgan shablonlarda a (qora surat) va b (oq surat) kadrlaridan alfa hisoblanadi:
  alpha = 1 − (b − a) / 255, rang = a / alpha  → surat ko‘rinadigan joy shaffof (kartada surat fon ostida chiziladi).
Ishlatish: python3 scripts/qa/share-bg.py [slug ...]   (oldin: node scripts/qa/share-bg.cjs)
"""
import json, sys
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent / "out"
ALL = "anor zumrad parvoz shato savsan muhr kalit sayohat lino kumush riviera".split()

for slug in sys.argv[1:] or ALL:
    a = Image.open(OUT / f"share-{slug}-a.png").convert("RGB")
    b_path = OUT / f"share-{slug}-b.png"
    if b_path.exists():
        A = np.asarray(a).astype(np.float32)
        B = np.asarray(Image.open(b_path).convert("RGB")).astype(np.float32)
        alpha = 1.0 - np.clip((B - A).mean(axis=2) / 255.0, 0, 1)
        alpha[alpha < 0.02] = 0
        rgb = np.where(alpha[..., None] > 0, A / np.maximum(alpha[..., None], 1e-3), 0)
        img = Image.fromarray(np.dstack([np.clip(rgb, 0, 255), alpha * 255]).astype(np.uint8), "RGBA")
    else:
        img = a
    img = img.resize((1080, 1440), Image.LANCZOS)
    dst = ROOT / "public" / "templates" / slug / "share-bg.webp"
    img.save(dst, "WEBP", quality=80, method=6)
    meta = json.loads((OUT / f"share-{slug}.json").read_text())
    ph = meta.get("photo")
    s = meta.get("scale", 2)
    info = f"photo cx={ph['cx']*s:.0f} cy={ph['cy']*s:.0f} w={ph['w']*s:.0f} h={ph['h']*s:.0f} rot={ph['rot']} pos={ph['pos']} filter={ph['filter']}" if ph else ""
    print(f"{slug}: {dst.stat().st_size // 1024} KB {img.mode} {info}")
