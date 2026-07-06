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

const VALID_DATE = futureDateIso(10);
let request;

before(() => {
  initSchema();
  seedDatabase();
  request = supertest(createApp());
});

after(() => {
  db.close();
});

// DEL -> BLR economy prices (seed data): UK 811 = 4999, 6E 5301 = 5399, QP 1402 = 5899.
function searchDelBlr(extra = {}) {
  return request.get('/api/flights').query({ from: 'DEL', to: 'BLR', date: VALID_DATE, ...extra });
}

test('maxPrice boundary: excludes a flight exactly 1 rupee above the threshold, includes one exactly at it', async (t) => {
  await t.test('maxPrice one below the cheapest flight excludes everything', async () => {
    const res = await searchDelBlr({ maxPrice: 4998 });
    assert.equal(res.body.count, 0);
  });

  await t.test('maxPrice exactly equal to the cheapest flight includes just that one', async () => {
    const res = await searchDelBlr({ maxPrice: 4999 });
    assert.equal(res.body.count, 1);
    assert.equal(res.body.flights[0].price, 4999);
  });

  await t.test('maxPrice exactly equal to the most expensive flight includes all three', async () => {
    const res = await searchDelBlr({ maxPrice: 5899 });
    assert.equal(res.body.count, 3);
  });
});

test('minPrice boundary: mirrors maxPrice at the opposite edge', async (t) => {
  await t.test('minPrice one above the most expensive flight excludes everything', async () => {
    const res = await searchDelBlr({ minPrice: 5900 });
    assert.equal(res.body.count, 0);
  });

  await t.test('minPrice exactly equal to the most expensive flight includes just that one', async () => {
    const res = await searchDelBlr({ minPrice: 5899 });
    assert.equal(res.body.count, 1);
    assert.equal(res.body.flights[0].price, 5899);
  });

  await t.test('minPrice of 0 excludes nothing', async () => {
    const res = await searchDelBlr({ minPrice: 0 });
    assert.equal(res.body.count, 3);
  });
});

test('minPrice === maxPrice (a single exact price point) returns only an exact match', async () => {
  const res = await searchDelBlr({ minPrice: 5399, maxPrice: 5399 });
  assert.equal(res.body.count, 1);
  assert.equal(res.body.flights[0].price, 5399);
});

test('an inverted range (minPrice > maxPrice) returns an empty result set rather than an error', async () => {
  const res = await searchDelBlr({ minPrice: 5899, maxPrice: 4999 });
  assert.equal(res.status, 200);
  assert.equal(res.body.count, 0);
});
