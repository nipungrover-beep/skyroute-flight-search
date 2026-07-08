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

const VALID_DATE = futureDateIso(30);
let request;

before(() => {
  initSchema();
  seedDatabase();
  request = supertest(createApp());
});

after(() => {
  db.close();
});

test('[API-REG-001] GET /api/flights returns matching flights sorted by price for a valid route', async () => {
  const res = await request.get('/api/flights').query({ from: 'DEL', to: 'BOM', date: VALID_DATE });

  assert.equal(res.status, 200);
  assert.equal(res.body.count, res.body.flights.length);
  assert.ok(res.body.flights.length > 0, 'expected at least one flight for DEL -> BOM');

  for (const flight of res.body.flights) {
    assert.equal(flight.from.code, 'DEL');
    assert.equal(flight.to.code, 'BOM');
  }

  const prices = res.body.flights.map((f) => f.price);
  const sortedAscending = [...prices].sort((a, b) => a - b);
  assert.deepEqual(prices, sortedAscending, 'flights should be sorted by price ascending by default');
});

test('GET /api/flights rejects invalid search parameters', async (t) => {
  await t.test('[API-REG-002] same origin and destination', async () => {
    const res = await request.get('/api/flights').query({ from: 'DEL', to: 'DEL', date: VALID_DATE });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /cannot be the same/i);
  });

  await t.test('[API-REG-003] departure date in the past', async () => {
    const res = await request.get('/api/flights').query({ from: 'DEL', to: 'BOM', date: '2000-01-01' });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /past/i);
  });

  await t.test('[API-REG-004] unknown airport code', async () => {
    const res = await request.get('/api/flights').query({ from: 'XXX', to: 'BOM', date: VALID_DATE });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /unknown origin airport/i);
  });
});

test('[API-REG-005] GET /api/flights returns an empty result set for a route with no scheduled flights', async () => {
  const res = await request.get('/api/flights').query({ from: 'GOI', to: 'IXC', date: VALID_DATE });

  assert.equal(res.status, 200);
  assert.equal(res.body.count, 0);
  assert.deepEqual(res.body.flights, []);
});
