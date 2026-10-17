# Voltage & Wave AV-20 // Analogue Vocoder Emulator

**The Complete Web Audio Studio Manual**

The AV-20 is a high-fidelity, 20-band analogue vocoder emulator built entirely upon the native Web Audio API. Inspired by late-1970s British and Japanese studio hardware, it bridges the gap between classic synthesis architecture and modern browser-based digital signal processing (DSP).

By routing a live microphone input (the Modulator) through a 20-band envelope-following filter bank, the AV-20 superimposes the articulation of the human voice onto a dense, polyphonic synthesiser tone (the Carrier).

---

## 1. Core Architecture & Signal Flow

The AV-20 operates on a strict, mathematically modelled vocoder topology, enhanced with analogue-style saturation techniques to prevent digital clipping:

*   **The Modulator (Microphone):** The human voice is captured, pre-emphasised (+8dB at 3kHz) to preserve high-frequency sibilance, and dynamically compressed. It is then split across 20 cascaded 24dB/octave bandpass filters for razor-sharp frequency isolation.
*   **The Envelope Followers:** Each of the 20 bands undergoes full-wave rectification and low-pass filtering (at ~25Hz) to extract a precise amplitude contour. A +26dB envelope boost ensures the subsequent VCAs open fully.
*   **The Carrier (Synthesiser):** A dense internal tone generator—comprising a sawtooth wave, a square wave, and a sub-octave square wave—provides the raw harmonic material.
*   **The Synthesis (VCA Stage):** The Carrier is split into an identical 20-band filter bank. The amplitude of each synthesiser band is physically controlled by the envelope of the corresponding microphone band. The VCAs utilise a hyperbolic tangent (`Math.tanh`) wave-shaper to mimic the soft-knee saturation and natural limiting of vintage analogue circuitry.

---

## 2. Front Panel Controls

### Oscillator
The internal polyphonic synthesiser acts as the carrier signal.
*   **TUNE:** Adjusts the master pitch of the synthesiser by ±100 cents for fine-tuning against external instruments[cite: 6, 10, 14].
*   **OCTAVE:** Shifts the base pitch of the keyboard between the standard 16' (Normal) register and the 8' (Up) register[cite: 6, 10, 14].

### Signal Mixer
Controls the harmonic composition of the carrier signal.
*   **SIG BAL (KBD / NOIS):** Crossfades the carrier between the pitched polyphonic synthesiser (KBD) and a high-passed white noise generator (NOIS)[cite: 6, 10, 14]. Mixing in noise is essential for producing intelligible sibilant consonants (such as "S", "Z", "SH", and "CH")[cite: 5, 9, 13].
*   **MIC LVL:** Sets the input gain of the microphone[cite: 6, 10, 14]. 

### Modulation
Introduces movement and humanisation to the static synthesiser waveforms.
*   **V. SPEED & V. DEPTH:** Controls the rate and intensity of the internal low-frequency oscillator (LFO) applied to the carrier pitch, creating a vibrato effect[cite: 6, 10, 14].
*   **ACCENT BEND:** Introduces a transient, downward pitch-glide at the exact moment a key is struck[cite: 6, 10, 14]. This mimics the natural pitch wavering of human vocal cords for highly authentic, sung phrasing[cite: 5, 9, 13].

### Final Stage
*   **ENSEMBLE:** Engages a rich, 3-phase analogue-style chorus effect[cite: 6, 10, 14]. This relies on independent, slightly offset LFOs modulating short delay lines to thicken the vocoder output.
*   **OUT BAL (VOC / SIM):** A master crossfader balancing the fully synthesised vocoder signal (VOC) against the dry, unprocessed microphone signal (SIM, or "Simulator")[cite: 6, 10, 14].
*   **FINAL VOL:** Attenuates the overall master output level before the final compressor stage[cite: 6, 10, 14].

---

## 3. Keyboard & Performance

Due to the limitations of standard mouse inputs for polyphonic instruments, the AV-20 includes deep computer keyboard integration and sustain logic.

*   **32-Key Bed:** The AV-20 features a 32-note polyphonic keyboard spanning from F2 to C5[cite: 6, 10, 14]. Holding a key opens the carrier signal at that specific pitch.
*   **Pitch Wheel:** A tactile performance wheel located to the left of the keyboard. It bends the master pitch up or down by a perfect fifth and snaps back to the centre zero-point when released[cite: 5, 9, 13].
*   **QWERTY Keyboard Mapping:** Play the synthesiser polyphonically using your computer keyboard.
    *   **Lower Register (F2 to A3):** Mapped across the bottom alphanumeric row (`Z` through `/`).
    *   **Upper Register (C4 to C5):** Mapped across the top alphanumeric row (`Q` through `I`).
*   **LATCH:** A dedicated Chord Latch toggle. When engaged, any note clicked or typed will sustain infinitely. This allows you to build complex polyphonic chords one note at a time, freeing your hands to sweep the pitch wheel or manipulate the Signal Mixer dials. Press the Latch button again to clear all active voices.

---

## 4. Patch Memory

The AV-20 features a solid-state patch memory bank (arranged in a compact 2x2 grid) for instant recall of four distinct DSP states:

1.  **CLASSIC:** A balanced, classic 1970s vocoder tone with a slight noise blend for intelligibility.
2.  **ROBOT:** Pure, rigid synthesiser tones with no vibrato or accent bend.
3.  **CHOIR:** Shifted to the 8' Up octave with heavy vibrato, accent bend, and the Ensemble chorus engaged for a lush, synthetic vocal pad.
4.  **WHISPER:** Disables the pitched synthesiser entirely (SIG BAL set to 100% NOIS), turning the user's voice into an eerie, atonal whisper.

---

## 5. DAW Recorder

The AV-20 features a built-in capture module that records the final, post-effects synthesised audio (it does not record the dry microphone input).

*   **REC:** Arms and starts the recording. The CRT display will track the elapsed time.
*   **STP (Stop):** Halts the recording and triggers the internal encoder.
*   **SAVE:** Once the audio is encoded to a lossless `.wav` file, this button illuminates green, allowing you to download the pass directly to your local drive.

---

## 6. Setup & Authorisation

To operate the AV-20, you must grant microphone permissions in your browser. 
1. Click the **MIC PWR** rocker switch on the right side of the main chassis.
2. Accept the browser security prompt allowing audio input.
3. The CRT monitor will update to read `MIC: ACTIVE`, confirming signal flow.
4. Use your QWERTY keyboard (or mouse) to press a key, and speak directly into your microphone to engage the vocoder.

*(Note: The use of headphones is strongly recommended to prevent the microphone from picking up the synthesiser output and creating an acoustic feedback loop).*

---
*© José Velázquez MA / Voltage & Wave*
