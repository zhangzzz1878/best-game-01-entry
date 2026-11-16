// Neon Swarm — make.fun entrypoint (Node 22, standard library only).
//
// The grader runs this file twice in a fresh container with no network: a
// read-only copy of the repository and a writable /output. It must hand in
// the game by copying game/ and screenshots/ to /output and writing
// /output/dossier.json with the kit's buildDossier library, and both runs
// must produce byte-identical output.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The caps the bounty scores against (its gate.json): the dossier text cap,
// the screenshot count and size caps, and the game tree caps.
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function main(): void {
  const repoRoot = dirname(fileURLToPath(import.meta.url));
  const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

  const gameSource = join(repoRoot, 'game');
  const shotsSource = join(repoRoot, 'screenshots');
  if (!existsSync(gameSource)) throw new Error('game/: missing from the repository');
  if (!existsSync(shotsSource)) throw new Error('screenshots/: missing from the repository');

  // Start from a clean output so a stale file can never leak into the entry.
  mkdirSync(outputDir, { recursive: true });
  for (const name of ['game', 'screenshots', 'dossier.json']) {
    rmSync(join(outputDir, name), { recursive: true, force: true });
  }

  cpSync(gameSource, join(outputDir, 'game'), { recursive: true });
  cpSync(shotsSource, join(outputDir, 'screenshots'), { recursive: true });

  const dossier = buildDossier(outputDir, DOSSIER_CAPS);
  writeFileSync(join(outputDir, 'dossier.json'), dossier);

  console.log(`Neon Swarm handed in: game/ + screenshots/ + dossier.json (${dossier.length} bytes) -> ${outputDir}`);
}

main();
