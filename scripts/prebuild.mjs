// Cross-platform prebuild orchestrator: runs the data generators in sequence and
// NEVER fails the build — if a fetch step errors (e.g. no network in CI), the app
// still builds against the last committed static data.

import { spawnSync } from 'node:child_process';

const steps = ['fetch-espn.ts', 'fetch-news.ts'];

for (const script of steps) {
  const r = spawnSync(process.execPath, ['--experimental-strip-types', `scripts/${script}`], {
    stdio: 'inherit',
  });
  if (r.status !== 0) {
    console.warn(`[prebuild] ${script} exited with ${r.status}; continuing with existing data.`);
  }
}
