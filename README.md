# Voltage & Wave AV-20 // Analogue Vocoder Emulator

The AV-20 is a 20-band vocoder emulator built entirely on the native Web Audio API. Its layout and control set are modelled on the Korg VC-10 Vocoder (Japan, late 1970s), and it adds some modern conveniences of its own (see section 7).

A live microphone input (the Modulator) is passed through a 20-band envelope-following filter bank. The articulation of your voice is then imposed on a dense, polyphonic synthesiser tone (the Carrier).

---

# AV-20 · Analogue Vocoder Emulator

A 20-band vocoder built on the Web Audio API, modelled on the Korg VC-10.
Live demo: https://josev2046.github.io/AV-20/

## Structure

```
index.html        page markup
css/styles.css    all styling
js/
  main.js         entry point; composes the modules below
  config.js       band frequencies, QWERTY map, patch presets
  engine.js       audio engine: signal flow, 20-band vocoder, carrier, pitch
  ui.js           panel: keyboard, knobs, presets, spectrum display
  recorder.js     DAW recorder (WAV export)
  demo.js         easter egg: click a chassis screw

```
---


## 1. Core Architecture & Signal Flow

* **The Modulator (Microphone):** The voice is captured with browser echo cancellation, noise suppression and auto-gain disabled. It is pre-emphasised (+8 dB high shelf at 3 kHz) to preserve sibilance, compressed, then split across 20 bands. Each band uses two cascaded band-pass filters (24 dB/octave) for sharp isolation.
* **The Envelope Followers:** Each band is full-wave rectified and low-pass filtered at about 25 Hz to extract an amplitude contour. The contour is boosted by a gain of x26 (about 28 dB).
* **The Carrier (Synthesiser):** Each key sounds a sawtooth, a square and a sub-octave square. A full-band white noise generator is always running and is blended in with SIG BAL.
* **The Synthesis (VCA Stage):** The carrier is split into an identical 20-band filter bank. The gain of each carrier band is controlled by the envelope of the matching microphone band. A `tanh` shaper on each envelope signal clamps it to zero or above and softly limits it, so no band gain can exceed unity.
* **Output Chain:** Vocoder output (SIM) and dry mic (MIC) are mixed by OUT BAL, then pass through the Ensemble chorus, FINAL VOL and a master compressor.

---

## 2. Front Panel Controls

### Oscillator
* **TUNE:** Adjusts the pitch of the synthesiser by +/-100 cents. The centre position is A = 440 Hz.
* **OCTAVE:** Switches the keyboard between the 16' (Normal) and 8' (Up) registers. UP raises the whole range by one octave.

### Signal Mixer
* **SIG BAL (KBD / NOIS):** Equal-power crossfade of the carrier between the keyboard (KBD, fully left) and full-band white noise (NOIS, fully right). A little noise makes consonants such as "S", "Z", "SH" and "CH" more intelligible. At full NOIS, noise is the only carrier and the effect is a breathy, atonal whisper that needs no keys.
* **MIC LVL:** Sets the gain of the microphone signal going into the vocoder and the dry path.

### Modulation
* **V. SPEED / V. DEPTH:** Rate and depth of the vibrato LFO applied to the carrier pitch. Speed runs from about 1 Hz (SLW) to 10 Hz (FST). Depth runs from 0 to a maximum of +/-50 cents.
* **ACCENT:** Adds a brief upward pitch scoop at the moment a key is struck: the note starts flat (by up to 150 cents at maximum) and glides up to pitch in about 120 ms. This imitates the pitch wavering of a human voice.

### Final Stage
* **ENSEMBLE:** A 3-voice, 3-phase chorus (about 0.55 Hz, voices 120 degrees apart, spread across the stereo field). It is applied after OUT BAL, so it affects the mixed output, including any dry mic.
* **OUT BAL (SIM / MIC):** Equal-power crossfade between the vocoded sound (SIM, fully left) and the dry, unprocessed microphone signal (MIC, fully right). Keep it fully left for the pure vocoder effect.
* **FINAL VOL:** Master output level, applied before the final compressor. Fully left is silent.

---

## 3. Keyboard & Performance

* **32-Key Bed:** 32 notes from F2 to C5. Holding a key sounds the carrier at that pitch. Notes are polyphonic and have a very short attack and release to avoid clicks.
* **Pitch Wheel:** Located left of the keyboard. It bends pitch continuously by up to a perfect fifth (7 semitones) up or down. It has a centre detent for quick return to normal pitch and stays where you leave it.
* **QWERTY Mapping:** Keys are mapped by physical position, so it works on any keyboard layout.
    * **Lower register (F2 to A3):** the bottom row, `Z` through `/`, with the row above for sharps and flats (`S D F H J L ;`).
    * **Upper register (C4 to C5):** the top row, `Q` through `I`, with the number keys for sharps and flats (`2 3 5 6 7`).
    * A#3 and B3 (the two notes between the rows) are available on the on-screen keyboard only.
* **LATCH:** When on, played notes keep sounding after release, so you can build chords one note at a time. Pressing an already-latched note switches that note off. Switching LATCH off clears all notes.

---

## 4. Patch Memory

Four presets set the knobs, OCTAVE and ENSEMBLE together:

1. **CLASSIC:** Balanced vocoder tone with a slight noise blend for intelligibility.
2. **ROBOT:** Pure keyboard carrier (no noise), no vibrato and no accent. Rigid and mechanical.
3. **CHOIR:** 8' UP with moderate vibrato, some accent bend and ENSEMBLE on, for a lush vocal pad.
4. **WHISPER:** SIG BAL fully on noise (keyboard silent) with ENSEMBLE on, giving an atonal, breathy whisper.

---

## 5. DAW Recorder

The recorder captures the final output exactly as you hear it: after OUT BAL, Ensemble, FINAL VOL and the compressor. If OUT BAL includes dry mic, the dry mic is recorded too.

* **REC:** Starts recording. Elapsed time appears in the `00:00` box next to the button.
* **STP:** Stops recording and begins encoding. The box shows `WAIT` briefly.
* **SAVE:** Lights green when the file is ready. The browser captures compressed audio and the AV-20 converts it to a 16-bit WAV file. If the conversion fails, the original `.webm` file is offered instead.

---

## 6. Setup & Operation

1. Use headphones. The dry mic and the vocoder output can feed back through speakers.
2. Open the page over `https://` or `localhost`, because browsers block microphone access on plain local files in some cases.
3. Click the **Power** button in the header (touching any knob or pressing REC also starts audio) and accept the microphone prompt.
4. The CRT shows `MIC: ACTIVE` and the 20-band spectrum of the vocoder output.
5. Set OUT BAL fully left (SIM), raise FINAL VOL, play a key and speak or sing into the microphone.

**Performance tips:**
* The sound takes its pitch from the keys but its tone and articulation from your voice. Play a note a split second *before* you speak or sing, because the start of each word carries the most vocal information.
* Add a little noise (SIG BAL) if consonants are unclear.
* If the sound is too quiet or too harsh, adjust MIC LVL and FINAL VOL.

---

## 7. Differences from the Korg VC-10

**Additions in the AV-20:** Patch Memory, LATCH, the DAW recorder, the 20-band CRT spectrum display and the QWERTY mapping.

**VC-10 features not emulated:** headphone output and level, external signal input and level, external pitch control input (for example a foot pedal), and the VU meter with its Meter Select switch.

---
*© José Velázquez MA / Voltage & Wave*
