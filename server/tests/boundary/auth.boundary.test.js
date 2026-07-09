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
    email: `bnd${seq}@example.com`,
    mobile: `9${String(200000000 + seq).padStart(9, '0')}`,
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

test('signup: password strength boundary', async (t) => {
  await t.test('[API-BND-069] 9 characters (just below the 10-char minimum) is rejected', async () => {
    const password = 'Ab1!@1234'; // 9 chars
    const res = await request.post('/api/auth/signup').send(uniqueUser({ password, confirmPassword: password }));
    assert.equal(res.status, 400);
    assert.match(res.body.error, /at least 10 characters/i);
  });

  await t.test('[API-BND-070] exactly 10 characters meeting every rule is accepted', async () => {
    const password = 'Ab1!@12345'; // 10 chars, letter+digit+2 special
    const res = await request.post('/api/auth/signup').send(uniqueUser({ password, confirmPassword: password }));
    assert.equal(res.status, 201);
  });

  await t.test('[API-BND-071] a password with no letters is rejected', async () => {
    const password = '12345!!6789';
    const res = await request.post('/api/auth/signup').send(uniqueUser({ password, confirmPassword: password }));
    assert.equal(res.status, 400);
    assert.match(res.body.error, /at least one letter/i);
  });

  await t.test('[API-BND-072] a password with no digits is rejected', async () => {
    const password = 'Abcdefgh!!';
    const res = await request.post('/api/auth/signup').send(uniqueUser({ password, confirmPassword: password }));
    assert.equal(res.status, 400);
    assert.match(res.body.error, /at least one number/i);
  });

  await t.test('[API-BND-073] exactly 1 special character (just below the minimum of 2) is rejected', async () => {
    const password = 'Abcdefg1!2';
    const res = await request.post('/api/auth/signup').send(uniqueUser({ password, confirmPassword: password }));
    assert.equal(res.status, 400);
    assert.match(res.body.error, /2 special characters/i);
  });

  await t.test('[API-BND-074] exactly 2 special characters (the minimum) is accepted', async () => {
    const password = 'Abcdefg1!!';
    const res = await request.post('/api/auth/signup').send(uniqueUser({ password, confirmPassword: password }));
    assert.equal(res.status, 201);
  });

  await t.test('[API-BND-075] more than 2 special characters is accepted', async () => {
    const password = 'Ab1!@#$%^&';
    const res = await request.post('/api/auth/signup').send(uniqueUser({ password, confirmPassword: password }));
    assert.equal(res.status, 201);
  });
});

test('signup: email format boundary', async (t) => {
  await t.test('[API-BND-076] missing @ is rejected', async () => {
    const res = await request.post('/api/auth/signup').send(uniqueUser({ email: 'not-an-email.com' }));
    assert.equal(res.status, 400);
    assert.match(res.body.error, /valid email/i);
  });

  await t.test('[API-BND-077] missing a domain dot is rejected', async () => {
    const res = await request.post('/api/auth/signup').send(uniqueUser({ email: 'user@example' }));
    assert.equal(res.status, 400);
    assert.match(res.body.error, /valid email/i);
  });

  await t.test('[API-BND-078] a minimal valid email is accepted', async () => {
    const res = await request.post('/api/auth/signup').send(uniqueUser({ email: `min${seq}@ex.co` }));
    assert.equal(res.status, 201);
  });
});

test('signup: mobile number format boundary', async (t) => {
  await t.test('[API-BND-079] 9 digits (one below the required 10) is rejected', async () => {
    const res = await request.post('/api/auth/signup').send(uniqueUser({ mobile: '912345678' }));
    assert.equal(res.status, 400);
    assert.match(res.body.error, /valid 10-digit mobile/i);
  });

  await t.test('[API-BND-080] 11 digits (one above the required 10) is rejected', async () => {
    const res = await request.post('/api/auth/signup').send(uniqueUser({ mobile: '91234567890' }));
    assert.equal(res.status, 400);
    assert.match(res.body.error, /valid 10-digit mobile/i);
  });

  await t.test('[API-BND-081] a leading digit below 6 is rejected', async () => {
    const res = await request.post('/api/auth/signup').send(uniqueUser({ mobile: '5123456789' }));
    assert.equal(res.status, 400);
    assert.match(res.body.error, /valid 10-digit mobile/i);
  });

  await t.test('[API-BND-082] a leading digit of 6 (lowest valid) is accepted', async () => {
    const res = await request.post('/api/auth/signup').send(uniqueUser({ mobile: '6123456780' }));
    assert.equal(res.status, 201);
  });

  await t.test('[API-BND-083] a leading digit of 9 (highest valid) is accepted', async () => {
    const res = await request.post('/api/auth/signup').send(uniqueUser({ mobile: '9123456781' }));
    assert.equal(res.status, 201);
  });
});

test('signup: username format boundary', async (t) => {
  await t.test('[API-BND-084] 2 characters (one below the 3-char minimum) is rejected', async () => {
    const res = await request.post('/api/auth/signup').send(uniqueUser({ username: 'ab' }));
    assert.equal(res.status, 400);
    assert.match(res.body.error, /3-20 characters/i);
  });

  await t.test('[API-BND-085] exactly 3 characters (the minimum) is accepted', async () => {
    const res = await request.post('/api/auth/signup').send(uniqueUser({ username: 'abc' }));
    assert.equal(res.status, 201);
  });

  await t.test('[API-BND-086] exactly 20 characters (the maximum) is accepted', async () => {
    const username = `a${String(seq).padStart(18, '0')}b`.slice(0, 20).padEnd(20, 'z');
    const res = await request.post('/api/auth/signup').send(uniqueUser({ username }));
    assert.equal(res.status, 201);
  });

  await t.test('[API-BND-087] 21 characters (one above the maximum) is rejected', async () => {
    const username = 'a'.repeat(21);
    const res = await request.post('/api/auth/signup').send(uniqueUser({ username }));
    assert.equal(res.status, 400);
    assert.match(res.body.error, /3-20 characters/i);
  });

  await t.test('[API-BND-088] starting with a digit is rejected', async () => {
    const res = await request.post('/api/auth/signup').send(uniqueUser({ username: `9start${seq}` }));
    assert.equal(res.status, 400);
    assert.match(res.body.error, /3-20 characters/i);
  });

  await t.test('[API-BND-089] a space (disallowed character) is rejected', async () => {
    const res = await request.post('/api/auth/signup').send(uniqueUser({ username: `bad user${seq}` }));
    assert.equal(res.status, 400);
    assert.match(res.body.error, /3-20 characters/i);
  });
});

test('reset-password: token expiry boundary', async (t) => {
  await t.test('[API-BND-090] a token past its expiry is rejected', async () => {
    const user = uniqueUser();
    await request.post('/api/auth/signup').send(user);
    const forgot = await request.post('/api/auth/forgot-password').send({ loginId: user.email });

    const pastExpiry = new Date(Date.now() - 60 * 1000).toISOString();
    db.prepare('UPDATE password_resets SET expires_at = ? WHERE token = ?').run(pastExpiry, forgot.body.resetToken);

    const res = await request.post('/api/auth/reset-password').send({
      token: forgot.body.resetToken,
      newPassword: 'NewStr0ng!!Pass',
      confirmPassword: 'NewStr0ng!!Pass',
    });

    assert.equal(res.status, 400);
    assert.match(res.body.error, /expired/i);
  });

  await t.test('[API-BND-091] a token one second before its expiry is accepted', async () => {
    const user = uniqueUser();
    await request.post('/api/auth/signup').send(user);
    const forgot = await request.post('/api/auth/forgot-password').send({ loginId: user.email });

    const almostExpired = new Date(Date.now() + 1000).toISOString();
    db.prepare('UPDATE password_resets SET expires_at = ? WHERE token = ?').run(almostExpired, forgot.body.resetToken);

    const res = await request.post('/api/auth/reset-password').send({
      token: forgot.body.resetToken,
      newPassword: 'NewStr0ng!!Pass',
      confirmPassword: 'NewStr0ng!!Pass',
    });

    assert.equal(res.status, 200);
  });
});
