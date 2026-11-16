// Neon Swarm — the DOM interface: HUD, banners and menu screens.
// The canvas draws the game; this module owns every HTML element around it.

function $(id) {
  return document.getElementById(id);
}

export function createUi() {
  const ui = {
    hud: $('hud'),
    hpFill: $('hp-fill'),
    hpText: $('hp-text'),
    xpFill: $('xp-fill'),
    levelText: $('level-text'),
    waveText: $('wave-text'),
    enemiesText: $('enemies-text'),
    scoreText: $('score-text'),
    comboText: $('combo-text'),
    killsText: $('kills-text'),
    timeText: $('time-text'),
    dashFill: $('dash-fill'),
    dashLabel: $('dash-label'),
    bossBar: $('boss-bar'),
    bossName: $('boss-name'),
    bossFill: $('boss-fill'),
    banner: $('banner'),
    bannerText: $('banner-text'),
    screens: {
      title: $('title-screen'),
      pause: $('pause-screen'),
      levelup: $('levelup-screen'),
      gameover: $('gameover-screen'),
      victory: $('victory-screen'),
    },
    levelupCards: $('levelup-cards'),
    bannerTimer: 0,
  };
  return ui;
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function showScreen(ui, name) {
  for (const [key, el] of Object.entries(ui.screens)) {
    el.classList.toggle('visible', key === name);
  }
  ui.hud.classList.toggle('visible', name === null);
}

export function updateHud(ui, game) {
  const p = game.player;
  ui.hpFill.style.width = `${Math.max(0, (p.hp / p.maxHp) * 100)}%`;
  ui.hpFill.classList.toggle('low', p.hp / p.maxHp < 0.3);
  ui.hpText.textContent = `${Math.ceil(Math.max(0, p.hp))} / ${p.maxHp}`;
  ui.xpFill.style.width = `${Math.min(100, (p.xp / p.xpNext) * 100)}%`;
  ui.levelText.textContent = `LV ${p.level}`;
  ui.waveText.textContent = `WAVE ${game.wave}`;
  const remaining = game.enemies.length + game.waves.queue;
  ui.enemiesText.textContent = game.waveState === 'clearing' ? 'CLEARED' : `${remaining} HOSTILES`;
  ui.scoreText.textContent = String(game.score).padStart(6, '0');
  ui.killsText.textContent = `${game.kills} KILLS`;
  ui.timeText.textContent = formatTime(game.time);
  if (game.combo >= 3) {
    const mult = Math.min(3, 1 + game.combo * 0.05);
    ui.comboText.textContent = `COMBO x${game.combo} · ${mult.toFixed(2)}x SCORE`;
    ui.comboText.classList.add('visible');
  } else {
    ui.comboText.classList.remove('visible');
  }
  const dashTotal = 2.1 * p.dashCooldownMul;
  const dashReady = p.dashCooldown <= 0;
  ui.dashFill.style.width = `${dashReady ? 100 : (1 - p.dashCooldown / dashTotal) * 100}%`;
  ui.dashLabel.textContent = dashReady ? 'DASH READY [SPACE]' : 'DASH…';
  ui.dashLabel.classList.toggle('ready', dashReady);

  if (game.boss) {
    ui.bossBar.classList.add('visible');
    ui.bossName.textContent = game.boss.name;
    ui.bossFill.style.width = `${Math.max(0, (game.boss.hp / game.boss.maxHp) * 100)}%`;
  } else {
    ui.bossBar.classList.remove('visible');
  }
}

export function showBanner(ui, text, kind = '') {
  ui.bannerText.textContent = text;
  ui.bannerText.className = kind;
  ui.banner.classList.remove('show');
  // Restart the CSS animation by forcing a reflow.
  void ui.banner.offsetWidth;
  ui.banner.classList.add('show');
}

export function renderLevelUpCards(ui, choices, onPick) {
  ui.levelupCards.innerHTML = '';
  choices.forEach((choice, index) => {
    const card = document.createElement('button');
    card.className = 'upgrade-card';
    card.innerHTML =
      `<span class="card-glyph">${choice.glyph}</span>` +
      `<span class="card-name">${choice.name}</span>` +
      `<span class="card-desc">${choice.desc}</span>` +
      `<span class="card-key">[${index + 1}]</span>`;
    card.addEventListener('click', () => onPick(choice));
    ui.levelupCards.appendChild(card);
  });
}

export function showRunEnd(ui, game, kind, result) {
  if (kind === 'gameover') {
    $('final-score').textContent = String(game.score).padStart(6, '0');
    $('final-wave').textContent = `WAVE ${game.wave}`;
    $('final-kills').textContent = `${game.kills} KILLS`;
    $('final-time').textContent = formatTime(game.time);
    $('new-best').classList.toggle('visible', result.isNewBest);
    $('best-line').textContent = `BEST ${String(result.best.score).padStart(6, '0')} · WAVE ${result.best.wave}`;
    showScreen(ui, 'gameover');
  } else {
    $('victory-score').textContent = String(game.score).padStart(6, '0');
    $('victory-kills').textContent = `${game.kills} KILLS`;
    $('victory-time').textContent = formatTime(game.time);
    $('victory-best').textContent = `BEST ${String(result.best.score).padStart(6, '0')} · WAVE ${result.best.wave}`;
    showScreen(ui, 'victory');
  }
}

export function showBestOnTitle(ui, best) {
  $('best-score').textContent = String(best.score).padStart(6, '0');
  $('best-wave').textContent = best.wave > 0 ? `BEST WAVE ${best.wave}` : 'NO RUNS YET — GOOD LUCK, PILOT';
  $('best-victories').textContent = best.victories > 0 ? `★ ${best.victories} VICTOR${best.victories === 1 ? 'Y' : 'IES'}` : '';
}
