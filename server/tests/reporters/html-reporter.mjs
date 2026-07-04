function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function formatError(error) {
  if (!error) return '';
  return String(error.message ?? error);
}

function renderHtml({ results, passCount, failCount, generatedAt }) {
  const total = passCount + failCount;
  const rows = results
    .map(
      (r) => `
    <tr class="${r.pass ? 'pass' : 'fail'}">
      <td class="name">${'&nbsp;&nbsp;'.repeat(r.nesting)}${r.pass ? '✔' : '✘'} ${escapeHtml(r.name)}</td>
      <td>${escapeHtml(r.file)}</td>
      <td>${r.duration != null ? `${r.duration.toFixed(1)} ms` : ''}</td>
      <td class="error">${r.error ? escapeHtml(r.error) : ''}</td>
    </tr>`
    )
    .join('\n');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>API Test Report</title>
<style>
  :root { color-scheme: light dark; }
  body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 32px; background: #f5f7fb; color: #1a1f2b; }
  @media (prefers-color-scheme: dark) { body { background: #0f1420; color: #e6e9f0; } }
  h1 { margin: 0 0 4px; }
  .meta { color: #5a6273; margin-bottom: 20px; font-size: 0.9rem; }
  .summary { display: flex; gap: 12px; margin-bottom: 20px; }
  .stat { padding: 10px 18px; border-radius: 10px; font-weight: 600; font-size: 0.9rem; }
  .stat.total { background: #e7ecf7; }
  .stat.pass { background: #e3f5e9; color: #1f7a3f; }
  .stat.fail { background: #fbe6e6; color: #b23434; }
  @media (prefers-color-scheme: dark) {
    .stat.total { background: #232b3d; }
    .stat.pass { background: #163a24; color: #6fd694; }
    .stat.fail { background: #3a1616; color: #f28b8b; }
  }
  table { width: 100%; border-collapse: collapse; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 1px 3px rgba(20,30,60,0.08); }
  @media (prefers-color-scheme: dark) { table { background: #171d2c; } }
  th, td { text-align: left; padding: 10px 14px; border-bottom: 1px solid #dde3ee; font-size: 0.85rem; vertical-align: top; }
  @media (prefers-color-scheme: dark) { th, td { border-bottom-color: #2a3345; } }
  th { background: #0a5ad6; color: white; font-weight: 600; }
  tr.pass td.name { color: #1f7a3f; }
  tr.fail td.name { color: #b23434; font-weight: 600; }
  @media (prefers-color-scheme: dark) {
    tr.pass td.name { color: #6fd694; }
    tr.fail td.name { color: #f28b8b; }
  }
  td.error { color: #b23434; font-family: ui-monospace, Consolas, monospace; font-size: 0.78rem; white-space: pre-wrap; }
</style>
</head>
<body>
  <h1>API Test Report</h1>
  <div class="meta">Generated ${generatedAt}</div>
  <div class="summary">
    <div class="stat total">${total} total</div>
    <div class="stat pass">${passCount} passed</div>
    <div class="stat fail">${failCount} failed</div>
  </div>
  <table>
    <thead><tr><th>Test</th><th>File</th><th>Duration</th><th>Error</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>
`;
}

export default async function* htmlReporter(source) {
  const results = [];
  let passCount = 0;
  let failCount = 0;

  for await (const event of source) {
    if (event.type === 'test:pass' || event.type === 'test:fail') {
      const { name, file, nesting, details } = event.data;
      const pass = event.type === 'test:pass';
      results.push({
        name,
        file: file ? file.split(/[\\/]/).pop() : '',
        nesting,
        pass,
        duration: details?.duration_ms ?? null,
        error: pass ? null : formatError(details?.error),
      });
      if (pass) passCount += 1;
      else failCount += 1;
    }
  }

  yield renderHtml({ results, passCount, failCount, generatedAt: new Date().toISOString() });
}
