class RetroAudioEngine {
  private ctx: AudioContext | null = null;
  public muted: boolean = false;
  public musicEnabled: boolean = true;
  public voiceEnabled: boolean = false;
  private lastVoiceTime = -10000;
  private voicePlaying = false;
  private voiceClips: Record<string, string> = {};
  private currentClip: HTMLAudioElement | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      fetch('/assets/audio/voice-manifest.json').then(r => r.ok ? r.json() : {}).then(clips => { this.voiceClips = clips; }).catch(() => {});
    }
  }
  public sfxVolume: number = 0.7;
  public musicVolume: number = 0.35;
  private musicInterval: number | null = null;
  private noteIndex: number = 0;

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(mute: boolean) {
    this.muted = mute;
    if (mute) {
      this.currentClip?.pause(); this.currentClip = null; this.voicePlaying = false;
      if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
      this.stopMusic();
    }
  }

  public setVoiceEnabled(enabled: boolean) {
    this.voiceEnabled = enabled;
    if (!enabled) {
      this.currentClip?.pause(); this.currentClip = null; this.voicePlaying = false;
      if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
    }
  }

  public playJump() {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Pitch-varied +/- 6% retro square boing
    const variance = 0.96 + Math.random() * 0.08;
    osc.type = 'square';
    osc.frequency.setValueAtTime(190 * variance, now);
    osc.frequency.exponentialRampToValueAtTime(540 * variance, now + 0.14);

    gain.gain.setValueAtTime(0.14 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  public playLand(impactVy: number = 220) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const intensity = Math.min(1.4, Math.max(0.5, impactVy / 350));

    // 1. Warm sneaker sole thud on stone tile
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(135 * intensity, now);
    osc.frequency.exponentialRampToValueAtTime(48, now + 0.065);
    gain.gain.setValueAtTime(0.16 * intensity * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.072);

    // 2. Subtle silver Cuban link chain clink on landing
    const clink = ctx.createOscillator();
    const clinkGain = ctx.createGain();
    clink.type = 'sine';
    clink.frequency.setValueAtTime(1680, now + 0.015);
    clink.frequency.exponentialRampToValueAtTime(2120, now + 0.055);
    clinkGain.gain.setValueAtTime(0.05 * intensity * this.sfxVolume, now + 0.015);
    clinkGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    clink.connect(clinkGain);
    clinkGain.connect(ctx.destination);
    clink.start(now + 0.015);
    clink.stop(now + 0.062);
  }

  public playStomp(combo: number = 1) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const pitchBoost = 1 + Math.min(combo - 1, 7) * 0.09;

    // 1. Comedic squish downward slide
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(360 * pitchBoost, now);
    osc1.frequency.exponentialRampToValueAtTime(85, now + 0.08);
    gain1.gain.setValueAtTime(0.22 * this.sfxVolume, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.09);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.09);

    // 2. High comic bounce arpeggio
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(320 * pitchBoost, now + 0.05);
    osc2.frequency.exponentialRampToValueAtTime(780 * pitchBoost, now + 0.21);
    gain2.gain.setValueAtTime(0.24 * this.sfxVolume, now + 0.05);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.05);
    osc2.stop(now + 0.22);
  }

  public playCrateBreak() {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // White noise burst + low wood thud
    const bufferSize = ctx.sampleRate * 0.14;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(900, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.28 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
  }

  public playChainPickup() {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    // Classic 2-tone coin/chain chime (B5 -> E6)
    osc.frequency.setValueAtTime(987.77, now);
    osc.frequency.setValueAtTime(1318.51, now + 0.065);

    gain.gain.setValueAtTime(0.15 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.24);
  }

  public playScooterPickup() {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Luxury Richard Mille Tourbillon Power-Chime Arpeggio (C5 -> E5 -> G5 -> C6)
    const playChime = (startTime: number, freq: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.2 * this.sfxVolume, startTime);
      gain.gain.exponentialRampToValueAtTime(0.005, startTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.125);
    };

    playChime(now, 523.25);
    playChime(now + 0.08, 659.25);
    playChime(now + 0.16, 783.99);
    playChime(now + 0.24, 1046.5);
  }

  public speakFrenchCallout(text: string) {
    if (this.muted || !this.voiceEnabled || typeof window === 'undefined') return;
    const now = performance.now();
    if (this.voicePlaying || now - this.lastVoiceTime < 5000) return;
    this.lastVoiceTime = now;
    this.voicePlaying = true;
    const finish = () => { this.voicePlaying = false; };
    const clip = this.voiceClips[text];
    if (clip) {
      const audio = new Audio(clip); this.currentClip = audio; audio.volume = this.sfxVolume * .8;
      audio.onended = finish; audio.onerror = finish; audio.play().catch(finish); return;
    }
    // Optional neutral narrator; never presented as MC Pao's real voice.
    if (!('speechSynthesis' in window)) { finish(); return; }
    const utter = new SpeechSynthesisUtterance(text.replace(/8 000 €/g, 'huit mille euros').replace(/€/g,'euros'));
    utter.lang = 'fr-FR'; utter.rate = 1.02; utter.pitch = .95; utter.volume = Math.min(1,this.sfxVolume * .8);
    utter.onend = finish; utter.onerror = finish;
    window.speechSynthesis.speak(utter);
  }

  public playTelegraph() {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.linearRampToValueAtTime(620, now + 0.18);
    gain.gain.setValueAtTime(0.1 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.19);
  }

  public playHurt() {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(95, now + 0.25);
    gain.gain.setValueAtTime(0.24 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  public playVictoryFanfare() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const now = ctx.currentTime + idx * 0.11;
      const osc = ctx.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.16 * this.sfxVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    });
  }

  public playWaterSplash() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 1. Filtered Mediterranean wave splash noise
    const bufferSize = Math.floor(ctx.sampleRate * 0.16);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.45));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(620, now);
    filter.frequency.exponentialRampToValueAtTime(1450, now + 0.15);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.005, now + 0.16);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);

    // 2. Rising water bubble bloop
    const osc = ctx.createOscillator();
    const bGain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, now + 0.02);
    osc.frequency.exponentialRampToValueAtTime(680, now + 0.13);
    bGain.gain.setValueAtTime(0.12 * this.sfxVolume, now + 0.02);
    bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc.connect(bGain);
    bGain.connect(ctx.destination);
    osc.start(now + 0.02);
    osc.stop(now + 0.145);
  }

  public playYachtVipCheer() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    // Sparkling Riviera Champagne & Harp Glissando (F5 -> A5 -> C6 -> F6)
    const notes = [698.46, 880.0, 1046.5, 1396.91];
    notes.forEach((freq, idx) => {
      const now = ctx.currentTime + idx * 0.07;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.18 * this.sfxVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.002, now + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.19);
    });
  }

  public playLamboGetaway() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 1. Throaty V12 Lamborghini Double-Rev + Launch Acceleration Roar!
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(85, now);
    osc.frequency.exponentialRampToValueAtTime(230, now + 0.22);
    osc.frequency.setValueAtTime(140, now + 0.24);
    osc.frequency.exponentialRampToValueAtTime(390, now + 0.85);
    gain.gain.setValueAtTime(0.24 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.005, now + 0.9);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.92);

    // 2. Golden Victory Brass Fanfare over the V12 roar
    this.playVictoryFanfare();
  }

  public startMusic() {
    if (this.muted || !this.musicEnabled || this.musicInterval !== null) return;
    const ctx = this.ensureContext(); if (!ctx) return;
    // Original 86 BPM coastal groove: plucked motif, rounded bass and restrained drums.
    const melody = [587.33,0,698.46,0,880,783.99,0,698.46,659.25,0,587.33,0,523.25,0,659.25,0];
    const roots = [146.83,130.81,116.54,130.81];
    const noise = ctx.createBuffer(1,Math.floor(ctx.sampleRate*.08),ctx.sampleRate);
    const samples = noise.getChannelData(0); for(let i=0;i<samples.length;i++) samples[i]=(Math.random()*2-1)*(1-i/samples.length);
    const tone = (freq:number, type:OscillatorType, volume:number, duration:number, now:number) => {
      const osc=ctx.createOscillator(), gain=ctx.createGain();osc.type=type;osc.frequency.value=freq;
      gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),now+.008);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
      osc.connect(gain);gain.connect(ctx.destination);osc.start(now);osc.stop(now+duration+.01);
    };
    this.musicInterval=window.setInterval(()=>{
      if(this.muted||!this.musicEnabled||ctx.state!=='running')return;
      const step=this.noteIndex++%64, beat=step%16, now=ctx.currentTime;
      const volume=this.musicVolume*(this.voicePlaying ? .28 : 1);
      const note=melody[beat];if(note)tone(note,'triangle',.105*volume,.22,now);
      if(beat%4===0)tone(roots[Math.floor(step/16)],'sine',.23*volume,.36,now);
      if(beat===0||beat===8||beat===11){
        const osc=ctx.createOscillator(),g=ctx.createGain();osc.frequency.setValueAtTime(115,now);osc.frequency.exponentialRampToValueAtTime(42,now+.12);g.gain.setValueAtTime(.24*volume,now);g.gain.exponentialRampToValueAtTime(.0001,now+.15);osc.connect(g);g.connect(ctx.destination);osc.start(now);osc.stop(now+.16);
      }
      if(beat%2===0||beat===15){
        const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),g=ctx.createGain();src.buffer=noise;filter.type='highpass';filter.frequency.value=6500;g.gain.value=.05*volume;src.connect(filter);filter.connect(g);g.connect(ctx.destination);src.start(now);
      }
      if(beat===4||beat===12){tone(180,'triangle',.10*volume,.07,now);const src=ctx.createBufferSource(),g=ctx.createGain();src.buffer=noise;g.gain.value=.09*volume;src.connect(g);g.connect(ctx.destination);src.start(now);}
    },60000/86/4);
  }

  public stopMusic() {
    if (this.musicInterval !== null) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }
}

export const soundFX = new RetroAudioEngine();
