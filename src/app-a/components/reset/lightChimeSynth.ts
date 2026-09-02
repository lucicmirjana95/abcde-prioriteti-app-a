/**
 * Lightweight, accessible phase-change chime synthesizer.
 * - Disabled by default.
 * - Single pure sine wave with subtle overtone.
 * - Fully isolated, zero heavy audio engines or continuous background audio loops.
 * - Browser autoplay safe (only initializes when explicitly requested).
 */
class LightChimeSynthesizer {
  private ctx: AudioContext | null = null;

  public init(): void {
    if (typeof window === "undefined") return;
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === "suspended") {
        void this.ctx.resume();
      }
    } catch (e) {
      console.warn("Chime synth init skipped:", e);
    }
  }

  public playPhaseChime(type: "inhale" | "hold" | "exhale" | "complete" | "stage"): void {
    try {
      this.init();
      if (!this.ctx || this.ctx.state === "suspended") return;

      const now = this.ctx.currentTime;
      let baseFreq = 440; // A4

      switch (type) {
        case "inhale":
          baseFreq = 523.25; // C5 (Lifting, gentle)
          break;
        case "hold":
          baseFreq = 440.0; // A4 (Centered)
          break;
        case "exhale":
          baseFreq = 349.23; // F4 (Grounding, relaxing)
          break;
        case "stage":
          baseFreq = 392.0; // G4
          break;
        case "complete":
          baseFreq = 587.33; // D5
          break;
      }

      // Main Soft Sine
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(baseFreq, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.85);

      if (type === "complete") {
        // Subtle harmonic chord on completion
        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(baseFreq * 1.25, now + 0.1); // Major third

        gain2.gain.setValueAtTime(0.001, now + 0.1);
        gain2.gain.linearRampToValueAtTime(0.06, now + 0.15);
        gain2.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

        osc2.connect(gain2);
        gain2.connect(this.ctx.destination);
        osc2.start(now + 0.1);
        osc2.stop(now + 1.25);
      }
    } catch {
      // Audio playback fails gracefully without disturbing user
    }
  }

  public cleanup(): void {
    if (this.ctx) {
      try {
        void this.ctx.close();
      } catch {
        // ignore
      }
      this.ctx = null;
    }
  }
}

export const lightChimeSynth = new LightChimeSynthesizer();
