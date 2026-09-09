/**
 * Lightweight, accessible phase-change chime synthesizer.
 * - Disabled by default.
 * - Distinct rising inhale and falling exhale cues.
 * - Fully isolated, zero heavy audio engines or continuous background audio loops.
 * - Browser autoplay safe (only initializes when explicitly requested).
 */
class LightChimeSynthesizer {
  private ctx: AudioContext | null = null;

  public async init(): Promise<boolean> {
    if (typeof window === "undefined") return false;
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === "suspended") {
        await this.ctx.resume();
      }
      return this.ctx?.state === "running";
    } catch (e) {
      console.warn("Chime synth init skipped:", e);
      return false;
    }
  }

  public async playPhaseChime(type: "inhale" | "hold" | "exhale" | "complete" | "stage"): Promise<boolean> {
    try {
      const ready = await this.init();
      if (!ready || !this.ctx) return false;

      const now = this.ctx.currentTime;
      let frequencies = [440];
      let cueDuration = 0.72;

      switch (type) {
        case "inhale":
          frequencies = [392, 523.25]; // rising G4 -> C5
          break;
        case "hold":
          frequencies = [440];
          cueDuration = 0.35;
          break;
        case "exhale":
          frequencies = [440, 293.66]; // falling A4 -> D4
          cueDuration = 0.9;
          break;
        case "stage":
          frequencies = [392];
          break;
        case "complete":
          frequencies = [523.25, 659.25];
          cueDuration = 1.1;
          break;
      }

      // Main Soft Sine
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(frequencies[0], now);
      if (frequencies.length > 1) {
        osc.frequency.exponentialRampToValueAtTime(frequencies[1], now + cueDuration * 0.72);
      }

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(type === "hold" ? 0.035 : 0.065, now + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + cueDuration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + cueDuration + 0.04);
      return true;
    } catch {
      // Audio playback fails gracefully without disturbing user
      return false;
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
