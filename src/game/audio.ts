/**
 * Procedural Web Audio API engine sound, tire squeal, and wind rush.
 * Pure synthetic synthesis: 0 KB asset download, zero external audio files.
 */

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  // Engine oscillators
  private osc1: OscillatorNode | null = null;
  private osc2: OscillatorNode | null = null;
  private osc3: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineGain: GainNode | null = null;

  // Tire squeal (drift)
  private squealSource: AudioBufferSourceNode | null = null;
  private squealFilter: BiquadFilterNode | null = null;
  private squealGain: GainNode | null = null;

  // Wind rush (speed)
  private windSource: AudioBufferSourceNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private windGain: GainNode | null = null;

  private isMuted: boolean = false;
  private initialised: boolean = false;

  public init() {
    if (this.initialised) {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // ── 1. Engine Synthesis (3 harmonic oscillators + distortion filter) ────
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.setValueAtTime(0.25, this.ctx.currentTime);

      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.setValueAtTime(450, this.ctx.currentTime);
      this.engineFilter.Q.setValueAtTime(2.5, this.ctx.currentTime);

      this.osc1 = this.ctx.createOscillator();
      this.osc1.type = 'sawtooth';
      this.osc1.frequency.setValueAtTime(45, this.ctx.currentTime);

      this.osc2 = this.ctx.createOscillator();
      this.osc2.type = 'triangle';
      this.osc2.frequency.setValueAtTime(90, this.ctx.currentTime);

      this.osc3 = this.ctx.createOscillator();
      this.osc3.type = 'square';
      this.osc3.frequency.setValueAtTime(22.5, this.ctx.currentTime);

      const oscGain = this.ctx.createGain();
      oscGain.gain.setValueAtTime(0.3, this.ctx.currentTime);

      this.osc1.connect(this.engineFilter);
      this.osc2.connect(this.engineFilter);
      this.osc3.connect(oscGain);
      oscGain.connect(this.engineFilter);

      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.masterGain);

      this.osc1.start();
      this.osc2.start();
      this.osc3.start();

      // ── 2. Tire Squeal Synthesis (white noise through bandpass) ───────────
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      this.squealSource = this.ctx.createBufferSource();
      this.squealSource.buffer = noiseBuffer;
      this.squealSource.loop = true;

      this.squealFilter = this.ctx.createBiquadFilter();
      this.squealFilter.type = 'bandpass';
      this.squealFilter.frequency.setValueAtTime(1400, this.ctx.currentTime);
      this.squealFilter.Q.setValueAtTime(6.0, this.ctx.currentTime);

      this.squealGain = this.ctx.createGain();
      this.squealGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

      this.squealSource.connect(this.squealFilter);
      this.squealFilter.connect(this.squealGain);
      this.squealGain.connect(this.masterGain);
      this.squealSource.start();

      // ── 3. Wind Rush (filtered white noise) ────────────────────────────────
      this.windSource = this.ctx.createBufferSource();
      this.windSource.buffer = noiseBuffer;
      this.windSource.loop = true;

      this.windFilter = this.ctx.createBiquadFilter();
      this.windFilter.type = 'lowpass';
      this.windFilter.frequency.setValueAtTime(250, this.ctx.currentTime);

      this.windGain = this.ctx.createGain();
      this.windGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

      this.windSource.connect(this.windFilter);
      this.windFilter.connect(this.windGain);
      this.windGain.connect(this.masterGain);
      this.windSource.start();

      this.initialised = true;
    } catch (e) {
      console.warn('Web Audio not supported or blocked:', e);
    }
  }

  public update(speedKmh: number, rpm: number, throttle: number, drift: number) {
    if (!this.initialised || !this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    const absSpeed = Math.abs(speedKmh);

    // Engine pitch curves: base 45 Hz up to 340 Hz based on RPM and speed
    const baseFreq = 42 + rpm * 260 + (throttle > 0 ? 25 : 0);
    if (this.osc1 && this.osc2 && this.osc3) {
      this.osc1.frequency.setTargetAtTime(baseFreq, t, 0.05);
      this.osc2.frequency.setTargetAtTime(baseFreq * 2, t, 0.05);
      this.osc3.frequency.setTargetAtTime(baseFreq * 0.5, t, 0.05);
    }

    // Engine filter brightness opens with throttle
    if (this.engineFilter) {
      const cutoff = 380 + rpm * 800 + (throttle > 0 ? 500 : 0);
      this.engineFilter.frequency.setTargetAtTime(cutoff, t, 0.06);
    }

    // Tire squeal gain increases with drift intensity
    if (this.squealGain) {
      const squealVol = drift > 0.15 && absSpeed > 25 ? Math.min(0.45, drift * 0.5) : 0.0;
      this.squealGain.gain.setTargetAtTime(squealVol, t, 0.08);
    }

    // Wind rush gain increases past 100 km/h
    if (this.windGain && this.windFilter) {
      const windVol = Math.max(0, Math.min(0.35, (absSpeed - 80) / 160));
      this.windGain.gain.setTargetAtTime(windVol, t, 0.1);
      this.windFilter.frequency.setTargetAtTime(150 + windVol * 600, t, 0.1);
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.4, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }
}

export const audioEngine = new AudioEngine();
