import React, { useEffect, useState, useRef } from "react";

export function AmbientPlayer({ activeAmbient, enabled }: { activeAmbient: string, enabled: boolean }) {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const sourceRef = useRef<any>(null);
  const lfoRef = useRef<any>(null); // For fireplace flicker

  useEffect(() => {
    if (!enabled || activeAmbient === "none" || !activeAmbient) {
      if (sourceRef.current) {
        sourceRef.current.stop();
        sourceRef.current = null;
      }
      if (lfoRef.current) {
        lfoRef.current.stop();
        lfoRef.current = null;
      }
      return;
    }

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContextClass();
      }
      
      const ctx = audioCtxRef.current;
      
      if (sourceRef.current) {
        sourceRef.current.stop();
        sourceRef.current = null;
      }
      if (lfoRef.current) {
        lfoRef.current.stop();
        lfoRef.current = null;
      }

      const gain = ctx.createGain();
      gain.connect(ctx.destination);
      gainNodeRef.current = gain;

      // Enhance synthesizer sounds to be richer
      if (activeAmbient === "rain" || activeAmbient === "calm_rain" || activeAmbient === "library") {
        gain.gain.value = 0.08;
        const bufferSize = ctx.sampleRate * 2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = activeAmbient === "library" ? 250 : 500; // Library is deeper/more muffled
        noise.connect(filter);
        filter.connect(gain);
        noise.loop = true;
        noise.start();
        sourceRef.current = noise;
      } else if (activeAmbient === "space") {
        gain.gain.value = 0.04;
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = 50;
        
        const lfo = ctx.createOscillator();
        lfo.type = "sine";
        lfo.frequency.value = 0.2; // Slow modulation
        
        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 120;
        
        lfo.connect(gain.gain);
        osc.connect(filter);
        filter.connect(gain);
        osc.start();
        lfo.start();
        sourceRef.current = osc;
        lfoRef.current = lfo;
      } else if (activeAmbient === "fireplace") {
        gain.gain.value = 0.1;
        const bufferSize = ctx.sampleRate * 2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        
        // Complex filter for fire crackle
        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.value = 350;
        filter.Q.value = 0.8;
        
        const lfo = ctx.createOscillator();
        lfo.type = "triangle";
        lfo.frequency.value = 8; // fast crackle modulation
        
        lfo.connect(gain.gain);
        noise.connect(filter);
        filter.connect(gain);
        noise.loop = true;
        noise.start();
        lfo.start();
        sourceRef.current = noise;
        lfoRef.current = lfo;
      }
    } catch (err) {
      console.warn("Autoplay blocked for ambient sound", err);
    }

    return () => {
      if (sourceRef.current) {
        sourceRef.current.stop();
        sourceRef.current = null;
      }
      if (lfoRef.current) {
        lfoRef.current.stop();
        lfoRef.current = null;
      }
    };
  }, [activeAmbient, enabled]);

  if (!activeAmbient || activeAmbient === "none") return null;

  // Add rich visual overlays for each ambient
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
      {(activeAmbient === "rain" || activeAmbient === "calm_rain") && (
        <div className="absolute inset-0 bg-blue-900/5 dark:bg-blue-300/5" style={{ 
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)', 
          backgroundSize: '20px 20px', 
          animation: 'water-flow 4s infinite linear' 
        }}>
          <div className="absolute inset-0 opacity-20" style={{ background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.1))' }}></div>
        </div>
      )}
      {activeAmbient === "library" && (
        <div className="absolute inset-0 bg-amber-900/5 dark:bg-amber-300/5" style={{ 
          boxShadow: 'inset 0 0 150px rgba(120, 60, 20, 0.1)',
          animation: 'pulse 10s infinite' 
        }}></div>
      )}
      {activeAmbient === "space" && (
        <div className="absolute inset-0 bg-indigo-900/5 dark:bg-indigo-300/5 flex items-center justify-center">
          <div className="w-[150vw] h-[150vh] rounded-full border border-indigo-500/10 anim-orbit opacity-30"></div>
          <div className="w-[100vw] h-[100vh] rounded-full border border-purple-500/10 anim-orbit opacity-20" style={{ animationDirection: 'reverse', animationDuration: '15s' }}></div>
          <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at center, transparent 0%, rgba(0,0,50,0.2) 100%)' }}></div>
        </div>
      )}
      {activeAmbient === "fireplace" && (
        <div className="absolute inset-0" style={{ 
          background: 'radial-gradient(circle at center bottom, rgba(255, 100, 0, 0.08) 0%, transparent 60%)',
          animation: 'pulse 3s infinite alternate' 
        }}>
           <div className="absolute inset-0 bg-orange-900/5 dark:bg-orange-300/5 mix-blend-overlay"></div>
        </div>
      )}
    </div>
  );
}
