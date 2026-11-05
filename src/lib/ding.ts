/** Yangi xabar ovozi — fayl kerak emas (Web Audio). Brauzer foydalanuvchi sahifaga bosgandan keyingina ovoz chiqaradi. */
let ctx: AudioContext | null = null;
let last = 0;

export function ding() {
  if (typeof window === "undefined") return;
  const now = Date.now();
  if (now - last < 800) return; // ketma-ket xabarlarda bir marta
  last = now;
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx ??= new AC();
    if (ctx.state === "suspended") void ctx.resume();
    const t = ctx.currentTime;
    // ikki notali yumshoq "ding-dong": 880 Hz → 1320 Hz
    [
      [880, 0],
      [1320, 0.12],
    ].forEach(([f, d]) => {
      const o = ctx!.createOscillator();
      const g = ctx!.createGain();
      o.type = "sine";
      o.frequency.value = f;
      g.gain.setValueAtTime(0, t + d);
      g.gain.linearRampToValueAtTime(0.18, t + d + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.45);
      o.connect(g).connect(ctx!.destination);
      o.start(t + d);
      o.stop(t + d + 0.5);
    });
  } catch {
    /* ovoz chiqmasa — jim */
  }
}

/** Birinchi bosishda audio kontekstni "uyg‘otib" qo‘yish (iOS/Safari uchun) */
export function primeAudio() {
  if (typeof window === "undefined") return;
  const h = () => {
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx ??= new AC();
      void ctx.resume();
    } catch {
      /* */
    }
    window.removeEventListener("pointerdown", h);
  };
  window.addEventListener("pointerdown", h, { once: true });
}
