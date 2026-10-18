/** DAW recorder: captures the master output and exports WAV (or WebM fallback). */
export const withRecorder = Base => class extends Base {

    setupDAW() {
        const btn = this.$('btnRecord'), st = this.$('recStatus'), dl = this.$('btnDownload'), R = this.rec;
        if (typeof MediaRecorder === 'undefined') { btn.disabled = true; btn.innerText = 'N/A'; st.innerText = 'ERR'; return; }
        btn.addEventListener('click', async () => {
            await this.init();
            if (!R.on) {
                R.chunks = [];
                const opt = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? { mimeType: 'audio/webm;codecs=opus' }
                          : MediaRecorder.isTypeSupported('audio/webm') ? { mimeType: 'audio/webm' } : undefined;
                R.mr = new MediaRecorder(this.recordDestination.stream, opt);
                R.mr.ondataavailable = e => { if (e.data && e.data.size) R.chunks.push(e.data); };
                R.mr.onstop = async () => {
                    st.innerText = 'WAIT';
                    const raw = new Blob(R.chunks, { type: R.mr.mimeType || 'audio/webm' });
                    try {
                        const dec = await this.ctx.decodeAudioData(await raw.arrayBuffer());
                        dl.href = URL.createObjectURL(this.toWav(dec)); dl.download = this.fname('wav');
                    } catch (_) { dl.href = URL.createObjectURL(raw); dl.download = this.fname('webm'); }
                    dl.classList.remove('opacity-40', 'pointer-events-none'); dl.style.color = '#86efac'; st.innerText = '00:00';
                };
                R.mr.start(); R.on = true; R.t0 = Date.now();
                btn.classList.add('active-toggle'); btn.innerText = '■ STP';
                dl.classList.add('opacity-40', 'pointer-events-none'); dl.style.color = '';
                R.timer = setInterval(() => {
                    const s = Math.floor((Date.now() - R.t0) / 1000);
                    st.innerText = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
                }, 500);
            } else {
                R.mr.stop(); R.on = false; clearInterval(R.timer);
                btn.classList.remove('active-toggle'); btn.innerText = '● REC';
            }
        });
    }

    toWav(buf) {
        const ch = buf.numberOfChannels, sr = buf.sampleRate, len = buf.length;
        const data = new Int16Array(len * ch);
        for (let c = 0; c < ch; c++) { const x = buf.getChannelData(c); for (let i = 0; i < len; i++) { const s = Math.max(-1, Math.min(1, x[i])); data[i * ch + c] = s < 0 ? s * 0x8000 : s * 0x7FFF; } }
        const ab = new ArrayBuffer(44 + data.length * 2), v = new DataView(ab);
        const w = (o, t) => { for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
        w(0, 'RIFF'); v.setUint32(4, 36 + data.length * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
        v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, ch, true); v.setUint32(24, sr, true);
        v.setUint32(28, sr * ch * 2, true); v.setUint16(32, ch * 2, true); v.setUint16(34, 16, true);
        w(36, 'data'); v.setUint32(40, data.length * 2, true);
        new Int16Array(ab, 44).set(data);
        return new Blob([ab], { type: 'audio/wav' });
    }

    fname(ext) {
        const d = new Date(), p = n => String(n).padStart(2, '0');
        return `av20-recording-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}.${ext}`;
    }

};
