// Neon Swarm — entry point: boot, game loop and screen flow.
// Modes: title → playing ⇄ levelup / paused → gameover | victory.
// Keyboard: WASD/arrows move, mouse aims, SPACE dashes, ESC pauses, M mutes,
// R restarts after a run ends, 1/2/3 pick an upgrade.

import { createGame, startRun, continueEndless, updateGame } from './world.js';
import { createRenderer, render } from './render.js';
import { createInput, wasPressed, endFrame } from './input.js';
import { createUi, showScreen, updateHud, showBanner, renderLevelUpCards, showRunEnd, showBestOnTitle } from './ui.js';
import { rollUpgrades } from './upgrades.js';
import { saveBest } from './storage.js';
import { sfx, startMusic, stopMusic, setMuted, isMuted, unlockAudio } from './audio.js';
import { createEnemy } from './enemies.js';
import { grantXp } from './player.js';

const canvas = document.getElementById('game-canvas');
const renderer = createRenderer(canvas);
const input = createInput(canvas);
const ui = createUi();
const game = createGame();

let lastTime = performance.now();
let currentChoices = [];

// --- Screen flow -----------------------------------------------------------

game.announce = (text, kind) => showBanner(ui, text, kind);

game.onLevelUp = () => {
  currentChoices = rollUpgrades(game.player.upgradesTaken, 3);
  renderLevelUpCards(ui, currentChoices, pickUpgrade);
  showScreen(ui, 'levelup');
  sfx.levelUp();
};

game.onRunEnd = (kind) => {
  const result = saveBest({
    score: game.score,
    wave: game.wave,
    kills: game.kills,
    victory: kind === 'victory',
  });
  game.best = result.best;
  stopMusic();
  if (kind === 'victory') sfx.victory();
  else sfx.gameOver();
  showRunEnd(ui, game, kind, result);
};

function pickUpgrade(choice) {
  choice.apply(game.player);
  if (choice.id !== 'repair') {
    const taken = game.player.upgradesTaken;
    taken[choice.id] = (taken[choice.id] || 0) + 1;
  }
  sfx.click();
  game.mode = 'playing';
  showScreen(ui, null);
  // A second pending level-up opens the choice again on the next frame.
}

function beginRun() {
  unlockAudio();
  sfx.click();
  game.endless = false;
  startRun(game);
  showScreen(ui, null);
  startMusic();
}

function togglePause() {
  if (game.mode === 'playing') {
    game.mode = 'paused';
    showScreen(ui, 'pause');
    sfx.click();
  } else if (game.mode === 'paused') {
    game.mode = 'playing';
    showScreen(ui, null);
    sfx.click();
  }
}

function toggleMute() {
  unlockAudio();
  setMuted(!isMuted());
  document.getElementById('mute-btn').textContent = isMuted() ? 'SOUND OFF' : 'SOUND ON';
  document.getElementById('mute-btn').classList.toggle('muted', isMuted());
}

// --- Buttons ---------------------------------------------------------------

document.getElementById('start-btn').addEventListener('click', beginRun);
document.getElementById('resume-btn').addEventListener('click', togglePause);
document.getElementById('restart-btn').addEventListener('click', beginRun);
document.getElementById('retry-btn').addEventListener('click', beginRun);
document.getElementById('again-btn').addEventListener('click', beginRun);
document.getElementById('continue-btn').addEventListener('click', () => {
  sfx.click();
  continueEndless(game);
  showScreen(ui, null);
  startMusic();
});
document.getElementById('mute-btn').addEventListener('click', toggleMute);

// --- Resize ----------------------------------------------------------------

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.resize(width, height);
  game.camera.width = width;
  game.camera.height = height;
}
window.addEventListener('resize', resize);
resize();

// --- Main loop -------------------------------------------------------------

function frame(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  if (game.mode === 'playing') {
    updateGame(game, input, dt);
    updateHud(ui, game);
  } else if (game.mode === 'levelup') {
    // Number keys pick a card.
    for (let i = 0; i < currentChoices.length; i++) {
      if (wasPressed(input, `Digit${i + 1}`)) {
        pickUpgrade(currentChoices[i]);
        break;
      }
    }
  }

  // Global keys.
  if (wasPressed(input, 'Escape') || wasPressed(input, 'KeyP')) togglePause();
  if (wasPressed(input, 'KeyM')) toggleMute();
  if (wasPressed(input, 'KeyR') && (game.mode === 'gameover' || game.mode === 'victory')) beginRun();
  if (wasPressed(input, 'Enter') && game.mode === 'title') beginRun();
  if (wasPressed(input, 'Space') && game.mode === 'title') beginRun();

  render(renderer, game);
  endFrame(input);
  requestAnimationFrame(frame);
}

// --- Boot ------------------------------------------------------------------

showBestOnTitle(ui, game.best);
showScreen(ui, 'title');
requestAnimationFrame(frame);

// --- Debug handle ----------------------------------------------------------
// Used by the screenshot script (and any curious pilot) to drive the real
// game into a state: every helper calls the same code paths as normal play.
window.__neonSwarm = {
  game,
  start: beginRun,
  spawn(type, x, y) {
    game.enemies.push(createEnemy(type, x ?? game.player.x + 200, y ?? game.player.y, game.wave || 1));
  },
  grantXp(amount) {
    if (grantXp(game.player, amount)) {
      game.pendingLevelUps += 1;
    }
  },
  killPlayer() {
    // The next update sees hp <= 0 and runs the normal game-over path.
    game.player.hp = 0;
  },
  setScore(score) {
    game.score = score;
  },
};
