// Neon Swarm — canvas rendering.
// Draws the arena, every entity and every effect with additive glow. Shapes
// are drawn from paths (no image assets), so the game ships zero media files.

import { WORLD_WIDTH, WORLD_HEIGHT, COLORS } from './config.js';
import { TAU } from './random.js';
import { cameraView } from './world.js';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  return {
    canvas,
    ctx,
    width: 0,
    height: 0,
    dpr: 1,
    resize(width, height) {
      this.dpr = Math.min(2, window.devicePixelRatio || 1);
      this.width = width;
      this.height = height;
      canvas.width = Math.round(width * this.dpr);
      canvas.height = Math.round(height * this.dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    },
  };
}

function drawShape(ctx, shape, x, y, radius, angle) {
  ctx.beginPath();
  if (shape === 'triangle') {
    for (let i = 0; i < 3; i++) {
      const a = angle + (i / 3) * TAU;
      const px = x + Math.cos(a) * radius;
      const py = y + Math.sin(a) * radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  } else if (shape === 'dart') {
    const tip = radius * 1.5;
    const back = radius * 0.8;
    const wing = radius * 0.75;
    const nx = Math.cos(angle);
    const ny = Math.sin(angle);
    const px = -ny;
    const py = nx;
    ctx.moveTo(x + nx * tip, y + ny * tip);
    ctx.lineTo(x - nx * back + px * wing, y - ny * back + py * wing);
    ctx.lineTo(x - nx * back * 0.4, y - ny * back * 0.4);
    ctx.lineTo(x - nx * back - px * wing, y - ny * back - py * wing);
    ctx.closePath();
  } else if (shape === 'diamond') {
    const nx = Math.cos(angle);
    const ny = Math.sin(angle);
    const px = -ny;
    const py = nx;
    ctx.moveTo(x + nx * radius * 1.3, y + ny * radius * 1.3);
    ctx.lineTo(x + px * radius * 0.8, y + py * radius * 0.8);
    ctx.lineTo(x - nx * radius * 1.3, y - ny * radius * 1.3);
    ctx.lineTo(x - px * radius * 0.8, y - py * radius * 0.8);
    ctx.closePath();
  } else if (shape === 'square') {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.rect(-radius * 0.85, -radius * 0.85, radius * 1.7, radius * 1.7);
    ctx.restore();
    return;
  } else {
    // hexagon (default)
    for (let i = 0; i < 6; i++) {
      const a = angle + (i / 6) * TAU;
      const px = x + Math.cos(a) * radius;
      const py = y + Math.sin(a) * radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }
}

function drawBackground(ctx, view, width, height) {
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, width, height);

  // Grid, drawn in world space so it scrolls with the camera.
  const cell = 80;
  const startX = Math.floor(view.x / cell) * cell;
  const startY = Math.floor(view.y / cell) * cell;
  ctx.lineWidth = 1;
  for (let gx = startX; gx < view.x + width + cell; gx += cell) {
    const major = Math.round(gx / cell) % 5 === 0;
    ctx.strokeStyle = major ? COLORS.gridMajor : COLORS.grid;
    ctx.beginPath();
    ctx.moveTo(gx - view.x, 0);
    ctx.lineTo(gx - view.x, height);
    ctx.stroke();
  }
  for (let gy = startY; gy < view.y + height + cell; gy += cell) {
    const major = Math.round(gy / cell) % 5 === 0;
    ctx.strokeStyle = major ? COLORS.gridMajor : COLORS.grid;
    ctx.beginPath();
    ctx.moveTo(0, gy - view.y);
    ctx.lineTo(width, gy - view.y);
    ctx.stroke();
  }

  // Arena walls.
  ctx.strokeStyle = COLORS.wall;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 3;
  ctx.strokeRect(-view.x, -view.y, WORLD_WIDTH, WORLD_HEIGHT);
  ctx.globalAlpha = 1;
  // Soft glow just inside the walls.
  ctx.strokeStyle = 'rgba(34, 211, 238, 0.12)';
  ctx.lineWidth = 14;
  ctx.strokeRect(-view.x, -view.y, WORLD_WIDTH, WORLD_HEIGHT);
}

function drawGems(ctx, gems, view) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const g of gems) {
    const pulse = 1 + Math.sin(g.life * 6) * 0.15;
    const sx = g.x - view.x;
    const sy = g.y - view.y;
    const gradient = ctx.createRadialGradient(sx, sy, 0, sx, sy, g.radius * 3 * pulse);
    gradient.addColorStop(0, 'rgba(74, 222, 128, 0.9)');
    gradient.addColorStop(1, 'rgba(74, 222, 128, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(sx, sy, g.radius * 3 * pulse, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#bbf7d0';
    ctx.beginPath();
    ctx.arc(sx, sy, g.radius * 0.55 * pulse, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawBullets(ctx, bullets, view) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const b of bullets) {
    const sx = b.x - view.x;
    const sy = b.y - view.y;
    const len = Math.hypot(b.vx, b.vy) || 1;
    const tx = (b.vx / len) * b.radius * 3.2;
    const ty = (b.vy / len) * b.radius * 3.2;
    const gradient = ctx.createLinearGradient(sx - tx, sy - ty, sx, sy);
    gradient.addColorStop(0, 'rgba(165, 243, 252, 0)');
    gradient.addColorStop(1, 'rgba(165, 243, 252, 0.95)');
    ctx.strokeStyle = gradient;
    ctx.lineWidth = b.radius * 1.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(sx - tx, sy - ty);
    ctx.lineTo(sx, sy);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(sx, sy, b.radius * 0.6, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawOrbs(ctx, orbs, view, time) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const o of orbs) {
    const sx = o.x - view.x;
    const sy = o.y - view.y;
    const pulse = 1 + Math.sin(time * 8 + o.x) * 0.12;
    const gradient = ctx.createRadialGradient(sx, sy, 0, sx, sy, o.radius * 2.4 * pulse);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    gradient.addColorStop(0.35, o.color);
    gradient.addColorStop(1, 'rgba(251, 113, 133, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(sx, sy, o.radius * 2.4 * pulse, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawEnemies(ctx, enemies, view, time) {
  for (const e of enemies) {
    const sx = e.x - view.x;
    const sy = e.y - view.y;
    if (sx < -80 || sx > view.width + 80 || sy < -80 || sy > view.height + 80) continue;
    ctx.save();
    ctx.translate(sx, sy);
    // Glow halo.
    ctx.globalCompositeOperation = 'lighter';
    const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, e.radius * 2.1);
    halo.addColorStop(0, e.color + '55');
    halo.addColorStop(1, e.color + '00');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, 0, e.radius * 2.1, 0, TAU);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    // Body: dark fill, neon stroke; white when flashing from a hit.
    drawShape(ctx, e.shape, 0, 0, e.radius, e.angle);
    ctx.fillStyle = e.flash > 0 ? '#ffffff' : '#0b0b1e';
    ctx.fill();
    ctx.strokeStyle = e.flash > 0 ? '#ffffff' : e.color;
    ctx.lineWidth = e.isBoss ? 4 : 2.5;
    ctx.stroke();
    // Inner core.
    ctx.fillStyle = e.color;
    ctx.beginPath();
    ctx.arc(0, 0, e.radius * 0.3, 0, TAU);
    ctx.fill();
    // Boss telegraphs its charge with a pulsing ring.
    if (e.isBoss && e.charging > 0) {
      ctx.strokeStyle = 'rgba(251, 113, 133, 0.8)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, e.radius + 12 + Math.sin(time * 20) * 4, 0, TAU);
      ctx.stroke();
    }
    // Health bar for damaged non-boss enemies.
    if (!e.isBoss && e.hp < e.maxHp) {
      const w = e.radius * 2;
      const ratio = Math.max(0, e.hp / e.maxHp);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.fillRect(-w / 2, -e.radius - 12, w, 4);
      ctx.fillStyle = e.color;
      ctx.fillRect(-w / 2, -e.radius - 12, w * ratio, 4);
    }
    ctx.restore();
  }
}

function drawPlayer(ctx, player, view, time) {
  const sx = player.x - view.x;
  const sy = player.y - view.y;
  ctx.save();
  ctx.translate(sx, sy);
  // Blink while invulnerable after a hit.
  if (player.invulnerable > 0 && Math.floor(time * 16) % 2 === 0) ctx.globalAlpha = 0.45;
  // Engine glow.
  ctx.globalCompositeOperation = 'lighter';
  const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, player.radius * 2.6);
  halo.addColorStop(0, 'rgba(34, 211, 238, 0.4)');
  halo.addColorStop(1, 'rgba(34, 211, 238, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 0, player.radius * 2.6, 0, TAU);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  // Ship: a sleek arrow.
  const nx = Math.cos(player.angle);
  const ny = Math.sin(player.angle);
  const px = -ny;
  const py = nx;
  const r = player.radius;
  ctx.beginPath();
  ctx.moveTo(nx * r * 1.5, ny * r * 1.5);
  ctx.lineTo(-nx * r * 0.9 + px * r * 0.9, -ny * r * 0.9 + py * r * 0.9);
  ctx.lineTo(-nx * r * 0.4, -ny * r * 0.4);
  ctx.lineTo(-nx * r * 0.9 - px * r * 0.9, -ny * r * 0.9 - py * r * 0.9);
  ctx.closePath();
  ctx.fillStyle = '#082f3a';
  ctx.fill();
  ctx.strokeStyle = COLORS.player;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.fillStyle = COLORS.playerCore;
  ctx.beginPath();
  ctx.arc(nx * r * 0.3, ny * r * 0.3, r * 0.28, 0, TAU);
  ctx.fill();
  // Dash cooldown ring.
  if (player.dashCooldown > 0) {
    const total = 2.1 * player.dashCooldownMul;
    const ratio = 1 - player.dashCooldown / total;
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r + 9, -Math.PI / 2, -Math.PI / 2 + ratio * TAU);
    ctx.stroke();
  }
  ctx.restore();

  // Orbit blades circle the ship.
  if (player.orbitBlades > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < player.orbitBlades; k++) {
      const angle = player.orbitAngle + (k / player.orbitBlades) * TAU;
      const bx = sx + Math.cos(angle) * 74;
      const by = sy + Math.sin(angle) * 74;
      ctx.fillStyle = '#c4b5fd';
      ctx.beginPath();
      ctx.arc(bx, by, 7, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(167, 139, 250, 0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(bx, by, 12, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawEffects(ctx, effects, view) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const p of effects.particles) {
    const alpha = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x - view.x, p.y - view.y, p.size * alpha + 0.5, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const s of effects.shockwaves) {
    const alpha = Math.max(0, s.life / s.maxLife);
    ctx.globalAlpha = alpha * 0.9;
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 4 * alpha + 1;
    ctx.beginPath();
    ctx.arc(s.x - view.x, s.y - view.y, s.radius, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
  // Floating combat text.
  ctx.save();
  ctx.textAlign = 'center';
  for (const t of effects.texts) {
    const alpha = Math.max(0, t.life / t.maxLife);
    ctx.globalAlpha = Math.min(1, alpha * 1.6);
    ctx.font = `700 ${t.size}px 'Segoe UI', system-ui, sans-serif`;
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, t.x - view.x, t.y - view.y);
  }
  ctx.restore();
}

export function render(renderer, game) {
  const { ctx, width, height, dpr } = renderer;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const view = cameraView(game);
  view.width = width;
  view.height = height;

  drawBackground(ctx, view, width, height);
  drawGems(ctx, game.combat.gems, view);
  drawEnemies(ctx, game.enemies, view, game.time);
  if (game.mode !== 'title') drawPlayer(ctx, game.player, view, game.time);
  drawBullets(ctx, game.combat.bullets, view);
  drawOrbs(ctx, game.combat.orbs, view, game.time);
  drawEffects(ctx, game.effects, view);

  // Red vignette when hurt.
  if (game.effects.flash > 0) {
    const gradient = ctx.createRadialGradient(
      width / 2, height / 2, Math.min(width, height) * 0.35,
      width / 2, height / 2, Math.max(width, height) * 0.75,
    );
    gradient.addColorStop(0, 'rgba(244, 63, 94, 0)');
    gradient.addColorStop(1, `rgba(244, 63, 94, ${0.55 * game.effects.flash})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }
}
