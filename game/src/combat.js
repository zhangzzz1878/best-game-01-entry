// Neon Swarm — combat: bullets, enemy orbs, gems, collisions and kills.
// Owns every damage number, every explosion, and the combo counter.

import { WORLD_WIDTH, WORLD_HEIGHT, COMBO } from './config.js';
import { chance, distanceSquared, rand, TAU } from './random.js';
import { burst, floatText, shockwave, addShake } from './particles.js';
import { createEnemy } from './enemies.js';
import { grantXp, hurtPlayer, magnetRadius } from './player.js';
import { sfx } from './audio.js';

export function createCombat() {
  return {
    bullets: [],
    orbs: [],
    gems: [],
  };
}

function scoreMultiplier(game) {
  return Math.min(COMBO.cap, 1 + game.combo * COMBO.step);
}

// Damage one enemy; returns true when it died.
function damageEnemy(game, enemy, damage, isCrit) {
  enemy.hp -= damage;
  enemy.flash = 1;
  floatText(
    game.effects,
    enemy.x,
    enemy.y - enemy.radius,
    String(Math.round(damage)),
    isCrit ? '#facc15' : '#e2e8f0',
    isCrit ? 19 : 14,
  );
  if (enemy.hp > 0) {
    sfx.hit();
    return false;
  }
  killEnemy(game, enemy);
  return true;
}

function killEnemy(game, enemy) {
  burst(game.effects, enemy.x, enemy.y, enemy.color, enemy.isBoss ? 60 : 16, enemy.isBoss ? 420 : 280);
  if (enemy.isBoss) {
    shockwave(game.effects, enemy.x, enemy.y, enemy.color, 260);
    addShake(game.effects, 14);
    sfx.explosion(true);
  } else {
    sfx.explosion(false);
  }
  // Score with the live combo multiplier, then grow the combo.
  const gained = Math.round(enemy.score * scoreMultiplier(game));
  game.score += gained;
  game.kills += 1;
  game.combo += 1;
  game.comboTimer = COMBO.window;
  floatText(game.effects, enemy.x, enemy.y - enemy.radius - 18, `+${gained}`, '#facc15', 15);
  // Gems scatter from the corpse.
  for (let i = 0; i < enemy.xp; i++) {
    const angle = rand(0, TAU);
    const dist = rand(6, 34);
    game.combat.gems.push({
      x: enemy.x + Math.cos(angle) * dist,
      y: enemy.y + Math.sin(angle) * dist,
      vx: Math.cos(angle) * rand(40, 120),
      vy: Math.sin(angle) * rand(40, 120),
      value: 1,
      radius: 6,
      life: 25,
    });
  }
  // Splitters burst into minis.
  if (enemy.splitsInto) {
    for (let i = 0; i < enemy.splitCount; i++) {
      const angle = (i / enemy.splitCount) * TAU + rand(-0.3, 0.3);
      const mini = createEnemy(enemy.splitsInto, enemy.x + Math.cos(angle) * 24, enemy.y + Math.sin(angle) * 24, game.wave);
      mini.vx = Math.cos(angle) * 160;
      mini.vy = Math.sin(angle) * 160;
      game.enemies.push(mini);
    }
  }
  if (enemy.isBoss) {
    game.boss = null;
    game.waveState = 'clearing';
    game.waveClearTimer = 1.6;
  }
}

export function updateCombat(game, dt) {
  const { player, enemies, combat, effects } = game;
  const { bullets, orbs, gems } = combat;

  // --- Player bullets ---
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.life -= dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.life <= 0 || b.x < 0 || b.x > WORLD_WIDTH || b.y < 0 || b.y > WORLD_HEIGHT) {
      bullets.splice(i, 1);
      continue;
    }
    for (let j = enemies.length - 1; j >= 0; j--) {
      const enemy = enemies[j];
      if (b.hitIds.has(enemy.id)) continue;
      const rr = b.radius + enemy.radius;
      if (distanceSquared(b.x, b.y, enemy.x, enemy.y) > rr * rr) continue;
      b.hitIds.add(enemy.id);
      const isCrit = chance(player.critChance);
      const died = damageEnemy(game, enemy, b.damage * (isCrit ? 2 : 1), isCrit);
      if (died) enemies.splice(j, 1);
      if (b.pierce > 0) {
        b.pierce -= 1;
      } else {
        bullets.splice(i, 1);
      }
      break;
    }
  }

  // --- Enemy orbs ---
  for (let i = orbs.length - 1; i >= 0; i--) {
    const o = orbs[i];
    o.life -= dt;
    o.x += o.vx * dt;
    o.y += o.vy * dt;
    if (o.life <= 0 || o.x < 0 || o.x > WORLD_WIDTH || o.y < 0 || o.y > WORLD_HEIGHT) {
      orbs.splice(i, 1);
      continue;
    }
    const rr = o.radius + player.radius;
    if (distanceSquared(o.x, o.y, player.x, player.y) <= rr * rr) {
      orbs.splice(i, 1);
      if (hurtPlayer(player, o.damage)) onPlayerHit(game, o.x, o.y);
    }
  }

  // --- Enemy contact ---
  for (const enemy of enemies) {
    if (enemy.touchCooldown > 0) continue;
    const rr = enemy.radius + player.radius - 2;
    if (distanceSquared(enemy.x, enemy.y, player.x, player.y) <= rr * rr) {
      enemy.touchCooldown = 0.8;
      if (hurtPlayer(player, enemy.damage)) onPlayerHit(game, enemy.x, enemy.y);
    }
  }

  // --- Orbit blades ---
  if (player.orbitBlades > 0) {
    const orbitRadius = 74;
    for (let k = 0; k < player.orbitBlades; k++) {
      const angle = player.orbitAngle + (k / player.orbitBlades) * TAU;
      const bx = player.x + Math.cos(angle) * orbitRadius;
      const by = player.y + Math.sin(angle) * orbitRadius;
      for (let j = enemies.length - 1; j >= 0; j--) {
        const enemy = enemies[j];
        const rr = 20 + enemy.radius;
        if (distanceSquared(bx, by, enemy.x, enemy.y) > rr * rr) continue;
        if (enemy.bladeCooldown > 0) continue;
        enemy.bladeCooldown = 0.45;
        const died = damageEnemy(game, enemy, 16 * player.damageMul, false);
        if (died) enemies.splice(j, 1);
      }
    }
  }
  for (const enemy of enemies) {
    if (enemy.bladeCooldown) enemy.bladeCooldown = Math.max(0, enemy.bladeCooldown - dt);
  }

  // --- Nova pulse ---
  if (player.novaLevel > 0 && player.novaTimer <= 0) {
    player.novaTimer = Math.max(3.2, 6 - player.novaLevel * 0.8);
    const radius = 170 + player.novaLevel * 40;
    const damage = (22 + player.novaLevel * 14) * player.damageMul;
    shockwave(effects, player.x, player.y, '#a78bfa', radius);
    sfx.explosion(false);
    for (let j = enemies.length - 1; j >= 0; j--) {
      const enemy = enemies[j];
      const rr = radius + enemy.radius;
      if (distanceSquared(player.x, player.y, enemy.x, enemy.y) > rr * rr) continue;
      const died = damageEnemy(game, enemy, damage, false);
      if (died) enemies.splice(j, 1);
    }
  }

  // --- Gems: drift, magnet, collect ---
  const magnet = magnetRadius(player) + player.radius;
  for (let i = gems.length - 1; i >= 0; i--) {
    const g = gems[i];
    g.life -= dt;
    if (g.life <= 0) {
      gems.splice(i, 1);
      continue;
    }
    const dx = player.x - g.x;
    const dy = player.y - g.y;
    const distSq = dx * dx + dy * dy;
    if (distSq < magnet * magnet) {
      const dist = Math.sqrt(distSq) || 1;
      const pull = 900 * (1 - dist / (magnet * 1.4));
      g.vx += (dx / dist) * pull * dt * 4;
      g.vy += (dy / dist) * pull * dt * 4;
    }
    g.vx *= 1 - Math.min(0.9, 2.4 * dt);
    g.vy *= 1 - Math.min(0.9, 2.4 * dt);
    g.x += g.vx * dt;
    g.y += g.vy * dt;
    if (distSq < 26 * 26) {
      gems.splice(i, 1);
      sfx.pickup();
      if (grantXp(player, g.value)) game.pendingLevelUps += 1;
    }
  }

  // --- Combo decay ---
  if (game.combo > 0) {
    game.comboTimer -= dt;
    if (game.comboTimer <= 0) {
      game.combo = 0;
    }
  }
}

function onPlayerHit(game, x, y) {
  burst(game.effects, x, y, '#fb7185', 10, 220);
  addShake(game.effects, 7);
  game.effects.flash = Math.min(1, game.effects.flash + 0.55);
  sfx.hurt();
  game.combo = 0;
  game.comboTimer = 0;
  if (game.player.hp <= 0) {
    game.player.hp = 0;
  }
}
