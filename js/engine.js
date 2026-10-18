import { FREQS, KEY_MAP } from './config.js';

/** Audio engine: signal flow, carrier, 20-band vocoder, pitch and parameters. */
export class Engine {

    constructor() {
        this.ctx = null; this.isActive = false; this.initPromise = null;
        this.voices = new Map(); this.latch = false; this.demoActive = false; this.demoStop = false;
        this.base = 41;           // F2 (VC-10: 32 keys, F to C)
        this.n = 32;
        this.freqs = FREQS;
        // Layout-independent mapping (event.code). Z-row = F2..A3, Q-row = C4..C5
        this.keyMap = KEY_MAP;
        this.rec = { mr: null, chunks: [], on: false, t0: 0, timer: null };
    }

    $(id) { return document.getElementById(id); }

    k(id, d = 0) { const e = this.$(id); return e ? parseFloat(e.dataset.val) / 100 : d; }

    set(param, v) { param.setTargetAtTime(v, this.ctx.currentTime, 0.02); }

    init() { return this.initPromise || (this.initPromise = this._init()); }

    async _init() {
        const C = window.AudioContext || window.webkitAudioContext;
        const ctx = this.ctx = new C();

        // Block diagram: Simulator -> OUTPUT BALANCE -> ENSEMBLE -> FINAL OUT
        this.wetGain = ctx.createGain();   // SIMULATOR side
        this.dryGain = ctx.createGain();   // MIC side
        const bal = ctx.createGain();
        this.ens = this.createEnsemble();
        this.master = ctx.createGain();
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -6; comp.ratio.value = 4;
        this.wetGain.connect(bal); this.dryGain.connect(bal);
        bal.connect(this.ens.input); this.ens.output.connect(this.master);
        this.master.connect(comp); comp.connect(ctx.destination);
        this.recordDestination = ctx.createMediaStreamDestination();
        comp.connect(this.recordDestination);

        this.micGain = ctx.createGain();
        this.micGain.connect(this.dryGain);
        this.demoBus = ctx.createGain(); this.demoBus.connect(this.dryGain);   // easter-egg voice
        await this.setupMic();

        // Carrier: keyboard + noise generator
        this.carrier = ctx.createGain();
        this.kbdGain = ctx.createGain(); this.noiseGain = ctx.createGain();
        this.kbdGain.connect(this.carrier); this.noiseGain.connect(this.carrier);
        this.buildNoise();
        this.vibLFO = ctx.createOscillator(); this.vibGain = ctx.createGain();
        this.vibLFO.connect(this.vibGain); this.vibLFO.start();
        this.buildBank();
        this.setupAnalyzer();

        if (ctx.state === 'suspended') await ctx.resume();
        this.isActive = true;
        this.updateParams(true);
    }

    async setupMic() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }, video: false
            });
            const src = this.ctx.createMediaStreamSource(stream);
            const pre = this.ctx.createBiquadFilter();   // pre-emphasis for consonants
            pre.type = 'highshelf'; pre.frequency.value = 3000; pre.gain.value = 8;
            const mc = this.ctx.createDynamicsCompressor();
            mc.threshold.value = -24; mc.ratio.value = 8; mc.attack.value = 0.005;
            src.connect(pre); pre.connect(mc); mc.connect(this.micGain);
            this.$('btn-power').classList.add('is-active');
            const s = this.$('status-mic'); s.innerText = 'MIC: ACTIVE'; s.classList.replace('opacity-40', 'opacity-100');
        } catch (e) {
            if (!this.demoActive) alert('Microphone access is required for the vocoder modulator.');
        }
    }

    buildBank() {
        const ctx = this.ctx;
        // full-wave rectifier
        const rc = new Float32Array(4097);
        for (let i = 0; i < rc.length; i++) rc[i] = Math.abs(i * 2 / (rc.length - 1) - 1);
        // VCA control clamp: no negative gain, soft ceiling
        const cc = new Float32Array(4097);
        for (let i = 0; i < cc.length; i++) { const x = i * 2 / (cc.length - 1) - 1; cc[i] = x <= 0 ? 0 : Math.tanh(1.5 * x); }

        this.bandSum = ctx.createGain();
        this.bandSum.connect(this.wetGain);

        const bp = (f) => { const b = ctx.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = f; b.Q.value = 5; return b; };
        this.freqs.forEach(f => {
            const m1 = bp(f), m2 = bp(f);
            this.micGain.connect(m1); this.demoBus.connect(m1); m1.connect(m2);
            const rect = ctx.createWaveShaper(); rect.curve = rc;
            const env = ctx.createBiquadFilter(); env.type = 'lowpass'; env.frequency.value = 25;
            const boost = ctx.createGain(); boost.gain.value = 26;
            const clamp = ctx.createWaveShaper(); clamp.curve = cc;
            m2.connect(rect); rect.connect(env); env.connect(boost); boost.connect(clamp);

            const c1 = bp(f), c2 = bp(f);
            this.carrier.connect(c1); c1.connect(c2);
            const vca = ctx.createGain(); vca.gain.value = 0;
            c2.connect(vca); clamp.connect(vca.gain);
            vca.connect(this.bandSum);
        });
    }

    buildNoise() {
        // Full-band white noise (VC-10 noise generator), always running
        const ctx = this.ctx, len = ctx.sampleRate * 2;
        const buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
        src.connect(this.noiseGain); src.start();
    }

    createEnsemble() {
        // 3-phase chorus, applied AFTER output balance (per manual)
        const c = this.ctx, input = c.createGain(), output = c.createGain();
        const dry = c.createGain(), wet = c.createGain(), merger = c.createChannelMerger(2);
        input.connect(dry); dry.connect(output);
        const pans = [[1, 0], [0.7, 0.7], [0, 1]];
        for (let i = 0; i < 3; i++) {
            const ph = i * 2 * Math.PI / 3;
            const wave = c.createPeriodicWave(new Float32Array([0, Math.sin(ph)]), new Float32Array([0, Math.cos(ph)]), { disableNormalization: true });
            const lfo = c.createOscillator(); lfo.setPeriodicWave(wave); lfo.frequency.value = 0.55;
            const depth = c.createGain(); depth.gain.value = 0.003;
            const delay = c.createDelay(0.1); delay.delayTime.value = 0.015;
            lfo.connect(depth); depth.connect(delay.delayTime); lfo.start();
            input.connect(delay);
            const l = c.createGain(), r = c.createGain(); l.gain.value = pans[i][0]; r.gain.value = pans[i][1];
            delay.connect(l); delay.connect(r); l.connect(merger, 0, 0); r.connect(merger, 0, 1);
        }
        merger.connect(wet); wet.gain.value = 0; wet.connect(output);
        return { input, output, wet };
    }

    freq(m) {
        const up = this.$('btn-octave').innerText.includes("8'");
        const cents = this.k('knob-tune', 0.5) * 200 - 100;                 // +/-100 cents
        const wheel = parseFloat(this.$('ctrl-pitch-wheel').value);         // +/-7 semitones (a fifth)
        return 440 * Math.pow(2, ((up ? m + 12 : m) - 69 + wheel + cents / 100) / 12);
    }

    noteOn(m) {
        if (!this.isActive) { const s = this.$('status-mic'); s.innerText = 'PRESS POWER'; s.classList.replace('opacity-40', 'opacity-100'); return; }
        if (this.voices.has(m)) { if (this.latch) this.noteOff(m, true); return; }
        const ctx = this.ctx, t = ctx.currentTime, f = this.freq(m);
        const mults = [1, 1, 0.5], types = ['sawtooth', 'square', 'square'];
        const oscs = types.map((ty, i) => { const o = ctx.createOscillator(); o.type = ty; o.frequency.value = f * mults[i]; return o; });
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.4, t + 0.005);   // click-free
        const acc = this.k('knob-accent');
        oscs.forEach(o => {
            if (acc > 0) { o.detune.setValueAtTime(-acc * 150, t); o.detune.linearRampToValueAtTime(0, t + 0.12); } // ACCENT BEND: pitch scoops up on key strike
            this.vibGain.connect(o.detune); o.connect(g); o.start(t);
        });
        g.connect(this.kbdGain);
        this.voices.set(m, { oscs, g, mults });
        const el = document.querySelector(`[data-note="${m}"]`); if (el) el.classList.add('active-key');
    }

    noteOff(m, force = false) {
        const v = this.voices.get(m); if (!v) return;
        if (this.latch && !force) return;
        const t = this.ctx.currentTime;
        v.g.gain.cancelScheduledValues(t); v.g.gain.setTargetAtTime(0, t, 0.01);
        v.oscs.forEach(o => o.stop(t + 0.1));
        setTimeout(() => { v.oscs.forEach(o => { try { this.vibGain.disconnect(o.detune); } catch (e) {} }); v.g.disconnect(); }, 160);
        this.voices.delete(m);
        const el = document.querySelector(`[data-note="${m}"]`); if (el) el.classList.remove('active-key');
    }

    releaseAll() { [...this.voices.keys()].forEach(n => this.noteOff(n, true)); }

    updatePitches() {
        if (!this.isActive) return;
        this.voices.forEach((v, m) => v.oscs.forEach((o, i) => this.set(o.frequency, this.freq(m) * v.mults[i])));
    }

    updateParams(immediate = false) {
        if (!this.isActive) return;
        const P = (param, v) => immediate ? (param.value = v) : this.set(param, v);
        const q = Math.PI / 2;
        const bal = this.k('knob-in-bal');                       // KBD (0) <-> NOISE (10)
        P(this.kbdGain.gain, Math.cos(bal * q));
        P(this.noiseGain.gain, Math.sin(bal * q) * 0.6);
        P(this.micGain.gain, this.demoActive ? 0 : this.k('knob-mic-lvl') * 2);
        const out = this.k('knob-out-bal');                      // SIMULATOR (0) <-> MIC (10)
        P(this.wetGain.gain, Math.cos(out * q));
        P(this.dryGain.gain, Math.sin(out * q));
        P(this.master.gain, this.$('knob-final-vol') ? this.k('knob-final-vol') : 0.8);
        this.vibLFO.frequency.value = 1 + this.k('knob-v-speed') * 9;      // SLOW..FAST
        P(this.vibGain.gain, this.k('knob-v-depth') * 50);                 // cents
        P(this.ens.wet.gain, this.$('btn-ensemble').innerText === 'ON' ? 0.7 : 0);
        this.updatePitches();
    }
}
