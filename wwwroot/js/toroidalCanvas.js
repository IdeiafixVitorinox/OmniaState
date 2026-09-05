// wwwroot/js/toroidalCanvas.js - Alta Performance 60 FPS & Gestão de Micro-Sessões
// Linha 2 do toroidalCanvas.js:
import { startOrganicAudio, stopOrganicAudio, transitionToChord } from './audioEngine.js?v=99';

let canvas, ctx;
let width, height;
let particles = [];
const TOTAL_PARTICLES = 320;

let currentSpeed = 0.003;
let targetSpeed = 0.003;
let color = { r: 16, g: 185, b: 129 };
let targetColor = { r: 16, g: 185, b: 129 };
let activeStateKey = 'ponto-zero';
let time = 0;

// 🎯 Fila de temporizadores para cancelar micro-sessões anteriores
let activeTimeouts = [];

function clearAllTimeouts() {
    activeTimeouts.forEach(id => clearTimeout(id));
    activeTimeouts = [];
}

class ToroidalParticle {
    constructor() {
        this.reset();
    }
    reset() {
        this.u = Math.random() * Math.PI * 2;
        this.v = Math.random() * Math.PI * 2;
        this.speed = 0.4 + Math.random() * 0.6;
        this.size = 1.0 + Math.random() * 1.5;
    }
    update() {
        this.u += currentSpeed * this.speed;
        this.v += currentSpeed * 1.618 * this.speed;
    }
    draw(cx, cy, R, r) {
        const x = (R + r * Math.cos(this.v)) * Math.cos(this.u);
        const y = (R + r * Math.cos(this.v)) * Math.sin(this.u);
        const z = r * Math.sin(this.v);

        const perspective = 400 / (400 + z);
        const sx = cx + x * perspective;
        const sy = cy + y * perspective * 0.52;
        const alpha = Math.max(0.08, (z + r) / (2 * r) * 0.70);

        ctx.beginPath();
        ctx.arc(sx, sy, this.size * perspective, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)}, ${alpha})`;
        ctx.fill();
    }
}

export function initToroid(canvasId) {
    canvas = document.getElementById(canvasId);
    ctx = canvas.getContext('2d', { alpha: false });
    resize();
    window.addEventListener('resize', resize);

    particles = [];
    for (let i = 0; i < TOTAL_PARTICLES; i++) {
        particles.push(new ToroidalParticle());
    }
    render();
}

let lastFrameTime = performance.now();

function resize() {
    if (!canvas) return;
    
    // 🎯 UNIVERSAL: Adapta a densidade de píxeis para qualquer ecrã (Mobile, Retina, 4K, 1080p)
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    
    width = window.innerWidth;
    height = window.innerHeight;
    
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    
    // Normaliza a escala interna para coordenadas universais
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}


function drawBioGeometry(cx, cy, R) {
    ctx.save();
    ctx.strokeStyle = `rgba(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)}, 0.16)`;
    ctx.lineWidth = 1.2;

    if (activeStateKey === 'ponto-zero') {
        ctx.beginPath();
        ctx.moveTo(cx, cy - R * 1.6);
        ctx.lineTo(cx, cy + R * 1.6);
        ctx.stroke();

        for (let rad of [R * 0.3, R * 0.6, R * 0.9]) {
            ctx.beginPath();
            ctx.arc(cx, cy, rad, 0, Math.PI * 2);
            ctx.stroke();
        }
    } 
    else if (activeStateKey === 'cura') {
        for (let i = 0; i < 7; i++) {
            const rStep = R * (0.2 + (i * 0.12));
            ctx.beginPath();
            ctx.arc(cx, cy, rStep, 0, Math.PI * 2);
            ctx.stroke();
        }
    } 
    else if (activeStateKey === 'clareza') {
        for (let i = 0; i < 16; i++) {
            const angle = i * (Math.PI / 8);
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(angle) * (R * 0.2), cy + Math.sin(angle) * (R * 0.2));
            ctx.lineTo(cx + Math.cos(angle) * (R * 1.25), cy + Math.sin(angle) * (R * 1.25));
            ctx.stroke();
        }
    } 
    else if (activeStateKey === 'paz') {
        for (let i = 0; i < 6; i++) {
            const ang = i * (Math.PI / 3);
            ctx.beginPath();
            ctx.arc(cx + Math.cos(ang) * (R * 0.5), cy + Math.sin(ang) * (R * 0.5), R * 0.5, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
    ctx.restore();
}

function render(currentTime) {
    requestAnimationFrame(render);

    if (!currentTime) currentTime = performance.now();
    
    // 🎯 DELTA-TIME UNIVERSAL: Mede a fração exata de segundo que passou
    let dt = (currentTime - lastFrameTime) / 1000;
    lastFrameTime = currentTime;

    // Proteção se o utilizador minimizar ou mudar de separador
    if (dt > 0.1) dt = 0.016; 
    
    // Multiplicador de tempo universal (normalizado a 60 FPS)
    const timeScale = dt * 60;

    // Fundo com rasto suave
    ctx.fillStyle = 'rgba(5, 5, 8, 0.18)';
    ctx.fillRect(0, 0, width, height);

    // Interpolação suave de cores e velocidades baseada no tempo real
    color.r += (targetColor.r - color.r) * (0.04 * timeScale);
    color.g += (targetColor.g - color.g) * (0.04 * timeScale);
    color.b += (targetColor.b - color.b) * (0.04 * timeScale);
    currentSpeed += (targetSpeed - currentSpeed) * (0.04 * timeScale);

    const cx = width / 2;
    const cy = height / 2;

    // Respiração fisiológica (calibrada pelo tempo contínuo)
    const breath = Math.sin(time * 0.010) * 0.10;
    const R = Math.min(width, height) * (0.32 + breath);
    const r = R * 0.618;

    // 1. Geometria Sagrada
    drawBioGeometry(cx, cy, R);

    // 2. Singularidade / Ponto Zero Central (9)
    const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.6);
    halo.addColorStop(0, `rgba(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)}, 0.32)`);
    halo.addColorStop(1, 'rgba(5, 5, 8, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.6, 0, Math.PI * 2);
    ctx.fill();

    // 3. Movimento das Partículas com Delta-Time
    for (let p of particles) {
        p.u += currentSpeed * p.speed * timeScale;
        p.v += currentSpeed * 1.618 * p.speed * timeScale;
        p.draw(cx, cy, R, r);
    }

    time += 1 * timeScale;
}

export function activateState(stateKey, speed, rgb) {
    clearAllTimeouts(); // 🎯 Cancela qualquer micro-sessão anterior que estivesse a correr
    activeStateKey = stateKey;
    targetSpeed = speed;
    targetColor = rgb;
    startOrganicAudio(stateKey);
}

export function activateMicroSession(stateKey) {
    clearAllTimeouts(); // 🎯 Limpa temporizadores antigos imediatamente

    let peakSpeed, finalSpeed, rgb;

    switch (stateKey) {
        case 'ponto-zero':
            peakSpeed = 0.006;
            finalSpeed = 0.004;
            rgb = { r: 16, g: 185, b: 129 };
            break;
        case 'cura':
            peakSpeed = 0.007;
            finalSpeed = 0.0045;
            rgb = { r: 245, g: 158, b: 11 };
            break;
        case 'clareza':
            peakSpeed = 0.008;
            finalSpeed = 0.005;
            rgb = { r: 56, g: 189, b: 248 };
            break;
        case 'paz':
            peakSpeed = 0.005;
            finalSpeed = 0.0035;
            rgb = { r: 168, g: 85, b: 247 };
            break;
    }

    activeStateKey = stateKey;
    targetSpeed = peakSpeed;
    targetColor = rgb;
    startOrganicAudio(stateKey);

    // Desaceleração aos 5s
    const t1 = setTimeout(() => {
        targetSpeed = finalSpeed;
    }, 5000);
    activeTimeouts.push(t1);

    // Conclusão aos 7s
    const t2 = setTimeout(() => {
        stopOrganicAudio();
        DotNet.invokeMethodAsync("OmniaState", "MicroSessionEnded");
    }, 7000);
    activeTimeouts.push(t2);
}

export function stopSessionAudio() {
    clearAllTimeouts();    // 🎯 Cancela qualquer temporizador em memória
    stopOrganicAudio();    // Para o som
    targetSpeed = 0.0008;  // Desacelera o toroide para repouso
}