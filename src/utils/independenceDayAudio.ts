/**
 * 60-Second Ultra-Premium Cinematic Independence Day Soundtrack Engine
 * "AIJOBS PRESENTS — HAPPY INDEPENDENCE DAY 🇮🇳"
 * Powered by Web Audio API
 * 
 * Musical Progression:
 * 0:00–0:08 (Scene 1: Tiranga — The Hero): Soft morning wind, tanpura drone, bansuri flute (Vande Mataram motif), gentle piano
 * 0:08–0:16 (Scene 2: Bacchon Ka India): Soft flute, warm violin strings, acoustic piano arpeggios
 * 0:16–0:25 (Scene 3: The People of India): Deeper strings, gentle acoustic tabla/bayan pulse of dignity
 * 0:25–0:34 (Scene 4: Young India): Orchestral rise, inspiring modern pulse, aspiration & confidence theme
 * 0:34–0:43 (Scene 5: One India): Full orchestral montage crescendo, tabla grooves, Raag Desh / Yaman harmonies
 * 0:43–0:51 (Scene 6: Freedom & Opportunity): Emotional bansuri return, warm piano chords, subtle career harmonic pulse
 * 0:51–1:00 (Scene 7: Grand Finale): Powerful patriotic crescendo, majestic brass/strings, chimes & sub-bass bloom for Jai Hind 🇮🇳
 */

export class IndependenceDayAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private isPlaying: boolean = false;
  private isMuted: boolean = false;
  private startTime: number = 0;
  private scheduledNodes: Array<{ stop: (time?: number) => void }> = [];

  constructor() {}

  private initContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public async startAudio(): Promise<boolean> {
  try {
    const ctx = this.initContext();
    if (!ctx) return false;

    // Purana audio pehle stop karo
    this.stopAudio();

    // Vande Mataram MP3 start karo
    if (typeof window !== "undefined") {
      if (!this.audioElement) {
        this.audioElement = new Audio("/audio/vande_matram_flute.mp3");
        this.audioElement.loop = true;
        this.audioElement.preload = "auto";
        this.audioElement.volume = 0.45;
      }

      try {
        this.audioElement.currentTime = 0;
        this.audioElement.muted = this.isMuted;
        await this.audioElement.play();
      } catch (err) {
        console.warn(
          "[IndependenceDayAudioEngine] MP3 autoplay blocked:",
          err
        );
      }
    }

    // Background cinematic soundtrack
    this.masterGain = ctx.createGain();
    this.masterGain.gain.setValueAtTime(
      this.isMuted ? 0 : 0.18,
      ctx.currentTime
    );
    this.masterGain.connect(ctx.destination);

    this.startTime = ctx.currentTime;
    this.isPlaying = true;
    this.scheduledNodes = [];

    const t0 = this.startTime;
      // =======================================================================
      // 1. SOFT MORNING WIND & TANPURA DRONE (0:00 - 60:00)
      // =======================================================================
      // Wind Noise (Scene 1)
      const bufferSize = ctx.sampleRate * 8;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const windSource = ctx.createBufferSource();
      windSource.buffer = noiseBuffer;
      const windFilter = ctx.createBiquadFilter();
      windFilter.type = "bandpass";
      windFilter.frequency.setValueAtTime(280, t0);
      windFilter.Q.setValueAtTime(1.8, t0);
      const windGain = ctx.createGain();
      windGain.gain.setValueAtTime(0.001, t0);
      windGain.gain.linearRampToValueAtTime(0.08, t0 + 2.5);
      windGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 7.5);
      windSource.connect(windFilter);
      windFilter.connect(windGain);
      windGain.connect(this.masterGain);
      windSource.start(t0);
      windSource.stop(t0 + 8.0);
      this.scheduledNodes.push(windSource);

      // Root Tanpura Fundamental (C2 - 65.41 Hz)
      const droneOsc = ctx.createOscillator();
      const droneFilter = ctx.createBiquadFilter();
      const droneGain = ctx.createGain();
      droneOsc.type = "sawtooth";
      droneOsc.frequency.setValueAtTime(65.41, t0);
      droneFilter.type = "lowpass";
      droneFilter.frequency.setValueAtTime(160, t0);
      droneFilter.frequency.linearRampToValueAtTime(420, t0 + 40.0);

      droneGain.gain.setValueAtTime(0.001, t0);
      droneGain.gain.linearRampToValueAtTime(0.22, t0 + 3.0);
      droneGain.gain.setValueAtTime(0.22, t0 + 56.0);
      droneGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 60.0);

      droneOsc.connect(droneFilter);
      droneFilter.connect(droneGain);
      droneGain.connect(this.masterGain);
      droneOsc.start(t0);
      droneOsc.stop(t0 + 60.0);
      this.scheduledNodes.push(droneOsc);

      // Tanpura Pa Harmonic (G2 - 98.00 Hz)
      const paOsc = ctx.createOscillator();
      const paGain = ctx.createGain();
      paOsc.type = "sine";
      paOsc.frequency.setValueAtTime(98.00, t0);
      paGain.gain.setValueAtTime(0.001, t0);
      paGain.gain.linearRampToValueAtTime(0.15, t0 + 2.0);
      paGain.gain.setValueAtTime(0.15, t0 + 56.0);
      paGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 60.0);
      paOsc.connect(paGain);
      paGain.connect(this.masterGain);
      paOsc.start(t0);
      paOsc.stop(t0 + 60.0);
      this.scheduledNodes.push(paOsc);

      // =======================================================================
      // 2. SOFT BANSURI (INDIAN FLUTE) THEME (0:01 - 0:16 & 0:44 - 0:58)
      // Traditional Raag Yaman / Vande Mataram Phrasing (Sa Re Ga Ma# Pa Dha Ni Sa)
      // =======================================================================
      const flutePhrases = [
        // Scene 1: Flag Reveal Motif (0:01 - 0:08)
        { time: 1.0, dur: 2.2, freq: 523.25 }, // Sa
        { time: 2.8, dur: 1.6, freq: 587.33 }, // Re
        { time: 4.2, dur: 2.8, freq: 659.25 }, // Ga
        { time: 6.6, dur: 2.0, freq: 783.99 }, // Pa

        // Scene 2: Bacchon Ka India (0:08 - 0:16)
        { time: 8.8, dur: 1.8, freq: 880.00 }, // Dha
        { time: 10.4, dur: 1.6, freq: 987.77 }, // Ni
        { time: 11.8, dur: 3.2, freq: 1046.50 }, // Taar Sa
        { time: 14.6, dur: 2.2, freq: 880.00 }, // Dha

        // Scene 4: Young India Melodic Accent (0:26 - 0:34)
        { time: 26.5, dur: 2.0, freq: 659.25 },
        { time: 28.3, dur: 2.0, freq: 783.99 },
        { time: 30.1, dur: 3.0, freq: 1046.50 },

        // Scene 6: Freedom to Dream Theme (0:44 - 0:50)
        { time: 44.2, dur: 2.2, freq: 659.25 }, // Ga
        { time: 46.2, dur: 2.0, freq: 783.99 }, // Pa
        { time: 48.0, dur: 3.4, freq: 1046.50 }, // Sa

        // Scene 7: Grand Finale Crescendo (0:52 - 0:58)
        { time: 52.0, dur: 1.8, freq: 783.99 }, // Pa
        { time: 53.6, dur: 1.8, freq: 880.00 }, // Dha
        { time: 55.2, dur: 2.2, freq: 987.77 }, // Ni
        { time: 57.0, dur: 3.5, freq: 1046.50 }, // High Sa
      ];

      flutePhrases.forEach(({ time, dur, freq }) => {
        const fOsc = ctx.createOscillator();
        const fGain = ctx.createGain();
        const fFilter = ctx.createBiquadFilter();

        fOsc.type = "sine";
        fOsc.frequency.setValueAtTime(freq, t0 + time);
        // Realistic human breath vibrato
        fOsc.frequency.linearRampToValueAtTime(freq * 1.004, t0 + time + dur * 0.4);
        fOsc.frequency.linearRampToValueAtTime(freq * 0.996, t0 + time + dur * 0.7);
        fOsc.frequency.linearRampToValueAtTime(freq, t0 + time + dur);

        fFilter.type = "lowpass";
        fFilter.frequency.setValueAtTime(2600, t0 + time);

        fGain.gain.setValueAtTime(0.001, t0 + time);
        fGain.gain.linearRampToValueAtTime(0.20, t0 + time + 0.35); // Soft breath
        fGain.gain.setValueAtTime(0.18, t0 + time + dur - 0.4);
        fGain.gain.exponentialRampToValueAtTime(0.0001, t0 + time + dur);

        fOsc.connect(fFilter);
        fFilter.connect(fGain);
        fGain.connect(this.masterGain!);

        fOsc.start(t0 + time);
        fOsc.stop(t0 + time + dur);
        this.scheduledNodes.push(fOsc);
      });

      // =======================================================================
      // 3. GENTLE PIANO ARPEGGIOS (0:04 - 0:45)
      // =======================================================================
      const pianoNotes = [
        // Scene 1 & 2 Piano
        { time: 4.0, freq: 261.63 }, { time: 5.2, freq: 329.63 }, { time: 6.4, freq: 392.00 }, { time: 7.6, freq: 523.25 },
        { time: 9.0, freq: 261.63 }, { time: 10.2, freq: 349.23 }, { time: 11.4, freq: 440.00 }, { time: 12.6, freq: 523.25 },
        // Scene 3 People of India Piano
        { time: 16.0, freq: 293.66 }, { time: 17.2, freq: 370.00 }, { time: 18.4, freq: 440.00 }, { time: 19.6, freq: 587.33 },
        { time: 21.0, freq: 261.63 }, { time: 22.2, freq: 329.63 }, { time: 23.4, freq: 392.00 }, { time: 24.6, freq: 659.25 },
        // Scene 4 Young India Piano
        { time: 26.0, freq: 349.23 }, { time: 27.2, freq: 440.00 }, { time: 28.4, freq: 523.25 }, { time: 29.6, freq: 698.46 },
        { time: 31.0, freq: 392.00 }, { time: 32.2, freq: 493.88 }, { time: 33.4, freq: 587.33 }, { time: 34.6, freq: 783.99 },
        // Scene 5 One India Piano
        { time: 36.0, freq: 523.25 }, { time: 37.0, freq: 659.25 }, { time: 38.0, freq: 783.99 }, { time: 39.0, freq: 1046.50 },
        { time: 40.5, freq: 587.33 }, { time: 41.5, freq: 739.99 }, { time: 42.5, freq: 880.00 }, { time: 43.5, freq: 1174.66 },
      ];

      pianoNotes.forEach(({ time, freq }) => {
        const pOsc = ctx.createOscillator();
        const pGain = ctx.createGain();
        pOsc.type = "sine";
        pOsc.frequency.setValueAtTime(freq, t0 + time);

        pGain.gain.setValueAtTime(0.12, t0 + time);
        pGain.gain.exponentialRampToValueAtTime(0.001, t0 + time + 2.2);

        pOsc.connect(pGain);
        pGain.connect(this.masterGain!);
        pOsc.start(t0 + time);
        pOsc.stop(t0 + time + 2.4);
        this.scheduledNodes.push(pOsc);
      });

      // =======================================================================
      // 4. RICH ORCHESTRAL STRINGS & CELLO PROGRESSION (0:08 - 0:60)
      // =======================================================================
      const stringChords = [
        // Chord 1: C Major Dawn & Flag (8.0s - 16.0s)
        { start: 8.0, end: 16.0, notes: [130.81, 196.00, 261.63, 329.63, 493.88], gain: 0.14 },
        // Chord 2: F Major 9 Bacchon Ka India (16.0s - 25.0s)
        { start: 16.0, end: 25.0, notes: [174.61, 220.00, 261.63, 349.23, 440.00], gain: 0.16 },
        // Chord 3: A Minor 7 People of India (25.0s - 34.0s)
        { start: 25.0, end: 34.0, notes: [110.00, 164.81, 220.00, 261.63, 329.63], gain: 0.19 },
        // Chord 4: F -> G Young India Rise (34.0s - 43.0s)
        { start: 34.0, end: 43.0, notes: [174.61, 220.00, 293.66, 392.00, 493.88], gain: 0.22 },
        // Chord 5: Grand Orchestral Expansion One India (43.0s - 51.0s)
        { start: 43.0, end: 51.0, notes: [130.81, 196.00, 261.63, 329.63, 392.00, 523.25, 659.25], gain: 0.26 },
        // Chord 6: Majestic Patriotic Finale (51.0s - 60.0s)
        { start: 51.0, end: 60.0, notes: [130.81, 196.00, 261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50], gain: 0.32 }
      ];

      stringChords.forEach(({ start, end, notes, gain }) => {
        notes.forEach((freq) => {
          const sOsc = ctx.createOscillator();
          const sGain = ctx.createGain();
          const sFilter = ctx.createBiquadFilter();

          sOsc.type = "sawtooth";
          sOsc.frequency.setValueAtTime(freq, t0 + start);

          sFilter.type = "lowpass";
          sFilter.frequency.setValueAtTime(950, t0 + start);
          sFilter.frequency.linearRampToValueAtTime(2400, t0 + (start + end) / 2);

          sGain.gain.setValueAtTime(0.001, t0 + start);
          sGain.gain.linearRampToValueAtTime(gain, t0 + start + 1.2);
          sGain.gain.setValueAtTime(gain, t0 + end - 1.0);
          sGain.gain.exponentialRampToValueAtTime(0.0001, t0 + end);

          sOsc.connect(sFilter);
          sFilter.connect(sGain);
          sGain.connect(this.masterGain!);

          sOsc.start(t0 + start);
          sOsc.stop(t0 + end);
          this.scheduledNodes.push(sOsc);
        });
      });

      // =======================================================================
      // 5. NATURAL INDIAN TABLA & RHYTHMIC STROKES (0:16 - 0:56)
      // =======================================================================
      const tablaMoments = [
        // People of India (Scene 3: 16.0s - 25.0s)
        16.0, 17.5, 19.0, 20.5, 22.0, 23.5, 24.5,
        // Young India (Scene 4: 25.0s - 34.0s)
        26.0, 27.2, 28.4, 29.6, 30.8, 32.0, 33.2,
        // One India (Scene 5: 34.0s - 43.0s - Driving Cadence)
        34.5, 35.5, 36.5, 37.5, 38.5, 39.5, 40.5, 41.5, 42.5,
        // Grand Orchestral Build (Scene 6-7: 44.0s - 55.0s)
        44.0, 45.5, 47.0, 48.5, 50.0, 51.5, 53.0, 54.5
      ];

      tablaMoments.forEach((stTime) => {
        // Low Bayan Pulse
        const bOsc = ctx.createOscillator();
        const bGain = ctx.createGain();
        bOsc.type = "sine";
        bOsc.frequency.setValueAtTime(90, t0 + stTime);
        bOsc.frequency.exponentialRampToValueAtTime(45, t0 + stTime + 0.25);
        bGain.gain.setValueAtTime(0.24, t0 + stTime);
        bGain.gain.exponentialRampToValueAtTime(0.001, t0 + stTime + 0.28);
        bOsc.connect(bGain);
        bGain.connect(this.masterGain!);
        bOsc.start(t0 + stTime);
        bOsc.stop(t0 + stTime + 0.3);
        this.scheduledNodes.push(bOsc);

        // Dayan Resonant Tone (Sa)
        const dOsc = ctx.createOscillator();
        const dGain = ctx.createGain();
        dOsc.type = "triangle";
        dOsc.frequency.setValueAtTime(261.63, t0 + stTime + 0.04);
        dGain.gain.setValueAtTime(0.09, t0 + stTime + 0.04);
        dGain.gain.exponentialRampToValueAtTime(0.001, t0 + stTime + 0.22);
        dOsc.connect(dGain);
        dGain.connect(this.masterGain!);
        dOsc.start(t0 + stTime + 0.04);
        dOsc.stop(t0 + stTime + 0.25);
        this.scheduledNodes.push(dOsc);
      });

      // =======================================================================
      // 6. CINEMATIC IMPACT & PATRIOTIC JAI HIND CHIMES (0:51 - 1:00)
      // =======================================================================
      // Sub-Bass Bloom on Flag & AIJobs Finale at 51.0s
      const finaleImpactOsc = ctx.createOscillator();
      const finaleImpactGain = ctx.createGain();
      finaleImpactOsc.type = "sine";
      finaleImpactOsc.frequency.setValueAtTime(105, t0 + 51.0);
      finaleImpactOsc.frequency.exponentialRampToValueAtTime(32, t0 + 53.0);
      finaleImpactGain.gain.setValueAtTime(0.40, t0 + 51.0);
      finaleImpactGain.gain.exponentialRampToValueAtTime(0.001, t0 + 55.5);
      finaleImpactOsc.connect(finaleImpactGain);
      finaleImpactGain.connect(this.masterGain);
      finaleImpactOsc.start(t0 + 51.0);
      finaleImpactOsc.stop(t0 + 56.0);
      this.scheduledNodes.push(finaleImpactOsc);

      // Shimmering harmonic bells & chimes
      [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98].forEach((freq, idx) => {
        const cOsc = ctx.createOscillator();
        const cGain = ctx.createGain();
        cOsc.type = "sine";
        cOsc.frequency.setValueAtTime(freq, t0 + 51.5 + idx * 0.1);
        cGain.gain.setValueAtTime(0.08, t0 + 51.5 + idx * 0.1);
        cGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 59.5);
        cOsc.connect(cGain);
        cGain.connect(this.masterGain!);
        cOsc.start(t0 + 51.5 + idx * 0.1);
        cOsc.stop(t0 + 60.0);
        this.scheduledNodes.push(cOsc);
      });

      // Master fade out ending gracefully at 60.0s
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.18, t0 + 58.5);
      this.masterGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 60.0);

      return true;
    } catch (e) {
      console.warn("[IndependenceDayAudioEngine] Audio note:", e);
      return false;
    }
  }

  public setMute(mute: boolean) {
    if (this.audioElement) {
  this.audioElement.muted = mute;
}
    this.isMuted = mute;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(mute ? 0 : 0.18, this.ctx.currentTime);
    }
  }

  public toggleMute(): boolean {
  this.setMute(!this.isMuted);
  return this.isMuted;
}

public getIsMuted(): boolean {
  return this.isMuted;
}

public stopAudio() {
  if (this.audioElement) {
    this.audioElement.pause();
    this.audioElement.currentTime = 0;
  }

  this.isPlaying = false;

  this.scheduledNodes.forEach((node) => {
    try {
      node.stop();
    } catch {}
  });

  this.scheduledNodes = [];
}
}

export const independenceAudio = new IndependenceDayAudioEngine();
