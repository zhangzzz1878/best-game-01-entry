// Neon Swarm — best-run records kept in localStorage.
// A missing or corrupt store degrades to empty records, never an error.

const KEY = 'neon-swarm-best-v1';

export function loadBest() {
  const empty = { score: 0, wave: 0, kills: 0, victories: 0 };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return empty;
    return {
      score: Number(parsed.score) || 0,
      wave: Number(parsed.wave) || 0,
      kills: Number(parsed.kills) || 0,
      victories: Number(parsed.victories) || 0,
    };
  } catch {
    return empty;
  }
}

// Merges a finished run into the stored best and returns what is new.
export function saveBest(run) {
  const best = loadBest();
  const isNewBest = run.score > best.score;
  const merged = {
    score: Math.max(best.score, run.score),
    wave: Math.max(best.wave, run.wave),
    kills: Math.max(best.kills, run.kills),
    victories: best.victories + (run.victory ? 1 : 0),
  };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(merged));
  } catch {
    // Storage full or unavailable: the run still counts on screen.
  }
  return { best: merged, isNewBest };
}
