export const REST_SOUND_CARRIER_HZ = 95;
export const REST_SOUND_DIFFERENCE_HZ = 4;
export type RestSoundStartResult = "playing" | "blocked" | "unsupported";

/** User-initiated, low-volume stereo sound bed for the guided rest session. */
class RestSoundSynthesizer {
  private ctx: AudioContext | null = null;
  private nodes: AudioNode[] = [];
  private oscillators: OscillatorNode[] = [];
  private startGeneration = 0;

  async start(): Promise<RestSoundStartResult> {
    if (typeof window === "undefined") return "unsupported";
    if (this.oscillators.length && this.ctx?.state === "running") return "playing";
    const generation = ++this.startGeneration;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return "unsupported";
      this.ctx ||= new AudioCtx();
      if (this.ctx.state !== "running") await this.ctx.resume();
      if (generation !== this.startGeneration) return "blocked";
      if (this.ctx.state !== "running") return "blocked";
      if (this.oscillators.length) return "playing";
      const master = this.ctx.createGain();
      master.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      master.gain.exponentialRampToValueAtTime(0.035, this.ctx.currentTime + 1.5);
      master.connect(this.ctx.destination);
      this.nodes.push(master);

      [REST_SOUND_CARRIER_HZ, REST_SOUND_CARRIER_HZ + REST_SOUND_DIFFERENCE_HZ].forEach((frequency, index) => {
        const oscillator = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const pan = this.ctx!.createStereoPanner();
        oscillator.type = "sine";
        oscillator.frequency.value = frequency;
        gain.gain.value = 0.5;
        pan.pan.value = index === 0 ? -1 : 1;
        oscillator.connect(gain);
        gain.connect(pan);
        pan.connect(master);
        oscillator.start();
        this.oscillators.push(oscillator);
        this.nodes.push(gain, pan);
      });
      return "playing";
    } catch {
      this.stop();
      return "blocked";
    }
  }

  stop(): void {
    this.startGeneration++;
    this.oscillators.forEach((oscillator) => {
      try { oscillator.stop(); } catch { /* already stopped */ }
      oscillator.disconnect();
    });
    this.nodes.forEach((node) => node.disconnect());
    this.oscillators = [];
    this.nodes = [];
  }

  cleanup(): void {
    this.stop();
    if (this.ctx) void this.ctx.close();
    this.ctx = null;
  }
}

export const restSoundSynth = new RestSoundSynthesizer();
