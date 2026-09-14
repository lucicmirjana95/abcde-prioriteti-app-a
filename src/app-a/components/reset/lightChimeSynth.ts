export type BreathingSoundPhase =
  | "inhale"
  | "exhale"
  | "hold"
  | "hold_full"
  | "hold_empty"
  | "first_inhale"
  | "topup_inhale"
  | "complete"
  | "stage";

export interface PlayBreathingPhaseParams {
  phase: BreathingSoundPhase;
  durationMs: number;
  totalPhaseDurationMs?: number;
  elapsedMs?: number;
}

export interface BreathingPhaseProfile {
  startFreq: number;
  endFreq: number;
  peakGain: number;
  type: OscillatorType;
  steady?: boolean;
}

export const BREATHING_SOUND_PROFILES: Readonly<Record<BreathingSoundPhase, BreathingPhaseProfile>> = Object.freeze({
  inhale: {
    startFreq: 196,
    endFreq: 293.66,
    peakGain: 0.038,
    type: "sine",
  },
  exhale: {
    startFreq: 293.66,
    endFreq: 174.61,
    peakGain: 0.034,
    type: "sine",
  },
  hold: {
    startFreq: 246.94, // B3 subtle, very quiet steady tone
    endFreq: 246.94,
    peakGain: 0.007,
    type: "sine",
    steady: true,
  },
  hold_full: {
    startFreq: 246.94,
    endFreq: 246.94,
    peakGain: 0.007,
    type: "sine",
    steady: true,
  },
  hold_empty: {
    startFreq: 220,
    endFreq: 220,
    peakGain: 0.006,
    type: "sine",
    steady: true,
  },
  first_inhale: {
    startFreq: 196,
    endFreq: 261.63,
    peakGain: 0.036,
    type: "sine",
  },
  topup_inhale: {
    startFreq: 261.63,
    endFreq: 329.63,
    peakGain: 0.04,
    type: "sine",
  },
  complete: {
    startFreq: 523.25, // C5
    endFreq: 659.25, // E5 warm completion chord
    peakGain: 0.055,
    type: "sine",
  },
  stage: {
    startFreq: 392,
    endFreq: 392,
    peakGain: 0.03,
    type: "sine",
    steady: true,
  },
});

/**
 * Continuous Web Audio guidance engine for guided breathing exercises.
 * - Smooth rising pitch/gain for inhales matching full phase duration.
 * - Distinct descending pitch/gain for exhales matching full phase duration.
 * - Gentle steady low-volume signal for holds.
 * - Distinct double-inhale support with primary and top-up sweeps.
 * - Pop-free audio transitions (gain ramp down before stopping).
 * - Full cleanup on pause, stop, restart, or unmount.
 */
export class LightChimeSynthesizer {
  private ctx: AudioContext | null = null;
  private activeOscillator: OscillatorNode | null = null;
  private activeGain: GainNode | null = null;
  private stopTimeout: ReturnType<typeof setTimeout> | null = null;

  public isSupported(): boolean {
    if (typeof window === "undefined") return false;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    return Boolean(AudioCtx);
  }

  public async init(): Promise<boolean> {
    if (!this.isSupported()) return false;
    try {
      if (!this.ctx) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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

  /**
   * Immediately stops any currently active oscillator with a smooth fade-out
   * to avoid clicks, pops, or overlapping audio.
   */
  public stop(fadeDurationSec = 0.04): void {
    if (this.stopTimeout !== null) {
      clearTimeout(this.stopTimeout);
      this.stopTimeout = null;
    }

    if (!this.activeGain || !this.activeOscillator || !this.ctx) {
      this.activeGain = null;
      this.activeOscillator = null;
      return;
    }

    const osc = this.activeOscillator;
    const gain = this.activeGain;
    this.activeOscillator = null;
    this.activeGain = null;

    try {
      const now = this.ctx.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(0.0001, now + fadeDurationSec);

      osc.stop(now + fadeDurationSec + 0.01);
      setTimeout(() => {
        try {
          osc.disconnect();
          gain.disconnect();
        } catch {
          // ignore disconnect errors
        }
      }, Math.ceil((fadeDurationSec + 0.02) * 1000));
    } catch {
      // Audio already stopped or in invalid state
    }
  }

  /**
   * Plays the continuous audio guidance matching the active breathing phase and duration.
   */
  public async playBreathingPhase(params: PlayBreathingPhaseParams): Promise<boolean> {
    const { phase, durationMs, totalPhaseDurationMs, elapsedMs } = params;
    if (durationMs <= 100) {
      this.stop(0.02);
      return true;
    }

    const ready = await this.init();
    if (!ready || !this.ctx) return false;

    const profile = BREATHING_SOUND_PROFILES[phase] || BREATHING_SOUND_PROFILES.inhale;
    const durationSec = durationMs / 1000;

    // Smoothly silence any previous tone before starting new phase tone
    this.stop(0.03);

    try {
      const now = this.ctx.currentTime;

      // Calculate starting frequency based on elapsed progress if resuming mid-phase
      let actualStartFreq = profile.startFreq;
      if (
        typeof elapsedMs === "number" &&
        typeof totalPhaseDurationMs === "number" &&
        totalPhaseDurationMs > 0 &&
        elapsedMs > 0
      ) {
        const progress = Math.min(0.95, Math.max(0, elapsedMs / totalPhaseDurationMs));
        actualStartFreq = profile.startFreq + (profile.endFreq - profile.startFreq) * progress;
      }
      const actualEndFreq = profile.endFreq;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = profile.type;
      osc.frequency.setValueAtTime(Math.max(20, actualStartFreq), now);
      if (Math.abs(actualEndFreq - actualStartFreq) > 1) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, actualEndFreq), now + durationSec);
      }

      // Smooth Gain Envelope across the entire phase duration
      const attackDuration = Math.min(0.28, durationSec * 0.22);
      const releaseDuration = Math.min(0.22, durationSec * 0.2);

      gain.gain.setValueAtTime(0.0001, now);

      if (profile.steady) {
        // Steady anchor for breath holds
        gain.gain.linearRampToValueAtTime(profile.peakGain, now + attackDuration);
        gain.gain.setValueAtTime(profile.peakGain, Math.max(now + attackDuration, now + durationSec - releaseDuration));
        gain.gain.linearRampToValueAtTime(0.0001, now + durationSec);
      } else if (phase === "exhale") {
        // Exhale: starts strong and descends calmly
        gain.gain.linearRampToValueAtTime(profile.peakGain, now + attackDuration);
        const midPoint = now + durationSec * 0.55;
        gain.gain.linearRampToValueAtTime(profile.peakGain * 0.7, midPoint);
        gain.gain.setValueAtTime(profile.peakGain * 0.6, Math.max(midPoint, now + durationSec - releaseDuration));
        gain.gain.linearRampToValueAtTime(0.0001, now + durationSec);
      } else {
        // Inhale / Top-up: gradually swells in intensity up to lung capacity
        const buildPoint = Math.max(now + attackDuration, now + durationSec - releaseDuration);
        gain.gain.linearRampToValueAtTime(profile.peakGain * 0.75, now + attackDuration);
        gain.gain.linearRampToValueAtTime(profile.peakGain, buildPoint);
        gain.gain.linearRampToValueAtTime(0.0001, now + durationSec);
      }

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + durationSec + 0.05);

      this.activeOscillator = osc;
      this.activeGain = gain;

      this.stopTimeout = setTimeout(() => {
        if (this.activeOscillator === osc) {
          this.activeOscillator = null;
          this.activeGain = null;
        }
      }, Math.ceil((durationSec + 0.06) * 1000));

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Backward-compatible shorthand for discrete cues or session completion.
   */
  public async playPhaseChime(
    type: "inhale" | "hold" | "exhale" | "complete" | "stage",
    durationMs?: number,
  ): Promise<boolean> {
    const fallbackDuration = type === "complete" ? 1200 : type === "hold" ? 800 : 1000;
    return this.playBreathingPhase({
      phase: type,
      durationMs: durationMs || fallbackDuration,
    });
  }

  public cleanup(): void {
    this.stop(0.01);
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
