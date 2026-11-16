// Neon Swarm — enemies: spawning, movement AI and the boss.
// Each enemy is a plain object; `behavior` selects its steering in updateEnemy.

import { ENEMIES, BOSS, WORLD_WIDTH, WORLD_HEIGHT, enemyScaling } from './config.js';
import { angleTo, angleDelta, clamp, rand, TAU } from './random.js';

let nextId = 1;

export function createEnemy(type, x, y, wave) {
  const def = ENEMIES[type];
  const scale = enemyScaling(wave);
  const hp = Math.round(def.hp * scale.hp);
  return {
    id: nextId++,
    type,
    name: def.name,
    shape: def.shape,
    behavior: def.behavior,
    x,
    y,
    vx: 0,
    vy: 0,
    angle: rand(0, TAU),
    radius: def.radius,
    hp,
    maxHp: hp,
    speed: def.speed * scale.speed,
    damage: def.damage,
    score: def.score,
    xp: def.xp,
    color: def.color,
    splitsInto: def.splitsInto || null,
    splitCount: def.splitCount || 0,
    shotCooldown: def.shotCooldown ? rand(1, def.shotCooldown) : 0,
    shotSpeed: def.shotSpeed || 0,
    preferredRange: def.preferredRange || 0,
    // Lunge state (speeder): wind up, then burst.
    lungeTimer: rand(0.6, 1.6),
    lunging: 0,
    // Contact damage has its own cooldown so one touch is one hit.
    touchCooldown: 0,
    flash: 0, // white hit-flash, decays in render
    isBoss: false,
  };
}

export function createBoss(wave) {
  const hp = BOSS.baseHp + BOSS.hpPerWave * (wave - 5);
  return {
    id: nextId++,
    type: 'boss',
    name: BOSS.name,
    shape: BOSS.shape,
    behavior: 'boss',
    x: WORLD_WIDTH / 2,
    y: 140,
    vx: 0,
    vy: 0,
    angle: Math.PI / 2,
    radius: BOSS.radius,
    hp,
    maxHp: hp,
    speed: BOSS.speed,
    damage: BOSS.damage,
    score: BOSS.score,
    xp: BOSS.xp,
    color: BOSS.color,
    splitsInto: null,
    splitCount: 0,
    shotCooldown: 0,
    shotSpeed: 0,
    preferredRange: 0,
    lungeTimer: 0,
    lunging: 0,
    touchCooldown: 0,
    flash: 0,
    isBoss: true,
    burstTimer: 2.2,
    summonTimer: 5,
    chargeTimer: 4,
    charging: 0,
    chargeDirX: 0,
    chargeDirY: 1,
  };
}

// Picks a spawn point just outside the camera view but inside the world.
export function spawnPointNear(player, camera, viewWidth, viewHeight) {
  for (let attempt = 0; attempt < 12; attempt++) {
    const angle = rand(0, TAU);
    const distance = rand(Math.max(viewWidth, viewHeight) * 0.55, Math.max(viewWidth, viewHeight) * 0.8);
    const x = clamp(player.x + Math.cos(angle) * distance, 30, WORLD_WIDTH - 30);
    const y = clamp(player.y + Math.sin(angle) * distance, 30, WORLD_HEIGHT - 30);
    const onScreen =
      x > camera.x - 40 && x < camera.x + viewWidth + 40 &&
      y > camera.y - 40 && y < camera.y + viewHeight + 40;
    if (!onScreen) return { x, y };
  }
  return { x: clamp(player.x + rand(-500, 500), 30, WORLD_WIDTH - 30), y: 60 };
}

// Steers one enemy toward the player according to its behavior.
// `orbs` receives boss / shooter projectiles; `spawn` queues summoned enemies.
export function updateEnemy(enemy, player, orbs, spawn, dt) {
  enemy.touchCooldown = Math.max(0, enemy.touchCooldown - dt);
  enemy.flash = Math.max(0, enemy.flash - dt * 6);
  const targetAngle = angleTo(enemy.x, enemy.y, player.x, player.y);
  const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);

  if (enemy.behavior === 'chase' || enemy.behavior === 'boss') {
    steerToward(enemy, targetAngle, dt, enemy.behavior === 'boss' ? 2.2 : 4.5);
    enemy.vx = Math.cos(enemy.angle) * enemy.speed;
    enemy.vy = Math.sin(enemy.angle) * enemy.speed;
  } else if (enemy.behavior === 'lunge') {
    if (enemy.lunging > 0) {
      enemy.lunging -= dt;
      enemy.vx = Math.cos(enemy.angle) * enemy.speed * 2.1;
      enemy.vy = Math.sin(enemy.angle) * enemy.speed * 2.1;
    } else {
      enemy.lungeTimer -= dt;
      steerToward(enemy, targetAngle, dt, 5);
      const cruise = dist > 260 ? enemy.speed : enemy.speed * 0.45;
      enemy.vx = Math.cos(enemy.angle) * cruise;
      enemy.vy = Math.sin(enemy.angle) * cruise;
      if (enemy.lungeTimer <= 0 && dist < 420) {
        enemy.lunging = 0.45;
        enemy.lungeTimer = rand(1.2, 2.2);
      }
    }
  } else if (enemy.behavior === 'strafe') {
    // Keep a preferred distance and circle slowly while shooting.
    steerToward(enemy, targetAngle, dt, 4);
    const radial = dist > enemy.preferredRange + 40 ? 1 : dist < enemy.preferredRange - 40 ? -1 : 0;
    const tangent = 0.6;
    const rx = Math.cos(targetAngle) * radial;
    const ry = Math.sin(targetAngle) * radial;
    const tx = -Math.sin(targetAngle) * tangent;
    const ty = Math.cos(targetAngle) * tangent;
    const len = Math.hypot(rx + tx, ry + ty) || 1;
    enemy.vx = ((rx + tx) / len) * enemy.speed;
    enemy.vy = ((ry + ty) / len) * enemy.speed;
    enemy.shotCooldown -= dt;
    if (enemy.shotCooldown <= 0 && dist < 560) {
      enemy.shotCooldown = ENEMIES.shooter.shotCooldown;
      orbs.push({
        x: enemy.x,
        y: enemy.y,
        vx: Math.cos(targetAngle) * enemy.shotSpeed,
        vy: Math.sin(targetAngle) * enemy.shotSpeed,
        radius: 7,
        damage: enemy.damage,
        life: 4,
        color: '#fb923c',
      });
    }
  }

  if (enemy.isBoss) updateBossAttacks(enemy, player, orbs, spawn, dt);

  enemy.x = clamp(enemy.x + enemy.vx * dt, enemy.radius, WORLD_WIDTH - enemy.radius);
  enemy.y = clamp(enemy.y + enemy.vy * dt, enemy.radius, WORLD_HEIGHT - enemy.radius);
}

function steerToward(enemy, targetAngle, dt, turnRate) {
  enemy.angle += clamp(angleDelta(enemy.angle, targetAngle), -turnRate * dt, turnRate * dt);
}

function updateBossAttacks(boss, player, orbs, spawn, dt) {
  // Radial burst.
  boss.burstTimer -= dt;
  if (boss.burstTimer <= 0) {
    boss.burstTimer = BOSS.burstCooldown;
    const offset = rand(0, TAU);
    for (let i = 0; i < BOSS.burstOrbs; i++) {
      const angle = offset + (i / BOSS.burstOrbs) * TAU;
      orbs.push({
        x: boss.x,
        y: boss.y,
        vx: Math.cos(angle) * 230,
        vy: Math.sin(angle) * 230,
        radius: 8,
        damage: 14,
        life: 5,
        color: '#fb7185',
      });
    }
  }
  // Summon minions.
  boss.summonTimer -= dt;
  if (boss.summonTimer <= 0) {
    boss.summonTimer = BOSS.summonCooldown;
    for (let i = 0; i < BOSS.summonCount; i++) {
      const angle = rand(0, TAU);
      spawn('seeker', boss.x + Math.cos(angle) * 90, boss.y + Math.sin(angle) * 90);
    }
  }
  // Telegraph, then charge at the player.
  boss.chargeTimer -= dt;
  if (boss.charging > 0) {
    boss.charging -= dt;
    boss.vx = boss.chargeDirX * BOSS.chargeSpeed;
    boss.vy = boss.chargeDirY * BOSS.chargeSpeed;
  } else if (boss.chargeTimer <= 0) {
    boss.chargeTimer = BOSS.chargeCooldown;
    boss.charging = BOSS.chargeDuration;
    const angle = angleTo(boss.x, boss.y, player.x, player.y);
    boss.chargeDirX = Math.cos(angle);
    boss.chargeDirY = Math.sin(angle);
  }
}

// Gentle separation so enemies do not stack into one blob.
export function separateEnemies(enemies, dt) {
  for (let i = 0; i < enemies.length; i++) {
    const a = enemies[i];
    for (let j = i + 1; j < enemies.length; j++) {
      const b = enemies[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const minDist = a.radius + b.radius;
      const distSq = dx * dx + dy * dy;
      if (distSq === 0 || distSq >= minDist * minDist) continue;
      const dist = Math.sqrt(distSq);
      const push = ((minDist - dist) / minDist) * 60 * dt;
      const nx = dx / dist;
      const ny = dy / dist;
      const aWeight = a.isBoss ? 0 : 1;
      const bWeight = b.isBoss ? 0 : 1;
      a.x -= nx * push * aWeight;
      a.y -= ny * push * aWeight;
      b.x += nx * push * bWeight;
      b.y += ny * push * bWeight;
    }
  }
}
