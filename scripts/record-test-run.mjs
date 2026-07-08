// Runs every test suite once, records a snapshot of the result, and regenerates
// the local test-history-dashboard.html from the last 5 recorded runs.
//
// Usage: npm run test:history

import { execSync, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const serverDir = path.join(repoRoot, 'server');
const e2eDir = path.join(repoRoot, 'e2e');
const historyPath = path.join(repoRoot, 'test-history.json');
const dashboardPath = path.join(repoRoot, 'test-history-dashboard.html');

const MAX_RUNS = 5;

const SUITES = [
  { key: 'api-regression', label: 'API Regression' },
  { key: 'etl', label: 'ETL' },
  { key: 'boundary-wildcard', label: 'Boundary & Wildcard' },
  { key: 'smoke', label: 'Smoke' },
  { key: 'browser-regression', label: 'Browser Regression' },
];

function parseNodeTestSummary(stdout) {
  const num = (name) => {
    const match = stdout.match(new RegExp(`ℹ ${name} (\\d+(?:\\.\\d+)?)`));
    return match ? Number(match[1]) : 0;
  };
  return {
    total: num('tests'),
    pass: num('pass'),
    fail: num('fail'),
    durationMs: Math.round(num('duration_ms')),
  };
}

function runBackendSuite(testGlob) {
  const started = Date.now();
  let stdout = '';
  try {
    stdout = execFileSync(
      process.execPath,
      ['--test', '--test-reporter=spec', '--test-reporter-destination=stdout', testGlob],
      { cwd: serverDir, encoding: 'utf-8', env: process.env }
    );
  } catch (err) {
    // node --test exits non-zero when any test fails; the summary is still on stdout.
    stdout = err.stdout?.toString() ?? '';
  }
  const summary = parseNodeTestSummary(stdout);
  if (!summary.durationMs) summary.durationMs = Date.now() - started;
  return summary;
}

function runPlaywrightProject(projectName) {
  const outFile = path.join(e2eDir, `.history-run-${projectName}.json`);
  const started = Date.now();
  try {
    execFileSync('npx', ['playwright', 'test', `--project=${projectName}`, '--reporter=json'], {
      cwd: e2eDir,
      encoding: 'utf-8',
      env: { ...process.env, PLAYWRIGHT_JSON_OUTPUT_NAME: outFile },
      shell: true,
    });
  } catch {
    // non-zero exit just means some tests failed; the report file is still written.
  }
  let stats = { expected: 0, unexpected: 0 };
  try {
    const report = JSON.parse(fs.readFileSync(outFile, 'utf-8'));
    stats = report.stats;
  } finally {
    fs.rmSync(outFile, { force: true });
  }
  const pass = stats.expected ?? 0;
  const fail = stats.unexpected ?? 0;
  return { total: pass + fail, pass, fail, durationMs: Date.now() - started };
}

function gitInfo() {
  try {
    const commit = execSync('git rev-parse --short HEAD', { cwd: repoRoot, encoding: 'utf-8' }).trim();
    const message = execSync('git log -1 --pretty=%s', { cwd: repoRoot, encoding: 'utf-8' }).trim();
    return { commit, message };
  } catch {
    return { commit: null, message: null };
  }
}

console.log('Recording a test run — this executes every suite once, sequentially.\n');

console.log('→ API Regression (server/tests/regression)');
const apiRegression = runBackendSuite('tests/regression/*.test.js');

console.log('→ ETL (server/tests/etl)');
const etl = runBackendSuite('tests/etl/*.test.js');

console.log('→ Boundary & Wildcard (server/tests/boundary)');
const boundaryWildcard = runBackendSuite('tests/boundary/*.test.js');

console.log('→ Smoke (e2e, Playwright)');
const smoke = runPlaywrightProject('smoke');

console.log('→ Browser Regression (e2e, Playwright)');
const browserRegression = runPlaywrightProject('regression');

const suiteResults = {
  'api-regression': apiRegression,
  etl,
  'boundary-wildcard': boundaryWildcard,
  smoke,
  'browser-regression': browserRegression,
};

const overall = Object.values(suiteResults).reduce(
  (acc, s) => ({ total: acc.total + s.total, pass: acc.pass + s.pass, fail: acc.fail + s.fail }),
  { total: 0, pass: 0, fail: 0 }
);

const { commit, message } = gitInfo();

const run = {
  timestamp: new Date().toISOString(),
  commit,
  commitMessage: message,
  suites: suiteResults,
  overall,
};

let history = { runs: [] };
if (fs.existsSync(historyPath)) {
  try {
    history = JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
  } catch {
    history = { runs: [] };
  }
}
history.runs.push(run);
if (history.runs.length > MAX_RUNS) {
  history.runs = history.runs.slice(-MAX_RUNS);
}

fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));

console.log(`\nRecorded run: ${overall.pass}/${overall.total} passing.`);
console.log(`History now has ${history.runs.length} of ${MAX_RUNS} run(s).`);

renderDashboard(history, dashboardPath, SUITES);
console.log(`Dashboard written to ${dashboardPath}`);

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function formatWhen(iso) {
  const d = new Date(iso);
  return d.toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
}

function renderDashboard(historyData, outPath, suiteDefs) {
  // Newest run first (leftmost column) — that's the state a user checks first.
  const runs = [...historyData.runs].reverse();
  const placeholders = Math.max(0, MAX_RUNS - runs.length);

  const headerCells = runs
    .map(
      (r, i) => `
        <th class="run-col">
          <div class="run-label">${i === 0 ? 'Latest' : `${i} run${i > 1 ? 's' : ''} ago`}</div>
          <div class="run-commit mono">${r.commit ? esc(r.commit) : 'uncommitted'}</div>
          <div class="run-when mono">${esc(formatWhen(r.timestamp))}</div>
        </th>`
    )
    .join('');
  const placeholderHeaderCells = Array.from({ length: placeholders })
    .map(() => `<th class="run-col empty-col"><div class="run-label">—</div></th>`)
    .join('');

  const bodyRows = suiteDefs
    .map((suite) => {
      const cells = runs
        .map((r) => {
          const s = r.suites[suite.key];
          if (!s) return `<td class="cell empty-cell">—</td>`;
          const status = s.fail > 0 ? 'fail' : 'pass';
          const icon = status === 'pass' ? '✓' : '✗';
          const title = `${suite.label} — ${formatWhen(r.timestamp)}${r.commit ? ` — ${r.commit}` : ''}${
            r.commitMessage ? `: ${r.commitMessage}` : ''
          } — ${s.pass}/${s.total} passing, ${(s.durationMs / 1000).toFixed(1)}s`;
          return `<td class="cell ${status}" title="${esc(title)}"><span class="cell-icon">${icon}</span><span class="cell-count mono">${s.pass}/${s.total}</span></td>`;
        })
        .join('');
      const placeholderCells = Array.from({ length: placeholders })
        .map(() => `<td class="cell empty-cell">—</td>`)
        .join('');
      return `
        <tr>
          <th class="suite-name">${esc(suite.label)}</th>
          ${cells}
          ${placeholderCells}
        </tr>`;
    })
    .join('');

  const latest = runs[0];
  const summaryHtml = latest
    ? `<span class="mono">${latest.overall.pass}</span> / <span class="mono">${latest.overall.total}</span> passing in the latest run`
    : 'No runs recorded yet';

  const html = `<title>SkyRoute — Test History</title>
<style>
  :root {
    --bg: #f5f7fb; --surface: #ffffff; --border: #dde3ee;
    --ink: #1a1f2b; --ink-muted: #5a6273;
    --primary: #0a5ad6; --primary-dark: #073f99;
    --pass: #1f7a3f; --pass-bg: #e3f5e9;
    --fail: #c62828; --fail-bg: #fbe6e6;
    --empty: #b8bfcc;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--ink); font-family: "Segoe UI", ui-sans-serif, system-ui, -apple-system, sans-serif; padding: 40px 32px 64px; }
  .mono { font-family: ui-monospace, Consolas, monospace; font-variant-numeric: tabular-nums; }
  header { max-width: 1100px; margin: 0 auto 24px; }
  h1 { margin: 0 0 6px; font-size: 1.6rem; }
  .subtitle { color: var(--ink-muted); font-size: 0.95rem; }
  .summary-bar { max-width: 1100px; margin: 0 auto 20px; background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 14px 18px; font-size: 0.95rem; }
  .table-wrap { max-width: 1100px; margin: 0 auto; overflow-x: auto; background: var(--surface); border: 1px solid var(--border); border-radius: 10px; box-shadow: 0 1px 3px rgba(20,30,60,0.06); }
  table { border-collapse: collapse; width: 100%; min-width: 720px; }
  th, td { padding: 12px 16px; text-align: center; border-bottom: 1px solid var(--border); }
  th.suite-name { text-align: left; font-weight: 600; white-space: nowrap; background: var(--surface); position: sticky; left: 0; }
  thead th.run-col { background: #f0f3f9; vertical-align: top; }
  .run-label { font-weight: 700; font-size: 0.85rem; }
  .run-commit { color: var(--primary-dark); font-size: 0.78rem; margin-top: 2px; }
  .run-when { color: var(--ink-muted); font-size: 0.72rem; margin-top: 2px; }
  tr:last-child td, tr:last-child th { border-bottom: none; }
  .cell { cursor: default; }
  .cell-icon { display: block; font-size: 1.1rem; font-weight: 700; }
  .cell-count { display: block; font-size: 0.75rem; color: var(--ink-muted); margin-top: 2px; }
  .cell.pass { background: var(--pass-bg); }
  .cell.pass .cell-icon { color: var(--pass); }
  .cell.fail { background: var(--fail-bg); }
  .cell.fail .cell-icon { color: var(--fail); }
  .empty-cell, .empty-col { color: var(--empty); }
  footer { max-width: 1100px; margin: 24px auto 0; font-size: 0.8rem; color: var(--ink-muted); }
  footer code { background: var(--surface); border: 1px solid var(--border); padding: 1px 6px; border-radius: 5px; }
</style>
<header>
  <h1>SkyRoute — test history</h1>
  <p class="subtitle">Last ${MAX_RUNS} recorded runs, newest first. Regenerated by <code class="mono">npm run test:history</code>.</p>
</header>
<div class="summary-bar">${summaryHtml}</div>
<div class="table-wrap">
  <table>
    <thead>
      <tr>
        <th class="suite-name">Suite</th>
        ${headerCells}
        ${placeholderHeaderCells}
      </tr>
    </thead>
    <tbody>
      ${bodyRows}
    </tbody>
  </table>
</div>
<footer>Hover a cell for the exact pass count, duration, commit, and timestamp. Run <code>npm run test:history</code> again to add the next run — the oldest is dropped once there are more than ${MAX_RUNS}.</footer>
`;

  fs.writeFileSync(outPath, html);
}
