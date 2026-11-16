// Neon Swarm — the wave director.
// Fields a quota of enemies per wave, escalates the mix, and sends a boss
// every fifth wave. Wave 10's boss is the victory condition.

import { waveQuota, waveSpawnInterval, waveTable, VICTORY_WAVE } from './config.js';
import { pickWeighted } from './random.js';
import { createEnemy, createBoss, spawnPointNear } from './enemies.js';
import { sfx } from './audio.js';

export function createWaves() {
  return {
    queue: 0, // enemies still to spawn this wave
    spawnTimer: 0,
    bossWave: false,
  };
}

// Starts a wave: resets the queue and announces it through `onAnnounce`.
export function startWave(game, wave) {
  game.wave = wave;
  const waves = game.waves;
  waves.bossWave = wave % 5 === 0;
  waves.queue = waves.bossWave ? 4 + wave : waveQuota(wave);
  waves.spawnTimer = 0.5;
  if (waves.bossWave) {
    game.boss = createBoss(wave);
    game.enemies.push(game.boss);
    sfx.boss();
    game.announce(`WAVE ${wave} — THE WARDEN AWAKENS`, 'danger');
  } else {
    game.announce(`WAVE ${wave}`, '');
  }
}

export function updateWaves(game, dt, viewWidth, viewHeight) {
  const waves = game.waves;
  if (game.waveState !== 'fighting') return;

  // Spawn from the queue on a timer.
  if (waves.queue > 0) {
    waves.spawnTimer -= dt;
    if (waves.spawnTimer <= 0) {
      waves.spawnTimer = waveSpawnInterval(game.wave);
      waves.queue -= 1;
      const type = pickWeighted(waveTable(game.wave));
      const at = spawnPointNear(game.player, game.camera, viewWidth, viewHeight);
      game.enemies.push(createEnemy(type, at.x, at.y, game.wave));
    }
  }

  // Wave cleared when nothing is left to spawn and nothing is alive.
  if (waves.queue <= 0 && game.enemies.length === 0) {
    game.waveState = 'clearing';
    game.waveClearTimer = 1.8;
    const bonus = 100 * game.wave;
    game.score += bonus;
    game.player.hp = Math.min(game.player.maxHp, game.player.hp + 8);
    sfx.waveClear();
    game.announce(`WAVE ${game.wave} CLEARED  +${bonus}`, 'good');
  }
}

// Advances the between-waves timer; returns 'next' when the next wave begins,
// 'victory' when the final boss wave was cleared.
export function updateWaveClear(game, dt) {
  if (game.waveState !== 'clearing') return null;
  game.waveClearTimer -= dt;
  if (game.waveClearTimer > 0) return null;
  if (game.wave >= VICTORY_WAVE && !game.endless) return 'victory';
  game.waveState = 'fighting';
  startWave(game, game.wave + 1);
  return 'next';
}
