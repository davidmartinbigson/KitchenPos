"use client";

/**
 * Tiny order-alert chime — generated with Web Audio (no audio file to host).
 * Browsers block audio until the user has interacted with the page at least
 * once, so the AudioContext is created lazily on the first pointerdown.
 */

let ctx: AudioContext | null = null;
let armed = false;

function ensureContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) {
    try {
      ctx = new AC();
    } catch {
      return null;
    }
  }
  return ctx;
}

/** Call once on mount — unlocks audio on the user's first tap/click. */
export function armOrderSound() {
  if (armed || typeof window === "undefined") return;
  armed = true;
  const unlock = () => {
    const c = ensureContext();
    if (c?.state === "suspended") c.resume().catch(() => {});
  };
  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });
}

/** Pleasant two-tone "order received" ding (~0.9s). Safe to call anytime. */
export function playOrderDing() {
  const c = ensureContext();
  if (!c) return;
  try {
    if (c.state === "suspended") void c.resume();
    const start = c.currentTime + 0.02;

    const tone = (freq: number, at: number, duration: number, peak: number) => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(peak, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(at);
      osc.stop(at + duration + 0.05);
    };

    tone(1046.5, start, 0.5, 0.5); // C6
    tone(1318.5, start + 0.14, 0.55, 0.45); // E6
    tone(1568.0, start + 0.28, 0.7, 0.4); // G6
  } catch {
    /* audio unsupported — stay silent */
  }
}
