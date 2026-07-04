import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

export default function globalSetup() {
  // Reset the app's database to its known-good seeded state before every run,
  // so regression assertions about specific flights/routes stay deterministic.
  execFileSync('npm', ['run', 'seed'], { cwd: repoRoot, stdio: 'inherit', shell: true });
}
