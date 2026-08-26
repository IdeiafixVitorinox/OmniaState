// wwwroot/js/audioEngine.js - Motor de Acordes Musicais e Harmonias Ambientais
let audioCtx = null;
let masterGain = null;
let ambientFilter = null;
let activeVoices = [];

const CHORD_PRESETS = {
    'ponto-zero': {
        chord: [108.0, 216.0, 324.0, 432.0, 864.0],
        filterFreq: 650,
        resonance: 2.5
    },
    'cura': {
        chord: [132.0, 165.0, 198.0, 264.0, 528.0],
        filterFreq: 750,
        resonance: 1.8
    },
    'clareza': {
        chord: [144.0, 216.0, 288.0, 432.0, 648.0],
        filterFreq: 900,
        resonance: 2.0
    },
    'paz': {
        chord: [96.0, 144.0, 216.0, 288.0, 432.0],
        filterFreq: 480,
        resonance: 3.0
    }
};

export async function startOrganicAudio(stateKey = 'ponto-zero') {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
    }

    if (!masterGain) {
        masterGain = audioCtx.createGain();
        ambientFilter = audioCtx.createBiquadFilter();
        ambientFilter.type = 'lowpass';
        masterGain.connect(ambientFilter);
        ambientFilter.connect(audioCtx.destination);
    }

    const now = audioCtx.currentTime;
    masterGain.gain.cancelScheduledValues(0);
    // 🎯 setTargetAtTime: Sobe o volume suavemente a partir de qualquer estado sem travar
    masterGain.gain.setTargetAtTime(0.38, now, 0.3);

    transitionToChord(stateKey);
}

export function transitionToChord(stateKey) {
    if (!audioCtx || !masterGain) return;
    const preset = CHORD_PRESETS[stateKey] || CHORD_PRESETS['ponto-zero'];
    const now = audioCtx.currentTime;

    ambientFilter.frequency.setTargetAtTime(preset.filterFreq, now, 0.8);
    ambientFilter.Q.setTargetAtTime(preset.resonance, now, 0.8);

    // Fade-out imediato das vozes anteriores
    activeVoices.forEach(({ osc, gain }) => {
        try {
            gain.gain.cancelScheduledValues(0);
            gain.gain.setTargetAtTime(0.0, now, 0.15);
            setTimeout(() => { osc.stop(); osc.disconnect(); }, 500);
        } catch (e) {}
    });
    activeVoices = [];

    // Criar novas vozes
    preset.chord.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const panner = audioCtx.createStereoPanner ? audioCtx.createStereoPanner() : null;

        osc.type = idx === 0 ? 'sine' : (idx % 2 === 0 ? 'triangle' : 'sine');
        const detuneAmount = (idx % 2 === 0 ? 1 : -1) * (idx * 2.5);
        osc.frequency.setValueAtTime(freq, now);
        osc.detune.setValueAtTime(detuneAmount, now);

        if (panner) {
            const panVal = idx === 0 ? 0 : (idx % 2 === 0 ? -0.35 : 0.35);
            panner.pan.setValueAtTime(panVal, now);
        }

        const targetVol = idx === 0 ? 0.22 : (0.16 / (idx * 0.8));
        gain.gain.setValueAtTime(0.0, now);
        gain.gain.setTargetAtTime(targetVol, now, 0.4); // Volume da nota sobe suavemente

        if (panner) {
            osc.connect(gain);
            gain.connect(panner);
            panner.connect(masterGain);
        } else {
            osc.connect(gain);
            gain.connect(masterGain);
        }

        osc.start();
        activeVoices.push({ osc, gain });
    });
}

export function stopOrganicAudio() {
    if (!audioCtx || !masterGain) return;

    const now = audioCtx.currentTime;
    masterGain.gain.cancelScheduledValues(0);
    masterGain.gain.setTargetAtTime(0.0, now, 0.25); // Fade out garantido

    activeVoices.forEach(({ osc, gain }) => {
        try {
            gain.gain.cancelScheduledValues(0);
            gain.gain.setTargetAtTime(0.0, now, 0.2);
            setTimeout(() => { osc.stop(); osc.disconnect(); }, 600);
        } catch (e) {}
    });

    activeVoices = [];
}