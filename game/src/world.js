// Neon Swarm — the game state and its update step.
// Owns the world: player, enemies, combat, waves, camera and score. The main
// loop calls updateGame once per frame while the mode is 'playing'.

import { WORLD_WIDTH, WORLD_HEIGHT } from './config.js';
import { clamp } from './random.js';
import { createPlayer, updatePlayer, updateFiring } from './player.js';
import { createCombat, updateCombat } from './combat.js';
import { createEffects, updateEffects } from './particles.js';
import { createWaves, startWave, updateWaves, updateWaveClear } from './waves.js';
import { createEnemy, updateEnemy, separateEnemies } from './enemies.js';
import { loadBest } from './storage.js';

export function createGame() {
  return {
    mode: 'title', // title | playing | levelup | paused | gameover | victory
    time: 0,
    score: 0,
    kills: 0,
    combo: 0,
    comboTimer: 0,
    wave: 0,
    waveState: 'fighting', // fighting | clearing
    waveClearTimer: 0,
    endless: false,
    pendingLevelUps: 0,
    player: createPlayer(),
    enemies: [],
    combat: createCombat(),
    effects: createEffects(),
    waves: createWaves(),
    boss: null,
    camera: { x: 0, y: 0, width: 1280, height: 800 },
    best: loadBest(),
    // Set by main.js: shows a banner line on screen.
    announce: () => {},
    // Set by main.js: called with 'victory' | 'gameover' when a run ends.
    onRunEnd: () => {},
    // Set by main.js: called when a level-up choice is waiting.
    onLevelUp: () => {},
  };
}

export function startRun(game) {
  const fresh = createGame();
  fresh.best = game.best;
  fresh.announce = game.announce;
  fresh.onRunEnd = game.onRunEnd;
  fresh.onLevelUp = game.onLevelUp;
  fresh.mode = 'playing';
  fresh.endless = game.endless;
  Object.assign(game, fresh);
  startWave(game, 1);
}

export function continueEndless(game) {
  game.endless = true;
  game.mode = 'playing';
  game.waveState = 'fighting';
  startWave(game, game.wave + 1);
}

// One frame of the live game. Returns 'levelup' | 'gameover' | 'victory' | null.
export function updateGame(game, input, dt) {
  game.time += dt;
  const { player, camera } = game;

  updatePlayer(player, input, camera, game.effects, dt);
  updateFiring(player, game.combat.bullets, dt);

  // Enemies steer, shoot and summon.
  const spawn = (type, x, y) => {
    game.enemies.push(createEnemy(type, x, y, game.wave));
  };
  for (const enemy of game.enemies) {
    updateEnemy(enemy, player, game.combat.orbs, spawn, dt);
  }
  separateEnemies(game.enemies, dt);

  updateCombat(game, dt);
  updateWaves(game, dt, camera.width, camera.height);
  const cleared = updateWaveClear(game, dt);
  updateEffects(game.effects, dt);
  updateCamera(game);

  if (player.hp <= 0) {
    game.mode = 'gameover';
    game.onRunEnd('gameover');
    return 'gameover';
  }
  if (cleared === 'victory') {
    game.mode = 'victory';
    game.onRunEnd('victory');
    return 'victory';
  }
  if (game.pendingLevelUps > 0) {
    game.pendingLevelUps -= 1;
    game.mode = 'levelup';
    game.onLevelUp();
    return 'levelup';
  }
  return null;
}

function updateCamera(game) {
  const { player, camera } = game;
  const targetX = player.x - camera.width / 2;
  const targetY = player.y - camera.height / 2;
  const maxX = Math.max(0, WORLD_WIDTH - camera.width);
  const maxY = Math.max(0, WORLD_HEIGHT - camera.height);
  // Ease toward the target so the view glides instead of snapping.
  camera.x += (clamp(targetX, 0, maxX) - camera.x) * Math.min(1, 8 * 0.016);
  camera.y += (clamp(targetY, 0, maxY) - camera.y) * Math.min(1, 8 * 0.016);
}

// Where the camera actually looks this frame, with shake applied.
export function cameraView(game) {
  const shake = game.effects.shake;
  return {
    x: game.camera.x + (shake > 0 ? (Math.random() * 2 - 1) * shake : 0),
    y: game.camera.y + (Math.random() * 2 - 1) * (shake > 0 ? shake : 0),
  };
}
