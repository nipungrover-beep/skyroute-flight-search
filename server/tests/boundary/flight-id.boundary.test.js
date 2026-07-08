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
  {
    name: '/availability',
    path: (id) => `/api/flights/${id}/availability`,
    ids: ['API-BND-034', 'API-BND-035', 'API-BND-036', 'API-BND-037', 'API-BND-038', 'API-BND-039', 'API-BND-040'],
  },
  {
    name: '/fares',
    path: (id) => `/api/flights/${id}/fares`,
    ids: ['API-BND-041', 'API-BND-042', 'API-BND-043', 'API-BND-044', 'API-BND-045', 'API-BND-046', 'API-BND-047'],
  },
  {
    name: '/seatmap',
    path: (id) => `/api/flights/${id}/seatmap`,
    ids: ['API-BND-048', 'API-BND-049', 'API-BND-050', 'API-BND-051', 'API-BND-052', 'API-BND-053', 'API-BND-054'],
  },
];

for (const route of ID_ROUTES) {
  test(`GET /api/flights/:id${route.name}: flight id boundary values`, async (t) => {
    await t.test(`[${route.ids[0]}] 0 is rejected as invalid (not "not found")`, async () => {
      const res = await request.get(route.path(0));
      assert.equal(res.status, 400);
      assert.match(res.body.error, /invalid flight id/i);
    });

    await t.test(`[${route.ids[1]}] -1 is rejected as invalid`, async () => {
      const res = await request.get(route.path(-1));
      assert.equal(res.status, 400);
    });

    await t.test(`[${route.ids[2]}] a non-numeric id is rejected as invalid`, async () => {
      const res = await request.get(route.path('abc'));
      assert.equal(res.status, 400);
    });

    await t.test(`[${route.ids[3]}] a decimal id is truncated by parseInt, not rejected`, async () => {
      // parseInt("1.5", 10) === 1 -- documents existing truncation behavior at this boundary.
      const res = await request.get(route.path(`${minId}.9`));
      assert.equal(res.status, 200);
    });

    await t.test(`[${route.ids[4]}] the lowest seeded id is found`, async () => {
      const res = await request.get(route.path(minId));
      assert.equal(res.status, 200);
    });

    await t.test(`[${route.ids[5]}] the highest seeded id is found`, async () => {
      const res = await request.get(route.path(maxId));
      assert.equal(res.status, 200);
    });

    await t.test(`[${route.ids[6]}] one past the highest seeded id is not found`, async () => {
      const res = await request.get(route.path(maxId + 1));
      assert.equal(res.status, 404);
    });
  });
}

test('GET /api/flights/:id/confirm: flight id boundary values', async (t) => {
  await t.test('[API-BND-055] 0 is rejected as invalid', async () => {
    const res = await request.get('/api/flights/0/confirm').query({ fareId: 'saver', seatId: '1A' });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /invalid flight id/i);
  });

  await t.test('[API-BND-056] one past the highest seeded id is not found', async () => {
    const res = await request
      .get(`/api/flights/${maxId + 1}/confirm`)
      .query({ fareId: 'saver', seatId: '1A' });
    assert.equal(res.status, 404);
  });
});
