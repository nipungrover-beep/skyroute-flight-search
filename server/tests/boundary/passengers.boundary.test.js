import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import supertest from 'supertest';

process.env.DB_PATH = ':memory:';

const { initSchema, db } = await import('../../src/db.js');
const { seedDatabase } = await import('../../src/seed/seedDatabase.js');
const { createApp } = await import('../../src/app.js');

function futureDateIso(daysFromNow) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

const VALID_DATE = futureDateIso(15);
let request;
let flightId;

before(async () => {
  initSchema();
  seedDatabase();
  request = supertest(createApp());

  const search = await request.get('/api/flights').query({ from: 'DEL', to: 'BOM', date: VALID_DATE });
  flightId = search.body.flights[0].id;
});

after(() => {
  db.close();
});

// passengers is valid on the inclusive range [1, 9] across every endpoint that accepts it.
const ENDPOINTS = [
  {
    name: 'GET /api/flights',
    ids: ['API-BND-001', 'API-BND-002', 'API-BND-003', 'API-BND-004', 'API-BND-005', 'API-BND-006'],
    request: (passengers) =>
      request.get('/api/flights').query({ from: 'DEL', to: 'BOM', date: VALID_DATE, passengers }),
  },
  {
    name: 'GET /api/flights/:id/availability',
    ids: ['API-BND-007', 'API-BND-008', 'API-BND-009', 'API-BND-010', 'API-BND-011', 'API-BND-012'],
    request: (passengers) => request.get(`/api/flights/${flightId}/availability`).query({ passengers }),
  },
];

for (const endpoint of ENDPOINTS) {
  test(`${endpoint.name}: passengers boundary values`, async (t) => {
    await t.test(`[${endpoint.ids[0]}] 0 (just below minimum) is rejected`, async () => {
      const res = await endpoint.request(0);
      assert.equal(res.status, 400);
      assert.match(res.body.error, /between 1 and 9/);
    });

    await t.test(`[${endpoint.ids[1]}] 1 (minimum) is accepted`, async () => {
      const res = await endpoint.request(1);
      assert.equal(res.status, 200);
    });

    await t.test(`[${endpoint.ids[2]}] 9 (maximum) is accepted`, async () => {
      const res = await endpoint.request(9);
      assert.equal(res.status, 200);
    });

    await t.test(`[${endpoint.ids[3]}] 10 (just above maximum) is rejected`, async () => {
      const res = await endpoint.request(10);
      assert.equal(res.status, 400);
      assert.match(res.body.error, /between 1 and 9/);
    });

    await t.test(`[${endpoint.ids[4]}] -1 (negative) is rejected`, async () => {
      const res = await endpoint.request(-1);
      assert.equal(res.status, 400);
      assert.match(res.body.error, /between 1 and 9/);
    });

    await t.test(`[${endpoint.ids[5]}] non-numeric value defaults to 1 rather than erroring`, async () => {
      const res = await endpoint.request('abc');
      assert.equal(res.status, 200);
    });
  });
}

test('GET /api/flights/:id/confirm: passengers boundary values', async (t) => {
  const fares = await request.get(`/api/flights/${flightId}/fares`).query({ travelClass: 'ECONOMY' });
  const seatmap = await request.get(`/api/flights/${flightId}/seatmap`).query({ travelClass: 'ECONOMY' });
  const availableSeat = seatmap.body.seats.find((s) => s.available);
  const fareId = fares.body.fares[0].id;

  function confirmWith(passengers) {
    return request
      .get(`/api/flights/${flightId}/confirm`)
      .query({ travelClass: 'ECONOMY', fareId, seatId: availableSeat.id, passengers });
  }

  await t.test('[API-BND-013] 0 is rejected', async () => {
    const res = await confirmWith(0);
    assert.equal(res.status, 400);
  });

  await t.test('[API-BND-014] 1 is accepted', async () => {
    const res = await confirmWith(1);
    assert.equal(res.status, 200);
  });

  await t.test('[API-BND-015] 9 is accepted', async () => {
    const res = await confirmWith(9);
    assert.equal(res.status, 200);
    assert.equal(res.body.totalPrice, fares.body.fares[0].price * 9 + availableSeat.fee);
  });

  await t.test('[API-BND-016] 10 is rejected', async () => {
    const res = await confirmWith(10);
    assert.equal(res.status, 400);
  });
});
