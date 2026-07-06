import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import supertest from 'supertest';

process.env.DB_PATH = ':memory:';

const { initSchema, db } = await import('../../src/db.js');
const { seedDatabase } = await import('../../src/seed/seedDatabase.js');
const { createApp } = await import('../../src/app.js');

let request;

before(() => {
  initSchema();
  seedDatabase();
  request = supertest(createApp());
});

after(() => {
  db.close();
});

function search(q) {
  return request.get('/api/airports').query(q === undefined ? {} : { q });
}

test('empty query returns the default airport list, capped at 8', async (t) => {
  await t.test('no q parameter at all', async () => {
    const res = await search();
    assert.equal(res.status, 200);
    assert.equal(res.body.length, 8);
  });

  await t.test('an explicit empty string', async () => {
    const res = await search('');
    assert.equal(res.body.length, 8);
  });

  await t.test('whitespace-only input is trimmed to empty', async () => {
    const res = await search('   ');
    assert.equal(res.body.length, 8);
  });
});

test('single-character wildcard matches both an airport code prefix and a city substring', async () => {
  const res = await search('d');
  const codes = res.body.map((a) => a.code);
  assert.ok(codes.includes('DEL'), 'expected DEL to match via code prefix "d"');
});

test('airport code matching is prefix-only, not substring', async () => {
  // "BOM" contains "om" but does not start with it -- must not match on code.
  // "om" is also not a substring of any seeded city/name, so this must be empty.
  const res = await search('om');
  assert.deepEqual(res.body, []);
});

test('city and name matching is substring-anywhere, not prefix-only', async () => {
  // "elhi" is a substring of "Delhi" but not a prefix of the "DEL" code.
  const res = await search('elhi');
  assert.equal(res.body.length, 1);
  assert.equal(res.body[0].code, 'DEL');
});

test('matching is case-insensitive', async () => {
  const lower = await search('mumbai');
  const upper = await search('MUMBAI');
  const mixed = await search('MuMbAi');
  assert.deepEqual(lower.body, upper.body);
  assert.deepEqual(lower.body, mixed.body);
  assert.equal(lower.body[0]?.code, 'BOM');
});

test('an exact full match returns exactly that airport', async () => {
  const res = await search('BLR');
  assert.equal(res.body.length, 1);
  assert.equal(res.body[0].code, 'BLR');
});

test('a query with no matches anywhere returns an empty array, not an error', async () => {
  const res = await search('xyzzy');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, []);
});

test('a query longer than any seeded field returns an empty array without crashing', async () => {
  const res = await search('a'.repeat(500));
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, []);
});

test('special characters in the query are treated as literal text, not a pattern, and cannot crash the endpoint', async () => {
  const res = await search("'; DROP TABLE airports; --");
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, []);

  // prove the table really does still exist and is intact after that query
  const followUp = await search('DEL');
  assert.equal(followUp.body.length, 1);
});

test('results are capped at 8 even when a broad query matches more', async () => {
  // A single common vowel matches enough seeded cities/names to exceed the cap.
  const res = await search('a');
  assert.ok(res.body.length <= 8);
});
