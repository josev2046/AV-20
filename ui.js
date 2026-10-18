import { PRESETS } from './config.js';

/** Front panel: keyboard, knobs, buttons, presets and spectrum display. */
export const withUI = Base => class extends Base {

    buildKeyboard() {
        const kb = this.$('keyboardContainer'); kb.innerHTML = '';
        const labels = {};
        Object.entries(this.keyMap).forEach(([code, n]) => {
            labels[n] = ({ Comma: ',', Period: '.', Semicolon: ';', Slash: '/', Quote: "'", ShiftRight: '\u21E7' })[code] || code.replace('Key', '').replace('Digit', '');
        });
        const BLACK = [1, 3, 6, 8, 10];            // semitone index within octave (C=0)
        const totalWhite = 19; let w = 0;
        for (let i = 0; i < this.n; i++) {
            const m = this.base + i, black = BLACK.includes(m % 12);
            const el = document.createElement('div'); el.dataset.note = m;
            const hint = labels[m] ? `<span class="kbd-hint"${black ? ' style="color:#666;bottom:8px"' : ''}>${labels[m]}</span>` : '';
            if (black) { el.className = 'key-black'; el.style.left = `calc(4px + (100% - 8px) * ${w} / ${totalWhite})`; }
            else { el.className = 'key-white'; w++; }
            el.innerHTML = hint;
            el.addEventListener('pointerdown', e => { e.preventDefault(); this.noteOn(m); });
            ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => el.addEventListener(ev, e => { e.preventDefault(); this.noteOff(m); }));
            kb.appendChild(el);
        }
    }

    bindControls() {
        this.$('btn-power').addEventListener('click', () => this.init());
        document.querySelectorAll('.rack-bolt').forEach(b => b.addEventListener('click', () => this.runDemo()));

        const latchBtn = this.$('btn-latch');
        latchBtn.addEventListener('click', () => {
            this.latch = !this.latch; latchBtn.classList.toggle('active-toggle', this.latch);
            if (!this.latch) this.releaseAll();
        });

        const oct = this.$('btn-octave');
        oct.addEventListener('click', () => {
            const up = oct.innerText.includes("16'");
            oct.innerText = up ? "8' UP" : "16' NRM"; oct.classList.toggle('active-toggle', up);
            this.updatePitches();
        });

        const ens = this.$('btn-ensemble');
        ens.addEventListener('click', () => {
            const on = ens.innerText === 'OFF'; ens.innerText = on ? 'ON' : 'OFF'; ens.classList.toggle('active-toggle', on);
            this.updateParams();
        });

        // Pitch wheel: continuous, centre detent (as on the VC-10)
        const wheel = this.$('ctrl-pitch-wheel'); wheel.step = 0.05;
        wheel.addEventListener('input', () => { if (Math.abs(wheel.value) < 0.4) wheel.value = 0; this.updatePitches(); });

        document.addEventListener('keydown', e => {
            if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
            const n = this.keyMap[e.code]; if (n) { e.preventDefault(); this.noteOn(n); }
        });
        document.addEventListener('keyup', e => { const n = this.keyMap[e.code]; if (n) this.noteOff(n); });
        window.addEventListener('blur', () => { if (!this.latch) this.releaseAll(); });

        // Rotary knobs
        let knob = null, y0 = 0, v0 = 0;
        const vis = (el, v) => { el.style.transform = `rotate(${-135 + (v / 100) * 270}deg)`; };
        this.vis = vis;
        document.querySelectorAll('.global-knob').forEach(el => vis(el, el.dataset.val));
        document.addEventListener('pointerdown', async e => {
            if (!e.target.classList.contains('global-knob')) return;
            knob = e.target; y0 = e.clientY; v0 = parseFloat(knob.dataset.val);
            if (knob.setPointerCapture) knob.setPointerCapture(e.pointerId);
            await this.init();
        });
        document.addEventListener('pointermove', e => {
            if (!knob) return;
            const v = Math.max(0, Math.min(100, v0 + (y0 - e.clientY)));
            knob.dataset.val = v; vis(knob, v); this.updateParams();
        });
        const end = e => { if (knob) { try { knob.releasePointerCapture(e.pointerId); } catch (_) {} knob = null; } };
        document.addEventListener('pointerup', end); document.addEventListener('pointercancel', end);

        document.querySelectorAll('.preset-btn').forEach(b => b.addEventListener('click', e => {
            document.querySelectorAll('.preset-btn').forEach(x => x.classList.remove('active-toggle'));
            e.target.classList.add('active-toggle');
            this.applyPreset(e.target.dataset.preset);
            this.$('status-ptch').innerHTML = `PTCH:<br>${e.target.innerText}`;
        }));
    }

    setupAnalyzer() {
        const cv = this.$('analyzer-canvas'); if (!cv) return;
        const g = cv.getContext('2d'), an = this.ctx.createAnalyser();
        an.fftSize = 2048; an.minDecibels = -90; an.maxDecibels = -20; an.smoothingTimeConstant = 0.6;
        this.bandSum.connect(an);                                // taps simulator output, independent of OUT BAL
        const data = new Uint8Array(an.frequencyBinCount), hz = this.ctx.sampleRate / an.fftSize;
        const F = this.freqs;
        const edges = F.map((f, i) => [i ? Math.sqrt(F[i - 1] * f) : f / 1.17, i < F.length - 1 ? Math.sqrt(f * F[i + 1]) : f * 1.17]);
        const draw = () => {
            requestAnimationFrame(draw);
            an.getByteFrequencyData(data);
            g.fillStyle = '#041004'; g.fillRect(0, 0, cv.width, cv.height);
            g.shadowColor = '#0f0'; g.shadowBlur = 8; g.fillStyle = '#0f0';
            const bw = cv.width / 20 - 2;
            edges.forEach(([lo, hi], i) => {
                const a = Math.floor(lo / hz), b = Math.max(a + 1, Math.ceil(hi / hz));
                let s = 0; for (let j = a; j < b; j++) s += data[j];
                const h = (s / (b - a) / 255) * cv.height * 0.95;
                g.fillRect(i * (bw + 2) + 2, cv.height - h, bw, h);
            });
            g.shadowBlur = 0;
        };
        draw();
    }

    applyPreset(name) {
        const P = PRESETS[name];
        if (!P) return;
        const kn = (id, v) => { const el = this.$(id); el.dataset.val = v; this.vis(el, v); };
        kn('knob-tune', P.tune); kn('knob-in-bal', P.inBal); kn('knob-mic-lvl', P.mic);
        kn('knob-v-speed', P.vSpd); kn('knob-v-depth', P.vDep); kn('knob-accent', P.acc); kn('knob-out-bal', P.out);
        const o = this.$('btn-octave'); o.innerText = P.oct; o.classList.toggle('active-toggle', P.oct.includes("8'"));
        const e = this.$('btn-ensemble'); e.innerText = P.ens; e.classList.toggle('active-toggle', P.ens === 'ON');
        this.updateParams();
    }

    snapshot() {
        const s = { knobs: {} };
        document.querySelectorAll('.global-knob').forEach(k => s.knobs[k.id] = k.dataset.val);
        s.oct = this.$('btn-octave').innerText; s.ens = this.$('btn-ensemble').innerText;
        s.wheel = this.$('ctrl-pitch-wheel').value; s.latch = this.latch;
        const p = document.querySelector('.preset-btn.active-toggle'); s.preset = p ? p.dataset.preset : null;
        s.ptch = this.$('status-ptch').innerHTML; return s;
    }

    restore(s) {
        Object.entries(s.knobs).forEach(([id, v]) => { const el = this.$(id); el.dataset.val = v; this.vis(el, v); });
        const o = this.$('btn-octave'); o.innerText = s.oct; o.classList.toggle('active-toggle', s.oct.includes("8'"));
        const e = this.$('btn-ensemble'); e.innerText = s.ens; e.classList.toggle('active-toggle', s.ens === 'ON');
        this.$('ctrl-pitch-wheel').value = s.wheel;
        this.latch = s.latch; this.$('btn-latch').classList.toggle('active-toggle', s.latch);
        this.setPresetButton(s.preset); this.$('status-ptch').innerHTML = s.ptch; this.updateParams();
    }

    setPresetButton(name) {
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.toggle('active-toggle', b.dataset.preset === name));
    }

};
