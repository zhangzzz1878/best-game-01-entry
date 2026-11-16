// Neon Swarm — the player ship: movement, dash, firing and leveling.
// The player object carries both its base stats (from config) and the
// multipliers upgrades stack onto it.

import { PLAYER, DASH, WORLD_WIDTH, WORLD_HEIGHT, xpForLevel } from './config.js';
import { clamp, TAU } from './random.js';
import { moveVector, wantsDash } from './input.js';
import { trail } from './particles.js';
import { sfx } from './audio.js';

export function createPlayer() {
  return {
    x: WORLD_WIDTH / 2,
    y: WORLD_HEIGHT / 2,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2,
    radius: PLAYER.radius,
    hp: PLAYER.maxHp,
    maxHp: PLAYER.maxHp,
    level: 1,
    xp: 0,
    xpNext: xpForLevel(1),
    // Upgrade multipliers, all starting neutral.
    damageMul: 1,
    fireRateMul: 1,
    bulletSpeedMul: 1,
    bulletSizeMul: 1,
    speedMul: 1,
    magnetMul: 1,
    dashCooldownMul: 1,
    xpMul: 1,
    projectiles: 1,
    pierce: 0,
    critChance: 0.05,
    regen: 0,
    novaLevel: 0,
    orbitBlades: 0,
    // Dash state.
    dashTime: 0,
    dashCooldown: 0,
    dashDirX: 0,
    dashDirY: -1,
    // Combat timers.
    fireTimer: 0,
    invulnerable: 0,
    novaTimer: 0,
    orbitAngle: 0,
    upgradesTaken: {},
  };
}

export function magnetRadius(player) {
  return PLAYER.magnetRadius * player.magnetMul;
}

// Moves the ship, handles the dash, and returns the aim angle in world space.
export function updatePlayer(player, input, camera, effects, dt) {
  const move = moveVector(input);
  player.invulnerable = Math.max(0, player.invulnerable - dt);
  player.dashCooldown = Math.max(0, player.dashCooldown - dt);

  if (player.regen > 0 && player.hp > 0) {
    player.hp = Math.min(player.maxHp, player.hp + player.regen * dt);
  }

  // Start a dash: burst along the move direction (or the aim if standing still).
  if (wantsDash(input) && player.dashCooldown <= 0 && player.dashTime <= 0) {
    let dx = move.x;
    let dy = move.y;
    if (dx === 0 && dy === 0) {
      dx = Math.cos(player.angle);
      dy = Math.sin(player.angle);
    }
    player.dashDirX = dx;
    player.dashDirY = dy;
    player.dashTime = DASH.duration;
    player.dashCooldown = DASH.cooldown * player.dashCooldownMul;
    player.invulnerable = Math.max(player.invulnerable, DASH.iframes);
    sfx.dash();
  }

  const speed = PLAYER.speed * player.speedMul;
  if (player.dashTime > 0) {
    player.dashTime -= dt;
    player.vx = player.dashDirX * DASH.speed;
    player.vy = player.dashDirY * DASH.speed;
    trail(effects, player.x, player.y, '#22d3ee', 3);
  } else {
    // Smooth acceleration toward the wanted velocity: snappy but not twitchy.
    const targetVx = move.x * speed;
    const targetVy = move.y * speed;
    const blend = Math.min(1, dt * 14);
    player.vx += (targetVx - player.vx) * blend;
    player.vy += (targetVy - player.vy) * blend;
  }

  player.x = clamp(player.x + player.vx * dt, player.radius, WORLD_WIDTH - player.radius);
  player.y = clamp(player.y + player.vy * dt, player.radius, WORLD_HEIGHT - player.radius);

  // Aim at the mouse (screen space converted to world space through the camera).
  const worldMouseX = input.mouseX + camera.x;
  const worldMouseY = input.mouseY + camera.y;
  player.angle = Math.atan2(worldMouseY - player.y, worldMouseX - player.x);
  player.orbitAngle = (player.orbitAngle + dt * 3.4) % TAU;
  player.novaTimer -= dt;
}

// Fires bullets toward the aim while the timer allows; returns nothing, but
// pushes new bullets into `bullets`. Auto-fire: holding the mouse is optional.
export function updateFiring(player, bullets, dt) {
  player.fireTimer -= dt;
  const interval = 1 / (PLAYER.fireRate * player.fireRateMul);
  if (player.fireTimer > 0) return;
  player.fireTimer = Math.max(player.fireTimer + interval, 0);

  const count = player.projectiles;
  const spread = 0.11; // radians between parallel shots
  const baseAngle = player.angle - (spread * (count - 1)) / 2;
  for (let i = 0; i < count; i++) {
    const angle = baseAngle + spread * i;
    const speed = PLAYER.bulletSpeed * player.bulletSpeedMul;
    bullets.push({
      x: player.x + Math.cos(angle) * (player.radius + 6),
      y: player.y + Math.sin(angle) * (player.radius + 6),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: PLAYER.bulletRadius * player.bulletSizeMul,
      damage: PLAYER.bulletDamage * player.damageMul,
      pierce: player.pierce,
      hitIds: new Set(),
      life: 1.1,
    });
  }
  sfx.shoot();
}

// Grants XP; returns true when the player leveled up (possibly more than once).
export function grantXp(player, amount) {
  player.xp += amount * player.xpMul;
  let leveled = false;
  while (player.xp >= player.xpNext) {
    player.xp -= player.xpNext;
    player.level += 1;
    player.xpNext = xpForLevel(player.level);
    leveled = true;
  }
  return leveled;
}

// Applies damage unless invulnerable; returns true when the hit landed.
export function hurtPlayer(player, damage) {
  if (player.invulnerable > 0 || player.hp <= 0) return false;
  player.hp -= damage;
  player.invulnerable = PLAYER.contactGrace;
  return true;
}
