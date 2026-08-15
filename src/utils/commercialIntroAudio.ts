/**
 * 15-Second Ultra-Realistic Cinematic Commercial Soundtrack Engine for AIJobs
 * Original Web Audio API Composition
 * 
 * Musical Breakdown:
 * 0–3s:  Soft warm grand piano opening, deep cinematic sub-bass (42Hz), warm ambient dawn resonance
 * 3–6s:  Warm strings & cello swell, delicate acoustic piano arpeggio, inspiring candidate theme
 * 6–9s:  Subtle modern electronic pulse (120 BPM 16th arp), neural matching data chimes
 * 9–12s: Inspiring orchestral strings & brass rise, recruiter confirmation chime (Shortlist / Interview)
 * 12–15s: Grand cinematic logo reveal impact (sub-bass bloom + crystal chime + orchestral tail resolving cleanly)
 */

export class CommercialIntroAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isPlaying: boolean = false;
  private isMuted: boolean = false;
  private startTime: number = 0;
  private scheduledNodes: Array<{ stop?: (time?: number) => void }> = [];

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

      this.stopAudio();

      this.masterGain = ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.75, ctx.currentTime);
      this.masterGain.connect(ctx.destination);

      this.startTime = ctx.currentTime;
      this.isPlaying = true;
      this.scheduledNodes = [];

      const t0 = this.startTime;

      // =======================================================================
      // 1. DEEP CINEMATIC SUB-BASS FOUNDATION (0.0s - 15.0s)
      // =======================================================================
      const subOsc = ctx.createOscillator();
      subOsc.type = "sine";
      subOsc.frequency.setValueAtTime(43.65, t0); // F1
      subOsc.frequency.setValueAtTime(43.65, t0 + 3.0);
      subOsc.frequency.setValueAtTime(48.99, t0 + 6.0); // G1
      subOsc.frequency.setValueAtTime(55.00, t0 + 9.0); // A1
      subOsc.frequency.setValueAtTime(65.41, t0 + 12.0); // C2

      const subGain = ctx.createGain();
      subGain.gain.setValueAtTime(0.001, t0);
      subGain.gain.linearRampToValueAtTime(0.24, t0 + 1.2);
      subGain.gain.setValueAtTime(0.24, t0 + 12.0);
      subGain.gain.linearRampToValueAtTime(0.38, t0 + 12.5);
      subGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 14.8);

      subOsc.connect(subGain);
      subGain.connect(this.masterGain);
      subOsc.start(t0);
      subOsc.stop(t0 + 15.0);
      this.scheduledNodes.push(subOsc);

      // =======================================================================
      // 2. SOFT WARM GRAND PIANO PROGRESSION (0–12s)
      // =======================================================================
      const playPianoNote = (freq: number, startTime: number, duration: number, velocity: number = 0.22) => {
        const osc = ctx.createOscillator();
        const oscHarmonic = ctx.createOscillator();
        const noteGain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = "triangle";
        oscHarmonic.type = "sine";
        osc.frequency.setValueAtTime(freq, startTime);
        oscHarmonic.frequency.setValueAtTime(freq * 2, startTime);

        filter.type = "lowpass";
        filter.frequency.setValueAtTime(1400, startTime);
        filter.frequency.exponentialRampToValueAtTime(320, startTime + duration);

        noteGain.gain.setValueAtTime(0.001, startTime);
        noteGain.gain.linearRampToValueAtTime(velocity, startTime + 0.03);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

        osc.connect(filter);
        oscHarmonic.connect(filter);
        filter.connect(noteGain);
        noteGain.connect(this.masterGain!);

        osc.start(startTime);
        oscHarmonic.start(startTime);
        osc.stop(startTime + duration);
        oscHarmonic.stop(startTime + duration);
        this.scheduledNodes.push(osc, oscHarmonic);
      };

      // 0–3s: Dawn & Entry Theme (F major 9 / C major)
      playPianoNote(174.61, t0 + 0.2, 3.2, 0.26); // F3
      playPianoNote(261.63, t0 + 0.4, 2.8, 0.22); // C4
      playPianoNote(329.63, t0 + 0.6, 2.8, 0.20); // E4
      playPianoNote(392.00, t0 + 0.9, 2.6, 0.24); // G4
      playPianoNote(523.25, t0 + 1.6, 2.4, 0.22); // C5
      playPianoNote(659.25, t0 + 2.2, 2.2, 0.18); // E5

      // 3–6s: Opportunity & Aspiration Theme (A minor 7 / G)
      playPianoNote(220.00, t0 + 3.2, 3.0, 0.26); // A3
      playPianoNote(261.63, t0 + 3.5, 2.8, 0.22); // C4
      playPianoNote(329.63, t0 + 3.8, 2.6, 0.24); // E4
      playPianoNote(440.00, t0 + 4.2, 2.5, 0.22); // A4
      playPianoNote(587.33, t0 + 4.8, 2.4, 0.20); // D5
      playPianoNote(659.25, t0 + 5.3, 2.2, 0.18); // E5

      // 6–9s: Smart Matching (D major / F#)
      playPianoNote(293.66, t0 + 6.2, 2.8, 0.26); // D4
      playPianoNote(369.99, t0 + 6.5, 2.6, 0.24); // F#4
      playPianoNote(440.00, t0 + 6.8, 2.5, 0.22); // A4
      playPianoNote(587.33, t0 + 7.2, 2.4, 0.24); // D5
      playPianoNote(739.99, t0 + 7.8, 2.2, 0.20); // F#5
      playPianoNote(880.00, t0 + 8.3, 2.0, 0.18); // A5

      // 9–12s: Recruiter & Shortlist Crescendo
      playPianoNote(329.63, t0 + 9.2, 2.8, 0.28); // E4
      playPianoNote(392.00, t0 + 9.5, 2.6, 0.26); // G4
      playPianoNote(493.88, t0 + 9.8, 2.6, 0.24); // B4
      playPianoNote(659.25, t0 + 10.3, 2.4, 0.26); // E5
      playPianoNote(783.99, t0 + 10.8, 2.2, 0.24); // G5
      playPianoNote(987.77, t0 + 11.3, 2.0, 0.22); // B5

      // =======================================================================
      // 3. WARM STRINGS & CELLO ENSEMBLE (3.0s - 14.8s)
      // =======================================================================
      const stringsFreqs = [220, 261.63, 329.63, 440];
      stringsFreqs.forEach((freq) => {
        const osc = ctx.createOscillator();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, t0 + 3.0);
        osc.frequency.linearRampToValueAtTime(freq * 1.122, t0 + 9.0);
        osc.frequency.linearRampToValueAtTime(freq * 1.259, t0 + 12.0);

        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(450, t0 + 3.0);
        filter.frequency.linearRampToValueAtTime(1200, t0 + 11.5);
        filter.frequency.exponentialRampToValueAtTime(280, t0 + 14.8);

        const sGain = ctx.createGain();
        sGain.gain.setValueAtTime(0.0001, t0 + 3.0);
        sGain.gain.linearRampToValueAtTime(0.08, t0 + 6.0);
        sGain.gain.linearRampToValueAtTime(0.16, t0 + 11.5);
        sGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 14.8);

        osc.connect(filter);
        filter.connect(sGain);
        sGain.connect(this.masterGain!);

        osc.start(t0 + 3.0);
        osc.stop(t0 + 15.0);
        this.scheduledNodes.push(osc);
      });

      // =======================================================================
      // 4. MODERN ELECTRONIC AI PULSE (6.0s - 11.5s)
      // =======================================================================
      for (let step = 0; step < 22; step++) {
        const stepTime = t0 + 6.0 + step * 0.24;
        const pulseOsc = ctx.createOscillator();
        pulseOsc.type = "sine";
        const baseFreq = 523.25 + (step % 4) * 65.4;
        pulseOsc.frequency.setValueAtTime(baseFreq, stepTime);

        const pulseGain = ctx.createGain();
        pulseGain.gain.setValueAtTime(0.001, stepTime);
        pulseGain.gain.linearRampToValueAtTime(0.04, stepTime + 0.02);
        pulseGain.gain.exponentialRampToValueAtTime(0.0001, stepTime + 0.18);

        pulseOsc.connect(pulseGain);
        pulseGain.connect(this.masterGain);
        pulseOsc.start(stepTime);
        pulseOsc.stop(stepTime + 0.2);
        this.scheduledNodes.push(pulseOsc);
      }

      // =======================================================================
      // 5. RECRUITER SHORTLIST & SCHEDULED CHIME (9.5s & 10.8s)
      // =======================================================================
      const playChime = (time: number, f1: number, f2: number) => {
        [f1, f2].forEach((freq) => {
          const osc = ctx.createOscillator();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, time);

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.001, time);
          gain.gain.linearRampToValueAtTime(0.09, time + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, time + 1.2);

          osc.connect(gain);
          gain.connect(this.masterGain!);
          osc.start(time);
          osc.stop(time + 1.2);
          this.scheduledNodes.push(osc);
        });
      };

      playChime(t0 + 9.6, 880, 1318.5); // Shortlist Chime (A5 + E6)
      playChime(t0 + 10.9, 1046.5, 1567.98); // Scheduled Chime (C6 + G6)

      // =======================================================================
      // 6. GRAND LOGO REVEAL IMPACT & SHIMMER (12.0s - 15.0s)
      // =======================================================================
      // Sub-Bass Boom
      const boomOsc = ctx.createOscillator();
      boomOsc.type = "sine";
      boomOsc.frequency.setValueAtTime(110, t0 + 12.0);
      boomOsc.frequency.exponentialRampToValueAtTime(32, t0 + 13.6);

      const boomGain = ctx.createGain();
      boomGain.gain.setValueAtTime(0.001, t0 + 12.0);
      boomGain.gain.linearRampToValueAtTime(0.45, t0 + 12.08);
      boomGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 14.8);

      boomOsc.connect(boomGain);
      boomGain.connect(this.masterGain);
      boomOsc.start(t0 + 12.0);
      boomOsc.stop(t0 + 15.0);
      this.scheduledNodes.push(boomOsc);

      // Crystalline Harmonic Shimmer (F5, A5, C6, E6, G6)
      const shimmerNotes = [698.46, 880.00, 1046.50, 1318.51, 1567.98, 2093.00];
      shimmerNotes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, t0 + 12.0 + idx * 0.03);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.001, t0 + 12.0 + idx * 0.03);
        gain.gain.linearRampToValueAtTime(0.08, t0 + 12.12 + idx * 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 14.7);

        osc.connect(gain);
        gain.connect(this.masterGain!);
        osc.start(t0 + 12.0);
        osc.stop(t0 + 15.0);
        this.scheduledNodes.push(osc);
      });

      return true;
    } catch (e) {
      console.warn("Commercial audio engine initialization error:", e);
      return false;
    }
  }

  public stopAudio(): void {
    try {
      this.scheduledNodes.forEach((node) => {
        try {
          if (node.stop) node.stop();
        } catch (e) {}
      });
      this.scheduledNodes = [];
      if (this.masterGain && this.ctx) {
        this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
      }
      this.isPlaying = false;
    } catch (e) {}
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.75, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }
}

export const commercialAudio = new CommercialIntroAudioEngine();
export default commercialAudio;
