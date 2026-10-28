// A short generated tone via the Web Audio API - no audio asset file, no new
// dependency (research.md §5). Failures (e.g. autoplay restrictions) are
// swallowed: the visual "done" state is the authoritative signal (FR-010).
//
// A single AudioContext is kept alive across calls rather than created fresh
// each time. Browsers suspend a freshly-created AudioContext unless it's
// created/resumed as part of a direct user gesture (a click) - the natural
// "period reached zero" ring fires from a setInterval tick, which is NOT a
// gesture, so a brand-new context there would silently produce no sound.
// Reusing the same context - first resumed during the "Start"/"Stop" click
// handlers - keeps it unlocked for that later, non-gesture call too.
let sharedContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!sharedContext) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;
    sharedContext = new AudioContextClass();
  }
  return sharedContext;
}

export function playPomodoroRing() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      void ctx.resume();
    }

    const now = ctx.currentTime;

    // Two short beeps, a clear but non-jarring "ding-ding".
    [0, 0.28].forEach((offset) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = 880;
      gain.gain.setValueAtTime(0, now + offset);
      gain.gain.linearRampToValueAtTime(0.5, now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.25);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(now + offset);
      oscillator.stop(now + offset + 0.26);
    });
  } catch {
    // Sound is a nice-to-have; the visual done-state already carries the signal.
  }
}
