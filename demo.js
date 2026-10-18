/** Easter egg: click any chassis screw. A formant 'fake voice' drives the vocoder
 *  in place of the mic. Phrases are 'sound:ms' strings (see demoScript). */
export const withDemo = Base => class extends Base {

    async sleep(ms) { for (let t = 0; t < ms && !this.demoStop; t += 50) await new Promise(r => setTimeout(r, Math.min(50, ms - t))); }

    makeVoice() {
        const c = this.ctx, out = this.demoBus;
        const src = c.createOscillator(); src.type = 'sawtooth'; src.frequency.value = 118;
        const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 5.5; lg.gain.value = 3;
        lfo.connect(lg); lg.connect(src.frequency);
        const amp = c.createGain(); amp.gain.value = 0; amp.connect(out);
        const F = [0, 1, 2].map(i => {
            const b = c.createBiquadFilter(), g = c.createGain();
            b.type = 'bandpass'; b.Q.value = [8, 10, 12][i]; g.gain.value = [1, 0.7, 0.4][i];
            src.connect(b); b.connect(g); g.connect(amp); return b;
        });
        const nb = c.createBuffer(1, c.sampleRate, c.sampleRate), d = nb.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        const ns = c.createBufferSource(); ns.buffer = nb; ns.loop = true;
        const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 6000; bp.Q.value = 0.8;
        const fa = c.createGain(); fa.gain.value = 0;
        ns.connect(bp); bp.connect(fa); fa.connect(out);
        src.start(); lfo.start(); ns.start();
        // vowels: formants F1-F3
        const V = { a: [800, 1200, 2500], ae: [700, 1600, 2500], e: [550, 1800, 2500], i: [300, 2300, 3000], ih: [400, 1900, 2600],
                    o: [500, 900, 2400], u: [320, 800, 2400], uh: [650, 1100, 2400], er: [500, 1350, 1700] };
        // voiced consonants: [formants, voicing amp, hiss freq, hiss amp]
        const C = { v: [[250, 1100, 2300], 0.3, 3500, 0.25], l: [[360, 1100, 2500], 0.45], n: [[250, 1100, 2400], 0.3],
                    m: [[250, 1000, 2200], 0.3], w: [[300, 700, 2300], 0.45] };
        // noise consonants: [hiss freq, hiss amp, plosive?, voicing amp]
        const U = { s: [6500, 0.6, false, 0], t: [4500, 0.55, true, 0], k: [2200, 0.55, true, 0], p: [1200, 0.5, true, 0],
                    d: [3500, 0.45, true, 0.15], b: [1500, 0.45, true, 0.15], g: [2000, 0.45, true, 0.15], j: [5000, 0.5, false, 0.25] };
        return {
            ph: (k, ms) => {
                const s = ms / 1000, t = c.currentTime, set = f => F.forEach((b, i) => b.frequency.setTargetAtTime(f[i], t, 0.015));
                amp.gain.cancelScheduledValues(t); fa.gain.cancelScheduledValues(t);
                if (V[k]) { set(V[k]); amp.gain.setTargetAtTime(0.5, t, 0.02); amp.gain.setTargetAtTime(0, t + s * 0.92, 0.015); }
                else if (C[k]) {
                    const [f, a, hf, ha] = C[k]; set(f);
                    amp.gain.setTargetAtTime(a, t, 0.02); amp.gain.setTargetAtTime(0, t + s * 0.92, 0.015);
                    if (ha) { bp.frequency.setValueAtTime(hf, t); fa.gain.setTargetAtTime(ha, t, 0.01); fa.gain.setTargetAtTime(0, t + s * 0.92, 0.015); }
                } else if (U[k]) {
                    const [hf, ha, plo, va] = U[k], b0 = plo ? s * 0.6 : 0;   // plosives: silent closure, then burst
                    bp.frequency.setValueAtTime(hf, t); set([500, 1400, 2400]);
                    if (va) { amp.gain.setTargetAtTime(va, t, 0.01); amp.gain.setTargetAtTime(0, t + (plo ? b0 : s * 0.9), 0.01); } else amp.gain.setTargetAtTime(0, t, 0.005);
                    fa.gain.setTargetAtTime(ha, t + b0, 0.004); fa.gain.setTargetAtTime(0, t + s * 0.95, 0.01);
                }
            },
            stop: () => { try { src.stop(); lfo.stop(); ns.stop(); } catch (e) {} amp.disconnect(); fa.disconnect(); }
        };
    }

    async talk(v, str, reps = 1) {   // "ph:ms ph:ms ..." ; '_' = pause
        const seq = str.trim().split(/\s+/).map(t => { const [k, ms] = t.split(':'); return [k, +ms]; });
        for (let r = 0; r < reps; r++) for (const [k, ms] of seq) {
            if (this.demoStop) return;
            if (k !== '_') v.ph(k, ms);
            await this.sleep(ms);
        }
    }

    async glide(id, to, ms) {
        const el = this.$(id), from = parseFloat(el.dataset.val), n = Math.max(1, Math.round(ms / 30));
        for (let i = 1; i <= n && !this.demoStop; i++) {
            const v = from + (to - from) * i / n; el.dataset.val = v; this.vis(el, v); this.updateParams(); await this.sleep(30);
        }
    }

    async glideWheel(to, ms) {
        const w = this.$('ctrl-pitch-wheel'), from = parseFloat(w.value), n = Math.max(1, Math.round(ms / 30));
        for (let i = 1; i <= n && !this.demoStop; i++) { w.value = from + (to - from) * i / n; this.updatePitches(); await this.sleep(30); }
    }

    async chords(list, ms) {
        for (const ns of list) {
            if (this.demoStop) break;
            ns.forEach(n => this.noteOn(n)); await this.sleep(ms); ns.forEach(n => this.noteOff(n, true));
        }
    }

    async runDemo() {
        if (this.demoActive) { this.demoStop = true; return; }
        this.demoActive = true; this.demoStop = false;
        const bolts = document.querySelectorAll('.rack-bolt'); bolts.forEach(b => b.classList.add('demo-on'));
        let saved = null, v = null;
        try {
            await this.init();                       // mic is muted during the demo; a denied prompt is fine
            if (this.ctx.state === 'suspended') await this.ctx.resume();
            saved = this.snapshot();
            this.releaseAll(); this.latch = false; this.$('btn-latch').classList.remove('active-toggle');
            this.updateParams();
            v = this.makeVoice();
            await this.demoScript(v);
        } catch (err) { console.error(err); }
        finally {
            if (v) v.stop();
            this.releaseAll(); this.demoActive = false; this.demoStop = false;
            bolts.forEach(b => b.classList.remove('demo-on'));
            if (saved) this.restore(saved);
        }
    }

    async demoScript(v) {
        const cap = t => { this.$('status-ptch').innerHTML = 'DEMO:<br>' + t; };
        const preset = n => { this.setPresetButton(n); this.applyPreset(n); };
        const alive = () => !this.demoStop;
        const WAVE = 'v:90 o:220 l:90 t:80 ih:140 j:120 _:60 ae:150 n:80 d:70 _:60 w:80 e:150 ih:120 v:100 _:300';   // "Voltage and Wave"
        const BAND = 't:70 w:70 e:130 n:80 t:60 i:200 _:60 b:70 ae:180 n:90 d:70 _:60 v:80 o:160 k:80 o:140 d:70 er:200 _:250'; // "Twenty band vocoder"

        preset('robot'); cap('ROBOT');
        await Promise.all([this.talk(v, WAVE, 4), this.chords([[41, 45, 48], [46, 50, 53], [48, 52, 55], [41, 45, 48]], 1910)]);
        if (!alive()) return;

        preset('classic'); cap('CLASSIC + NOISE');
        await Promise.all([this.talk(v, BAND, 3), this.chords([[43, 47, 50], [45, 48, 52], [46, 50, 53]], 2200)]);
        if (!alive()) return;

        cap('VIBRATO + ACCENT + WHEEL');
        await Promise.all([
            (async () => { await this.glide('knob-v-speed', 60, 400); await this.glide('knob-v-depth', 35, 400); await this.glide('knob-accent', 70, 400); })(),
            this.chords([[41, 48, 52, 57]], 4400),
            this.talk(v, 'l:100 a:1400 l:80 o:1400 l:80 e:1100 _:200'),
            (async () => { await this.sleep(1200); await this.glideWheel(4, 1400); await this.glideWheel(-4, 1400); await this.glideWheel(0, 600); })()
        ]);
        if (!alive()) return;

        preset('choir'); cap('CHOIR + ENSEMBLE');
        await Promise.all([this.talk(v, 'm:200 a:1900 o:2000 i:2000 e:1300 o:1500'),
            this.chords([[53, 57, 60, 64], [50, 53, 57, 62], [46, 50, 53, 58], [48, 52, 55, 60]], 2300)]);
        if (!alive()) return;

        preset('whisper'); cap('WHISPER (NOISE)');
        await this.talk(v, 'w:80 ih:130 s:150 p:80 er:220 _:200 t:70 w:70 e:130 n:80 t:60 i:200 _:200 v:80 o:160 k:80 o:140 d:70 er:200 _:400', 2);
        if (!alive()) return;

        preset('classic'); cap('OUT BAL: SIM > MIC');
        await Promise.all([this.talk(v, WAVE, 3), this.chords([[41, 45, 48]], 5800),
            (async () => { await this.glide('knob-out-bal', 100, 2800); await this.glide('knob-out-bal', 0, 2800); })()]);
        if (!alive()) return;

        preset('choir'); cap('VOLTAGE & WAVE');
        await Promise.all([this.talk(v, 'w:100 o:2500'), this.chords([[53, 57, 60, 65]], 2800)]);
    }

};
