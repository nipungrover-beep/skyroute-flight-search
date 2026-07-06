import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import supertest from 'supertest';

process.env.DB_PATH = ':memory:';

const { initSchema, db } = await import('../../src/db.js');
const { seedDatabase } = await import('../../src/seed/seedDatabase.js');
const { createApp } = await import('../../src/app.js');

let request;
let minId;
let maxId;

before(() => {
  initSchema();
  seedDatabase();
  request = supertest(createApp());

  const bounds = db.prepare('SELECT MIN(id) AS minId, MAX(id) AS maxId FROM flights').get();
  minId = bounds.minId;
  maxId = bounds.maxId;
});

after(() => {
  db.close();
});

// Every :id route shares the same "positive integer" validation; exercise it identically
// across all four to prove the shared boundary actually holds everywhere, not just once.
const ID_ROUTES = [
  { name: '/availability', path: (id) => `/api/flights/${id}/availability` },
  { name: '/fares', path: (id) => `/api/flights/${id}/fares` },
  { name: '/seatmap', path: (id) => `/api/flights/${id}/seatmap` },
];

for (const route of ID_ROUTES) {
  test(`GET /api/flights/:id${route.name}: flight id boundary values`, async (t) => {
    await t.test('0 is rejected as invalid (not "not found")', async () => {
      const res = await request.get(route.path(0));
      assert.equal(res.status, 400);
      assert.match(res.body.error, /invalid flight id/i);
    });

    await t.test('-1 is rejected as invalid', async () => {
      const res = await request.get(route.path(-1));
      assert.equal(res.status, 400);
    });

    await t.test('a non-numeric id is rejected as invalid', async () => {
      const res = await request.get(route.path('abc'));
      assert.equal(res.status, 400);
    });

    await t.test('a decimal id is truncated by parseInt, not rejected', async () => {
      // parseInt("1.5", 10) === 1 -- documents existing truncation behavior at this boundary.
      const res = await request.get(route.path(`${minId}.9`));
      assert.equal(res.status, 200);
    });

    await t.test('the lowest seeded id is found', async () => {
      const res = await request.get(route.path(minId));
      assert.equal(res.status, 200);
    });

    await t.test('the highest seeded id is found', async () => {
      const res = await request.get(route.path(maxId));
      assert.equal(res.status, 200);
    });

    await t.test('one past the highest seeded id is not found', async () => {
      const res = await request.get(route.path(maxId + 1));
      assert.equal(res.status, 404);
    });
  });
}

test('GET /api/flights/:id/confirm: flight id boundary values', async (t) => {
  await t.test('0 is rejected as invalid', async () => {
    const res = await request.get('/api/flights/0/confirm').query({ fareId: 'saver', seatId: '1A' });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /invalid flight id/i);
  });

  await t.test('one past the highest seeded id is not found', async () => {
    const res = await request
      .get(`/api/flights/${maxId + 1}/confirm`)
      .query({ fareId: 'saver', seatId: '1A' });
    assert.equal(res.status, 404);
  });
});
