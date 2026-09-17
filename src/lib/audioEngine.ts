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

  private extraOscs: OscillatorNode[] = [];
  private baseCarrier = 108;

  private isPlaying = false;
  private volume = 0.35;
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

  public async start(type: 'theta' | 'delta' = 'theta', volume = 0.35, baseCarrier = 108): Promise<void> {
    if (this.isPlaying) this.stop();
    this.type = type;
    this.volume = volume;
    this.baseCarrier = baseCarrier;

    try {
      unlockIosSilentSwitch();
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      this.ctx = new AudioContextClass();

      // Ensure AudioContext is running (crucial for iOS Safari and Chromium autoplay policies)
      if (this.ctx.state === "suspended") {
        await this.ctx.resume();
      }

      // Master Gain with soft fade-in to prevent abrupt clicks
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
      this.masterGain.gain.exponentialRampToValueAtTime(Math.max(0.01, this.volume), this.ctx.currentTime + 1.5);
      this.masterGain.connect(this.ctx.destination);

      // 1. Warm Meditative Ambient Pad (Root + Harmonic Fifth + Shimmer Octave)
      // Base root: 108Hz (grounding meditative tone), Fifth: 162Hz, Octave: 216Hz
      const offset = type === 'theta' ? 4 : 2; // 4Hz Theta for relaxation/NSDR, 2Hz Delta for deep rest

      // Warm lowpass filter to remove harshness and give velvety warmth
      const padFilter = this.ctx.createBiquadFilter();
      padFilter.type = 'lowpass';
      padFilter.frequency.setValueAtTime(340, this.ctx.currentTime);
      padFilter.Q.setValueAtTime(0.7, this.ctx.currentTime);

      const padGain = this.ctx.createGain();
      padGain.gain.setValueAtTime(0.24, this.ctx.currentTime);

      // Left Channel Oscillator (Root)
      this.leftOsc = this.ctx.createOscillator();
      this.leftOsc.frequency.setValueAtTime(this.baseCarrier, this.ctx.currentTime);
      this.leftOsc.type = 'sine';

      const leftGain = this.ctx.createGain();
      leftGain.gain.setValueAtTime(0.20, this.ctx.currentTime);
      this.leftOsc.connect(leftGain);

      const leftPanner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
      if (leftPanner) {
        leftPanner.pan.setValueAtTime(-0.85, this.ctx.currentTime);
        leftGain.connect(leftPanner);
        leftPanner.connect(padFilter);
      } else {
        leftGain.connect(padFilter);
      }

      // Right Channel Oscillator (Root + Theta/Delta offset)
      this.rightOsc = this.ctx.createOscillator();
      this.rightOsc.frequency.setValueAtTime(this.baseCarrier + offset, this.ctx.currentTime);
      this.rightOsc.type = 'sine';

      const rightGain = this.ctx.createGain();
      rightGain.gain.setValueAtTime(0.20, this.ctx.currentTime);
      this.rightOsc.connect(rightGain);

      const rightPanner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
      if (rightPanner) {
        rightPanner.pan.setValueAtTime(0.85, this.ctx.currentTime);
        rightGain.connect(rightPanner);
        rightPanner.connect(padFilter);
      } else {
        rightGain.connect(padFilter);
      }

      // Harmonic Fifth (1.5x carrier: 162Hz) - adds musical relaxation
      const fifthOsc = this.ctx.createOscillator();
      fifthOsc.type = 'sine';
      fifthOsc.frequency.setValueAtTime(this.baseCarrier * 1.5, this.ctx.currentTime);
      const fifthGain = this.ctx.createGain();
      fifthGain.gain.setValueAtTime(0.09, this.ctx.currentTime);
      fifthOsc.connect(fifthGain);
      fifthGain.connect(padFilter);

      // Harmonic Octave (2x carrier: 216Hz) - subtle ethereal shimmer
      const octaveOsc = this.ctx.createOscillator();
      octaveOsc.type = 'sine';
      octaveOsc.frequency.setValueAtTime(this.baseCarrier * 2, this.ctx.currentTime);
      const octaveGain = this.ctx.createGain();
      octaveGain.gain.setValueAtTime(0.045, this.ctx.currentTime);
      octaveOsc.connect(octaveGain);
      octaveGain.connect(padFilter);

      padFilter.connect(padGain);
      padGain.connect(this.masterGain);

      // 2. Sub-bass Grounding Resonance (warm triangle wave, 54Hz)
      this.breathingOsc = this.ctx.createOscillator();
      this.breathingOsc.frequency.setValueAtTime(this.baseCarrier * 0.5, this.ctx.currentTime);
      this.breathingOsc.type = 'triangle';

      const droneFilter = this.ctx.createBiquadFilter();
      droneFilter.type = 'lowpass';
      droneFilter.frequency.setValueAtTime(80, this.ctx.currentTime);

      this.breathingGain = this.ctx.createGain();
      this.breathingGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

      // Breath LFO cycle modulation (approx 10s cycle: 5s slow swell, 5s release)
      this.lfo = this.ctx.createOscillator();
      this.lfo.frequency.setValueAtTime(0.1, this.ctx.currentTime); // 0.1Hz = 10 seconds

      const lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(0.04, this.ctx.currentTime); // gentle breathing volume swell

      this.lfo.connect(lfoGain);
      lfoGain.connect(this.breathingGain.gain);

      this.breathingOsc.connect(droneFilter);
      droneFilter.connect(this.breathingGain);
      this.breathingGain.connect(this.masterGain);

      // 3. Ambient Ocean Waves / Sea Breeze (filtered soft noise buffer)
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
      noiseFilter.Q.setValueAtTime(0.6, this.ctx.currentTime);
      noiseFilter.frequency.setValueAtTime(180, this.ctx.currentTime);

      // Slowly modulate filter frequency (12s gentle swell matching scenery)
      this.waveLfo = this.ctx.createOscillator();
      this.waveLfo.frequency.setValueAtTime(0.083, this.ctx.currentTime);

      const waveLfoGain = this.ctx.createGain();
      waveLfoGain.gain.setValueAtTime(80, this.ctx.currentTime); // sweep range

      this.waveLfo.connect(waveLfoGain);
      waveLfoGain.connect(noiseFilter.frequency);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.035, this.ctx.currentTime); // gentle, non-intrusive

      this.whiteNoise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.masterGain);

      // Start synthesis
      this.leftOsc.start(0);
      this.rightOsc.start(0);
      fifthOsc.start(0);
      octaveOsc.start(0);
      this.breathingOsc.start(0);
      this.lfo.start(0);
      this.whiteNoise.start(0);
      this.waveLfo.start(0);

      this.extraOscs = [fifthOsc, octaveOsc];
      this.isPlaying = true;
      this.broadcastState();
    } catch (err) {
      console.error("Failed to start NSDR engine:", err);
      this.isPlaying = false;
    }
  }

  public stop() {
    if (!this.isPlaying) return;

    try {
      stopIosSilentSwitch();
      if (this.masterGain && this.ctx) {
        const now = this.ctx.currentTime;
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
        this.masterGain.gain.linearRampToValueAtTime(0.0001, now + 0.15);
      }

      const activeLeft = this.leftOsc;
      const activeRight = this.rightOsc;
      const activeBreathing = this.breathingOsc;
      const activeLfo = this.lfo;
      const activeNoise = this.whiteNoise;
      const activeWaveLfo = this.waveLfo;
      const activeExtra = this.extraOscs;
      const activeCtx = this.ctx;

      setTimeout(() => {
        try {
          if (activeLeft) { activeLeft.stop(); activeLeft.disconnect(); }
          if (activeRight) { activeRight.stop(); activeRight.disconnect(); }
          if (activeBreathing) { activeBreathing.stop(); activeBreathing.disconnect(); }
          if (activeLfo) { activeLfo.stop(); activeLfo.disconnect(); }
          if (activeNoise) { activeNoise.stop(); activeNoise.disconnect(); }
          if (activeWaveLfo) { activeWaveLfo.stop(); activeWaveLfo.disconnect(); }
          if (activeExtra && activeExtra.length > 0) {
            activeExtra.forEach((o) => {
              try { o.stop(); o.disconnect(); } catch {}
            });
          }
          if (activeCtx) { activeCtx.close(); }
        } catch {
          // ignore
        }
      }, 160);
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
    this.extraOscs = [];
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
      const offset = type === 'theta' ? 4 : 2;
      this.leftOsc.frequency.exponentialRampToValueAtTime(this.baseCarrier, this.ctx.currentTime + 1.5);
      this.rightOsc.frequency.exponentialRampToValueAtTime(this.baseCarrier + offset, this.ctx.currentTime + 1.5);
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
