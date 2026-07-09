import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import supertest from 'supertest';

process.env.DB_PATH = ':memory:';

const { initSchema, db } = await import('../../src/db.js');
const { createApp } = await import('../../src/app.js');

let request;
let seq = 0;

function uniqueUser(overrides = {}) {
  seq += 1;
  return {
    email: `user${seq}@example.com`,
    mobile: `9${String(100000000 + seq).padStart(9, '0')}`,
    username: `user${seq}name`,
    password: 'Str0ng!!Pass',
    confirmPassword: 'Str0ng!!Pass',
    ...overrides,
  };
}

before(() => {
  initSchema();
  request = supertest(createApp());
});

after(() => {
  db.close();
});

test('[API-REG-018] POST /api/auth/signup succeeds with all fields and returns public fields only', async () => {
  const user = uniqueUser();
  const res = await request.post('/api/auth/signup').send(user);

  assert.equal(res.status, 201);
  assert.equal(res.body.email, user.email);
  assert.equal(res.body.mobile, user.mobile);
  assert.equal(res.body.username, user.username);
  assert.ok(Number.isInteger(res.body.userId));
  assert.equal(res.body.password, undefined);
  assert.equal(res.body.passwordHash, undefined);
});

test('[API-REG-019] POST /api/auth/signup succeeds without a username (optional field)', async () => {
  const user = uniqueUser({ username: undefined });
  const res = await request.post('/api/auth/signup').send(user);

  assert.equal(res.status, 201);
  assert.equal(res.body.username, null);
});

test('[API-REG-020] POST /api/auth/signup rejects a duplicate email', async () => {
  const user = uniqueUser();
  await request.post('/api/auth/signup').send(user);

  const dupe = uniqueUser({ email: user.email });
  const res = await request.post('/api/auth/signup').send(dupe);

  assert.equal(res.status, 409);
  assert.match(res.body.error, /already exists/i);
});

test('[API-REG-021] POST /api/auth/signup rejects a duplicate mobile number', async () => {
  const user = uniqueUser();
  await request.post('/api/auth/signup').send(user);

  const dupe = uniqueUser({ mobile: user.mobile });
  const res = await request.post('/api/auth/signup').send(dupe);

  assert.equal(res.status, 409);
  assert.match(res.body.error, /already exists/i);
});

test('[API-REG-022] POST /api/auth/signup rejects a duplicate username', async () => {
  const user = uniqueUser();
  await request.post('/api/auth/signup').send(user);

  const dupe = uniqueUser({ username: user.username });
  const res = await request.post('/api/auth/signup').send(dupe);

  assert.equal(res.status, 409);
  assert.match(res.body.error, /already exists/i);
});

test('[API-REG-023] POST /api/auth/signup rejects mismatched password and confirmPassword', async () => {
  const user = uniqueUser({ confirmPassword: 'Different!!Pass1' });
  const res = await request.post('/api/auth/signup').send(user);

  assert.equal(res.status, 400);
  assert.match(res.body.error, /do not match/i);
});

test('[API-REG-024] POST /api/auth/login succeeds using email as the login ID', async () => {
  const user = uniqueUser();
  await request.post('/api/auth/signup').send(user);

  const res = await request.post('/api/auth/login').send({ loginId: user.email, password: user.password });

  assert.equal(res.status, 200);
  assert.equal(res.body.email, user.email);
});

test('[API-REG-025] POST /api/auth/login succeeds using mobile number as the login ID', async () => {
  const user = uniqueUser();
  await request.post('/api/auth/signup').send(user);

  const res = await request.post('/api/auth/login').send({ loginId: user.mobile, password: user.password });

  assert.equal(res.status, 200);
  assert.equal(res.body.mobile, user.mobile);
});

test('[API-REG-026] POST /api/auth/login succeeds using username as the login ID', async () => {
  const user = uniqueUser();
  await request.post('/api/auth/signup').send(user);

  const res = await request.post('/api/auth/login').send({ loginId: user.username, password: user.password });

  assert.equal(res.status, 200);
  assert.equal(res.body.username, user.username);
});

test('[API-REG-027] POST /api/auth/login rejects an incorrect password', async () => {
  const user = uniqueUser();
  await request.post('/api/auth/signup').send(user);

  const res = await request.post('/api/auth/login').send({ loginId: user.email, password: 'WrongPass!!11' });

  assert.equal(res.status, 401);
  assert.match(res.body.error, /invalid login id or password/i);
});

test('[API-REG-028] POST /api/auth/login rejects an unknown login ID', async () => {
  const res = await request.post('/api/auth/login').send({ loginId: 'nobody@example.com', password: 'Str0ng!!Pass' });

  assert.equal(res.status, 401);
  assert.match(res.body.error, /invalid login id or password/i);
});

test('[API-REG-029] POST /api/auth/forgot-password issues a reset token for a known account', async () => {
  const user = uniqueUser();
  await request.post('/api/auth/signup').send(user);

  const res = await request.post('/api/auth/forgot-password').send({ loginId: user.email });

  assert.equal(res.status, 200);
  assert.ok(res.body.resetToken);
  assert.ok(res.body.expiresAt);
});

test('[API-REG-030] POST /api/auth/forgot-password returns 404 for an unknown account', async () => {
  const res = await request.post('/api/auth/forgot-password').send({ loginId: 'nobody@example.com' });

  assert.equal(res.status, 404);
  assert.match(res.body.error, /no account found/i);
});

test('[API-REG-031] POST /api/auth/reset-password with a valid token updates the password', async () => {
  const user = uniqueUser();
  await request.post('/api/auth/signup').send(user);
  const forgot = await request.post('/api/auth/forgot-password').send({ loginId: user.email });
  const newPassword = 'NewStr0ng!!Pass';

  const res = await request
    .post('/api/auth/reset-password')
    .send({ token: forgot.body.resetToken, newPassword, confirmPassword: newPassword });
  assert.equal(res.status, 200);

  const oldLogin = await request.post('/api/auth/login').send({ loginId: user.email, password: user.password });
  assert.equal(oldLogin.status, 401);

  const newLogin = await request.post('/api/auth/login').send({ loginId: user.email, password: newPassword });
  assert.equal(newLogin.status, 200);
});

test('[API-REG-032] POST /api/auth/reset-password rejects an unknown or invalid token', async () => {
  const res = await request
    .post('/api/auth/reset-password')
    .send({ token: 'not-a-real-token', newPassword: 'NewStr0ng!!Pass', confirmPassword: 'NewStr0ng!!Pass' });

  assert.equal(res.status, 400);
  assert.match(res.body.error, /invalid or already-used/i);
});

test('[API-REG-033] POST /api/auth/reset-password rejects a token that has already been used', async () => {
  const user = uniqueUser();
  await request.post('/api/auth/signup').send(user);
  const forgot = await request.post('/api/auth/forgot-password').send({ loginId: user.email });
  const newPassword = 'NewStr0ng!!Pass';

  await request
    .post('/api/auth/reset-password')
    .send({ token: forgot.body.resetToken, newPassword, confirmPassword: newPassword });

  const reuse = await request
    .post('/api/auth/reset-password')
    .send({ token: forgot.body.resetToken, newPassword: 'AnotherStr0ng!!1', confirmPassword: 'AnotherStr0ng!!1' });

  assert.equal(reuse.status, 400);
  assert.match(reuse.body.error, /invalid or already-used/i);
});
