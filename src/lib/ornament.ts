/** 8 burchakli yulduz (girih) konturi — spec §4.6 */
export function star8Path(cx: number, cy: number, r: number, inner = 0.72) {
  let d = "";
  for (let i = 0; i < 16; i++) {
    const a = (Math.PI / 8) * i - Math.PI / 2;
    const rr = i % 2 ? r * inner : r;
    d += `${i ? "L" : "M"}${(cx + rr * Math.cos(a)).toFixed(1)} ${(cy + rr * Math.sin(a)).toFixed(1)} `;
  }
  return d + "Z";
}
