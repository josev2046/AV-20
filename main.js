import { Engine } from './engine.js';
import { withUI } from './ui.js';
import { withRecorder } from './recorder.js';
import { withDemo } from './demo.js';

class VWVocoder extends withDemo(withRecorder(withUI(Engine))) {
    mount() { this.buildKeyboard(); this.bindControls(); this.setupDAW(); return this; }
}

window.synthInstance = new VWVocoder().mount();
