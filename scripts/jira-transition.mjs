#!/usr/bin/env node
// Transitions a Jira issue to a target status by name (e.g. "Testing").
// Usage: node scripts/jira-transition.mjs --issue SCRUM-1 --status Testing
//
// Requires JIRA_EMAIL and JIRA_API_TOKEN in the environment. Optionally
// JIRA_BASE_URL (defaults to the SkyRoute project's Jira site).
import https from 'node:https';

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = { issue: null, status: 'Testing' };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--issue') parsed.issue = args[++i];
    else if (arg === '--status') parsed.status = args[++i];
  }
  return parsed;
}

function requestJson(method, url, { auth, body } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const payload = body ? JSON.stringify(body) : undefined;
    const req = https.request(
      {
        method,
        hostname: u.hostname,
        path: u.pathname + u.search,
        headers: {
          Authorization: `Basic ${Buffer.from(auth).toString('base64')}`,
          Accept: 'application/json',
          ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let json = null;
          if (data) {
            try {
              json = JSON.parse(data);
            } catch {
              // non-JSON body (e.g. an empty 204 response) -- leave json null
            }
          }
          resolve({ status: res.statusCode, json, raw: data });
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function main() {
  const { issue, status } = parseArgs();
  const email = process.env.JIRA_EMAIL;
  const token = process.env.JIRA_API_TOKEN;
  const baseUrl = process.env.JIRA_BASE_URL ?? 'https://nipungrover.atlassian.net';

  if (!issue) {
    console.error('Missing --issue <KEY>');
    process.exit(1);
  }
  if (!email || !token) {
    console.error('Missing JIRA_EMAIL / JIRA_API_TOKEN environment variables');
    process.exit(1);
  }

  const auth = `${email}:${token}`;

  const current = await requestJson('GET', `${baseUrl}/rest/api/3/issue/${issue}?fields=status`, { auth });
  if (current.status >= 400) {
    console.error(`Failed to look up ${issue}: HTTP ${current.status} ${current.raw.slice(0, 500)}`);
    process.exit(1);
  }
  const currentStatus = current.json.fields.status.name;
  if (currentStatus.toLowerCase() === status.toLowerCase()) {
    console.log(`${issue} is already in "${currentStatus}" -- nothing to do.`);
    return;
  }

  const transitions = await requestJson('GET', `${baseUrl}/rest/api/3/issue/${issue}/transitions`, { auth });
  if (transitions.status >= 400) {
    console.error(`Failed to list transitions for ${issue}: HTTP ${transitions.status} ${transitions.raw.slice(0, 500)}`);
    process.exit(1);
  }

  const match = transitions.json.transitions.find((t) => t.name.toLowerCase() === status.toLowerCase());
  if (!match) {
    const available = transitions.json.transitions.map((t) => t.name).join(', ');
    console.error(`No "${status}" transition available for ${issue} from "${currentStatus}". Available: ${available}`);
    process.exit(1);
  }

  const apply = await requestJson('POST', `${baseUrl}/rest/api/3/issue/${issue}/transitions`, {
    auth,
    body: { transition: { id: match.id } },
  });
  if (apply.status >= 400) {
    console.error(`Failed to transition ${issue}: HTTP ${apply.status} ${apply.raw.slice(0, 500)}`);
    process.exit(1);
  }

  console.log(`${issue}: ${currentStatus} -> ${status} (transition id ${match.id})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
