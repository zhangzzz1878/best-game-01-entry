// Neon Swarm — the level-up upgrade pool.
// Each upgrade names itself, describes its effect in one line, applies itself
// to the player, and caps how many times it can stack.

export const UPGRADES = [
  {
    id: 'damage',
    name: 'Heavy Rounds',
    glyph: '▲',
    desc: '+25% bullet damage',
    max: 5,
    apply: (p) => { p.damageMul *= 1.25; },
  },
  {
    id: 'firerate',
    name: 'Rapid Cycler',
    glyph: '≫',
    desc: '+18% fire rate',
    max: 5,
    apply: (p) => { p.fireRateMul *= 1.18; },
  },
  {
    id: 'multishot',
    name: 'Split Barrel',
    glyph: '✦',
    desc: '+1 projectile per shot',
    max: 3,
    apply: (p) => { p.projectiles += 1; },
  },
  {
    id: 'pierce',
    name: 'Lance Rounds',
    glyph: '→',
    desc: 'Bullets pierce +1 enemy, +20% speed',
    max: 3,
    apply: (p) => { p.pierce += 1; p.bulletSpeedMul *= 1.2; },
  },
  {
    id: 'speed',
    name: 'Ion Thrusters',
    glyph: '»',
    desc: '+12% movement speed',
    max: 4,
    apply: (p) => { p.speedMul *= 1.12; },
  },
  {
    id: 'hull',
    name: 'Hull Plating',
    glyph: '⬢',
    desc: '+25 max HP and heal 25',
    max: 5,
    apply: (p) => { p.maxHp += 25; p.hp = Math.min(p.maxHp, p.hp + 25); },
  },
  {
    id: 'magnet',
    name: 'Tractor Field',
    glyph: '◎',
    desc: '+60% gem pickup radius',
    max: 3,
    apply: (p) => { p.magnetMul *= 1.6; },
  },
  {
    id: 'dash',
    name: 'Blink Core',
    glyph: '⚡',
    desc: '-25% dash cooldown',
    max: 3,
    apply: (p) => { p.dashCooldownMul *= 0.75; },
  },
  {
    id: 'regen',
    name: 'Nanobots',
    glyph: '+',
    desc: 'Regenerate +0.9 HP per second',
    max: 4,
    apply: (p) => { p.regen += 0.9; },
  },
  {
    id: 'crit',
    name: 'Deadeye',
    glyph: '✕',
    desc: '+12% critical chance (double damage)',
    max: 4,
    apply: (p) => { p.critChance += 0.12; },
  },
  {
    id: 'nova',
    name: 'Nova Pulse',
    glyph: '✺',
    desc: 'Periodic shockwave damages nearby enemies',
    max: 3,
    apply: (p) => { p.novaLevel += 1; },
  },
  {
    id: 'orbit',
    name: 'Orbit Blades',
    glyph: '◐',
    desc: '+1 blade orbiting you, shredding on contact',
    max: 3,
    apply: (p) => { p.orbitBlades += 1; },
  },
  {
    id: 'siphon',
    name: 'Data Siphon',
    glyph: '◆',
    desc: '+25% XP from gems',
    max: 3,
    apply: (p) => { p.xpMul *= 1.25; },
  },
  {
    id: 'caliber',
    name: 'Big Caliber',
    glyph: '●',
    desc: '+30% bullet size, +10% damage',
    max: 3,
    apply: (p) => { p.bulletSizeMul *= 1.3; p.damageMul *= 1.1; },
  },
];

// Rolls `count` distinct upgrades the player can still take.
export function rollUpgrades(taken, count = 3) {
  const available = UPGRADES.filter((u) => (taken[u.id] || 0) < u.max);
  const rolled = [];
  const pool = [...available];
  while (rolled.length < count && pool.length > 0) {
    const index = Math.floor(Math.random() * pool.length);
    rolled.push(pool.splice(index, 1)[0]);
  }
  // If everything is maxed, offer a heal instead of an empty choice.
  while (rolled.length < count) {
    rolled.push({
      id: 'repair',
      name: 'Field Repair',
      glyph: '+',
      desc: 'Restore 40 HP now',
      max: 99,
      apply: (p) => { p.hp = Math.min(p.maxHp, p.hp + 40); },
    });
  }
  return rolled;
}
