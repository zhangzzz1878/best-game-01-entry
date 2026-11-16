// Neon Swarm — tuning constants.
// Every number that shapes how the game feels lives in this one file.

export const WORLD_WIDTH = 2200;
export const WORLD_HEIGHT = 1600;

// Neon palette on a deep-space background.
export const COLORS = {
  background: '#050510',
  grid: 'rgba(56, 189, 248, 0.07)',
  gridMajor: 'rgba(56, 189, 248, 0.14)',
  wall: '#22d3ee',
  player: '#22d3ee',
  playerCore: '#ecfeff',
  bullet: '#a5f3fc',
  gem: '#4ade80',
  text: '#e2e8f0',
  dimText: '#94a3b8',
  danger: '#fb7185',
  gold: '#facc15',
};

export const PLAYER = {
  radius: 14,
  speed: 270,
  maxHp: 100,
  fireRate: 6.5, // shots per second
  bulletSpeed: 760,
  bulletDamage: 12,
  bulletRadius: 5,
  magnetRadius: 120,
  contactGrace: 0.6, // seconds of invulnerability after taking a hit
  pickupRadius: 24,
};

export const DASH = {
  speed: 950,
  duration: 0.16,
  cooldown: 2.1,
  iframes: 0.3,
};

export const COMBO = {
  window: 2.5, // seconds to keep the chain alive
  step: 0.05, // +5% score per combo kill
  cap: 3.0, // score multiplier cap
};

export const VICTORY_WAVE = 10;

// XP needed to go from `level` to `level + 1`.
export function xpForLevel(level) {
  return 8 + (level - 1) * 5 + Math.floor(Math.pow(level - 1, 1.5));
}

// Enemy definitions. `behavior` picks the AI in enemies.js.
export const ENEMIES = {
  seeker: {
    name: 'Seeker',
    shape: 'triangle',
    hp: 22,
    speed: 128,
    radius: 15,
    damage: 12,
    score: 50,
    xp: 1,
    color: '#f472b6',
    behavior: 'chase',
  },
  speeder: {
    name: 'Speeder',
    shape: 'dart',
    hp: 14,
    speed: 205,
    radius: 12,
    damage: 10,
    score: 60,
    xp: 1,
    color: '#22d3ee',
    behavior: 'lunge',
  },
  splitter: {
    name: 'Splitter',
    shape: 'hexagon',
    hp: 46,
    speed: 92,
    radius: 20,
    damage: 14,
    score: 90,
    xp: 2,
    color: '#4ade80',
    behavior: 'chase',
    splitsInto: 'mini',
    splitCount: 3,
  },
  mini: {
    name: 'Mini',
    shape: 'triangle',
    hp: 8,
    speed: 175,
    radius: 9,
    damage: 7,
    score: 20,
    xp: 1,
    color: '#86efac',
    behavior: 'chase',
  },
  shooter: {
    name: 'Shooter',
    shape: 'diamond',
    hp: 34,
    speed: 105,
    radius: 16,
    damage: 10,
    score: 120,
    xp: 3,
    color: '#fb923c',
    behavior: 'strafe',
    shotCooldown: 2.4,
    shotSpeed: 260,
    preferredRange: 340,
  },
  tank: {
    name: 'Bulwark',
    shape: 'square',
    hp: 120,
    speed: 62,
    radius: 26,
    damage: 22,
    score: 200,
    xp: 5,
    color: '#a78bfa',
    behavior: 'chase',
  },
};

export const BOSS = {
  name: 'THE WARDEN',
  shape: 'hexagon',
  radius: 52,
  speed: 78,
  damage: 26,
  score: 2000,
  xp: 40,
  color: '#fb7185',
  baseHp: 620,
  hpPerWave: 260,
  burstCooldown: 3.2,
  burstOrbs: 14,
  summonCooldown: 9,
  summonCount: 3,
  chargeCooldown: 7,
  chargeSpeed: 520,
  chargeDuration: 0.7,
};

// How many enemies a wave fields, and how fast they arrive.
export function waveQuota(wave) {
  return 6 + wave * 4;
}

export function waveSpawnInterval(wave) {
  return Math.max(0.45, 1.5 - wave * 0.09);
}

// Enemy types unlocked by wave, with weights for the spawn picker.
export function waveTable(wave) {
  const table = [{ type: 'seeker', weight: 10 }];
  if (wave >= 2) table.push({ type: 'speeder', weight: 5 + wave });
  if (wave >= 3) table.push({ type: 'splitter', weight: 3 + wave });
  if (wave >= 4) table.push({ type: 'shooter', weight: 3 + wave });
  if (wave >= 6) table.push({ type: 'tank', weight: 2 + Math.floor(wave / 2) });
  return table;
}

// Enemy health and speed scale gently so later waves stay dangerous.
export function enemyScaling(wave) {
  return {
    hp: 1 + (wave - 1) * 0.16,
    speed: 1 + Math.min(0.35, (wave - 1) * 0.02),
  };
}
