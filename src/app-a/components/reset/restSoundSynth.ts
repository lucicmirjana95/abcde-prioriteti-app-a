import { nsdrEngine } from "../../../lib/audioEngine";

export const REST_SOUND_CARRIER_HZ = 180;
export const REST_SOUND_DIFFERENCE_HZ = 4;
export type RestSoundStartResult = "playing" | "blocked" | "unsupported";

/** User-initiated relaxing NSDR audio bed for the guided rest session. */
class RestSoundSynthesizer {
  async start(): Promise<RestSoundStartResult> {
    if (typeof window === "undefined") return "unsupported";
    try {
      await nsdrEngine.start("theta", 0.32, 108);
      return nsdrEngine.getIsPlaying() ? "playing" : "blocked";
    } catch {
      this.stop();
      return "blocked";
    }
  }

  stop(): void {
    try {
      nsdrEngine.stop();
    } catch {
      // ignore
    }
  }

  cleanup(): void {
    this.stop();
  }
}

export const restSoundSynth = new RestSoundSynthesizer();
