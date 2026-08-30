export const playInteractionSound = (soundPack: string, type: "check" | "uncheck") => {
  try {
    unlockIosSilentSwitch();
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const playTone = (freq: number, typeOs: OscillatorType, vol: number, dur: number, startDelay = 0) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = typeOs;
      osc.frequency.setValueAtTime(freq, ctx.currentTime + startDelay);
      gain.gain.setValueAtTime(vol, ctx.currentTime + startDelay);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + startDelay + dur);
      osc.start(ctx.currentTime + startDelay);
      osc.stop(ctx.currentTime + startDelay + dur);
    };

    if (type === "uncheck") {
      playTone(300, "sine", 0.05, 0.1);
      return;
    }

    // "check" sounds
    switch (soundPack) {
      case "soft_spark": // Minimalist Wood (Pro)
        playTone(350, "triangle", 0.15, 0.05);
        playTone(550, "sine", 0.1, 0.08, 0.01);
        break;
      case "golden_click": // Golden Haptic (Elite)
        playTone(1500, "square", 0.02, 0.02);
        playTone(800, "sine", 0.1, 0.08, 0.01);
        playTone(1200, "triangle", 0.05, 0.15, 0.02);
        break;
      case "calm_rain": // Zen Bell
        playTone(880, "sine", 0.1, 1.5);
        playTone(1760, "sine", 0.05, 1.0, 0.01);
        playTone(885, "sine", 0.08, 1.5); // Slight detune for resonance
        break;
      case "default":
      default:
        playTone(600, "sine", 0.1, 0.08);
        playTone(800, "sine", 0.05, 0.15, 0.02);
        break;
    }
  } catch (err) {
    console.warn("Audio context not allowed by browser autoplay rules yet:", err);
  }
};

let silentAudioHtml5: HTMLAudioElement | null = null;

export function unlockIosSilentSwitch() {
  try {
    if (typeof window === "undefined") return;
    if (!silentAudioHtml5) {
      silentAudioHtml5 = new Audio("data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==");
      silentAudioHtml5.loop = true;
      silentAudioHtml5.setAttribute("playsinline", "true");
      silentAudioHtml5.setAttribute("webkit-playsinline", "true");
      // very tiny volume, practically silent, but forces iOS routing
      silentAudioHtml5.volume = 0.01; 
    }
    
    const playPromise = silentAudioHtml5.play();
    if (playPromise !== undefined) {
      playPromise.catch(err => {
        console.warn("Silent audio play blocked or waiting for user gesture:", err);
      });
    }
  } catch (e) {
    console.warn("Failed to unlock iOS silent switch:", e);
  }
}

export function stopIosSilentSwitch() {
  try {
    if (silentAudioHtml5) {
      silentAudioHtml5.pause();
    }
  } catch (e) {
    // ignore
  }
}

class NsdrEngineClass {
  private ctx: AudioContext | null = null;
  private leftOsc: OscillatorNode | null = null;
  private rightOsc: OscillatorNode | null = null;
  private breathingOsc: OscillatorNode | null = null;
  private breathingGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private lfo: OscillatorNode | null = null;
  private whiteNoise: AudioBufferSourceNode | null = null;
  private waveLfo: OscillatorNode | null = null;

  private isPlaying = false;
  private volume = 0.4;
  private type: 'theta' | 'delta' = 'theta';

  private broadcastState() {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("nsdr-state-change", {
          detail: {
            isPlaying: this.isPlaying,
            volume: this.volume,
            type: this.type,
          },
        })
      );
    }
  }

  public start(type: 'theta' | 'delta' = 'theta', volume = 0.4) {
    if (this.isPlaying) this.stop();
    this.type = type;
    this.volume = volume;

    try {
      unlockIosSilentSwitch();
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      this.ctx = new AudioContextClass();

      // Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Binaural Beats frequencies
      // Base carrier: 95Hz (warm & deep bass)
      const baseFreq = 95;
      const offset = type === 'theta' ? 4 : 2; // 4Hz Theta for meditation, 2Hz Delta for deep rest

      // Left Channel
      this.leftOsc = this.ctx.createOscillator();
      this.leftOsc.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);
      this.leftOsc.type = 'sine';

      const leftGain = this.ctx.createGain();
      leftGain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      this.leftOsc.connect(leftGain);

      const leftPanner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
      if (leftPanner) {
        leftPanner.pan.setValueAtTime(-1, this.ctx.currentTime);
        leftGain.connect(leftPanner);
        leftPanner.connect(this.masterGain);
      } else {
        leftGain.connect(this.masterGain);
      }

      // Right Channel
      this.rightOsc = this.ctx.createOscillator();
      this.rightOsc.frequency.setValueAtTime(baseFreq + offset, this.ctx.currentTime);
      this.rightOsc.type = 'sine';

      const rightGain = this.ctx.createGain();
      rightGain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      this.rightOsc.connect(rightGain);

      const rightPanner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
      if (rightPanner) {
        rightPanner.pan.setValueAtTime(1, this.ctx.currentTime);
        rightGain.connect(rightPanner);
        rightPanner.connect(this.masterGain);
      } else {
        rightGain.connect(this.masterGain);
      }

      // 2. Sub-bass Breathing Drone (triangle wave, lowpass filtered)
      this.breathingOsc = this.ctx.createOscillator();
      this.breathingOsc.frequency.setValueAtTime(50, this.ctx.currentTime); // physical body resonant frequency
      this.breathingOsc.type = 'triangle';

      const droneFilter = this.ctx.createBiquadFilter();
      droneFilter.type = 'lowpass';
      droneFilter.frequency.setValueAtTime(75, this.ctx.currentTime);

      this.breathingGain = this.ctx.createGain();
      this.breathingGain.gain.setValueAtTime(0.12, this.ctx.currentTime);

      // Breath LFO cycle modulation (approx 10s cycle: 5s inhale, 5s exhale)
      this.lfo = this.ctx.createOscillator();
      this.lfo.frequency.setValueAtTime(0.1, this.ctx.currentTime); // 0.1Hz = 10 seconds

      const lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(0.08, this.ctx.currentTime); // modulate volume smoothly

      this.lfo.connect(lfoGain);
      lfoGain.connect(this.breathingGain.gain);

      this.breathingOsc.connect(droneFilter);
      droneFilter.connect(this.breathingGain);
      this.breathingGain.connect(this.masterGain);

      // 3. Ambient Ocean Waves (filtered random noise buffer)
      const bufferSize = 2 * this.ctx.sampleRate;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      this.whiteNoise = this.ctx.createBufferSource();
      this.whiteNoise.buffer = noiseBuffer;
      this.whiteNoise.loop = true;

      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.Q.setValueAtTime(0.8, this.ctx.currentTime);

      // Slowly modulate filter frequency (12s waves)
      this.waveLfo = this.ctx.createOscillator();
      this.waveLfo.frequency.setValueAtTime(0.08, this.ctx.currentTime);

      const waveLfoGain = this.ctx.createGain();
      waveLfoGain.gain.setValueAtTime(120, this.ctx.currentTime); // sweep range

      this.waveLfo.connect(waveLfoGain);
      noiseFilter.frequency.setValueAtTime(200, this.ctx.currentTime);
      waveLfoGain.connect(noiseFilter.frequency);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.05, this.ctx.currentTime);

      this.whiteNoise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.masterGain);

      // Start synthesis
      this.leftOsc.start(0);
      this.rightOsc.start(0);
      this.breathingOsc.start(0);
      this.lfo.start(0);
      this.whiteNoise.start(0);
      this.waveLfo.start(0);

      this.isPlaying = true;
      this.broadcastState();
    } catch (err) {
      console.error("Failed to start NSDR engine:", err);
    }
  }

  public stop() {
    if (!this.isPlaying) return;

    try {
      stopIosSilentSwitch();
      if (this.leftOsc) { this.leftOsc.stop(); this.leftOsc.disconnect(); }
      if (this.rightOsc) { this.rightOsc.stop(); this.rightOsc.disconnect(); }
      if (this.breathingOsc) { this.breathingOsc.stop(); this.breathingOsc.disconnect(); }
      if (this.lfo) { this.lfo.stop(); this.lfo.disconnect(); }
      if (this.whiteNoise) { this.whiteNoise.stop(); this.whiteNoise.disconnect(); }
      if (this.waveLfo) { this.waveLfo.stop(); this.waveLfo.disconnect(); }
      if (this.ctx) { this.ctx.close(); }
    } catch (e) {
      console.warn("NSDR Engine stop warning:", e);
    }

    this.leftOsc = null;
    this.rightOsc = null;
    this.breathingOsc = null;
    this.breathingGain = null;
    this.lfo = null;
    this.whiteNoise = null;
    this.waveLfo = null;
    this.masterGain = null;
    this.ctx = null;
    this.isPlaying = false;
    this.broadcastState();
  }

  public setVolume(volume: number) {
    this.volume = volume;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.linearRampToValueAtTime(volume, this.ctx.currentTime + 0.15);
    }
    this.broadcastState();
  }

  public setType(type: 'theta' | 'delta') {
    this.type = type;
    if (this.isPlaying && this.ctx && this.leftOsc && this.rightOsc) {
      const baseFreq = 95;
      const offset = type === 'theta' ? 4 : 2;
      this.leftOsc.frequency.exponentialRampToValueAtTime(baseFreq, this.ctx.currentTime + 1.5);
      this.rightOsc.frequency.exponentialRampToValueAtTime(baseFreq + offset, this.ctx.currentTime + 1.5);
    }
    this.broadcastState();
  }

  public getIsPlaying() {
    return this.isPlaying;
  }

  public getVolume() {
    return this.volume;
  }

  public getType() {
    return this.type;
  }
}

export const nsdrEngine = new NsdrEngineClass();
