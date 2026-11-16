// Neon Swarm — particles, floating combat text and shockwaves.
// Pure visual juice: nothing here changes gameplay, everything makes hits feel real.

import { rand, TAU } from './random.js';

const MAX_PARTICLES = 320;

export function createEffects() {
  return {
    particles: [],
    texts: [],
    shockwaves: [],
    shake: 0, // screen shake magnitude, decays in updateEffects
    flash: 0, // red damage vignette strength, decays in updateEffects
  };
}

export function burst(effects, x, y, color, count = 14, speed = 260) {
  for (let i = 0; i < count; i++) {
    if (effects.particles.length >= MAX_PARTICLES) return;
    const angle = Math.random() * TAU;
    const v = rand(speed * 0.3, speed);
    effects.particles.push({
      x,
      y,
      vx: Math.cos(angle) * v,
      vy: Math.sin(angle) * v,
      life: rand(0.3, 0.7),
      maxLife: 0.7,
      size: rand(2, 5),
      color,
      drag: 3.2,
    });
  }
}

export function trail(effects, x, y, color, count = 2) {
  for (let i = 0; i < count; i++) {
    if (effects.particles.length >= MAX_PARTICLES) return;
    effects.particles.push({
      x: x + rand(-6, 6),
      y: y + rand(-6, 6),
      vx: rand(-30, 30),
      vy: rand(-30, 30),
      life: rand(0.2, 0.4),
      maxLife: 0.4,
      size: rand(2, 4),
      color,
      drag: 1,
    });
  }
}

export function floatText(effects, x, y, text, color = '#e2e8f0', size = 15) {
  if (effects.texts.length > 60) effects.texts.shift();
  effects.texts.push({
    x: x + rand(-8, 8),
    y: y - 10,
    vy: -46,
    life: 0.8,
    maxLife: 0.8,
    text,
    color,
    size,
  });
}

export function shockwave(effects, x, y, color, maxRadius) {
  effects.shockwaves.push({ x, y, radius: 8, maxRadius, life: 0.45, maxLife: 0.45, color });
}

export function addShake(effects, amount) {
  effects.shake = Math.min(18, effects.shake + amount);
}

export function addFlash(effects, amount) {
  effects.flash = Math.min(1, effects.flash + amount);
}

export function updateEffects(effects, dt) {
  for (let i = effects.particles.length - 1; i >= 0; i--) {
    const p = effects.particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      effects.particles.splice(i, 1);
      continue;
    }
    const drag = 1 - Math.min(0.9, p.drag * dt);
    p.vx *= drag;
    p.vy *= drag;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  for (let i = effects.texts.length - 1; i >= 0; i--) {
    const t = effects.texts[i];
    t.life -= dt;
    if (t.life <= 0) {
      effects.texts.splice(i, 1);
      continue;
    }
    t.y += t.vy * dt;
    t.vy *= 1 - 2 * dt;
  }
  for (let i = effects.shockwaves.length - 1; i >= 0; i--) {
    const s = effects.shockwaves[i];
    s.life -= dt;
    if (s.life <= 0) {
      effects.shockwaves.splice(i, 1);
      continue;
    }
    const t = 1 - s.life / s.maxLife;
    s.radius = 8 + (s.maxRadius - 8) * (1 - (1 - t) * (1 - t));
  }
  effects.shake = Math.max(0, effects.shake - dt * 34);
  effects.flash = Math.max(0, effects.flash - dt * 2.2);
}
