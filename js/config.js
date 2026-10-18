// Static configuration for the AV-20.

/** Centre frequencies (Hz) of the 20 vocoder bands. */
export const FREQS = [80,110,150,200,270,360,480,640,850,1100,1450,1900,2500,3300,4300,5600,7300,9500,12000,15000];

/** QWERTY map (event.code -> MIDI note). Z-row = F2..B3, Q-row = C4..C5. */
export const KEY_MAP = {
        KeyZ:41,KeyS:42,KeyX:43,KeyD:44,KeyC:45,KeyF:46,KeyV:47,KeyB:48,KeyH:49,KeyN:50,KeyJ:51,KeyM:52,
        Comma:53,KeyL:54,Period:55,Semicolon:56,Slash:57,Quote:58,ShiftRight:59,
        KeyQ:60,Digit2:61,KeyW:62,Digit3:63,KeyE:64,KeyR:65,Digit5:66,KeyT:67,Digit6:68,KeyY:69,Digit7:70,KeyU:71,KeyI:72
    };

/** Patch memory. Knob values are 0-100. */
export const PRESETS = {
        classic: { tune: 50, oct: "16' NRM", inBal: 20,  mic: 85, vSpd: 50, vDep: 0,  acc: 0,  ens: 'OFF', out: 0 },
        robot:   { tune: 50, oct: "16' NRM", inBal: 0,   mic: 90, vSpd: 0,  vDep: 0,  acc: 0,  ens: 'OFF', out: 0 },
        choir:   { tune: 50, oct: "8' UP",   inBal: 25,  mic: 85, vSpd: 65, vDep: 15, acc: 30, ens: 'ON',  out: 0 },
        whisper: { tune: 50, oct: "16' NRM", inBal: 100, mic: 95, vSpd: 0,  vDep: 0,  acc: 0,  ens: 'ON',  out: 0 }
    };
