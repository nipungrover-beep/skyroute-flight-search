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

test('GET /api/flights/:id/availability confirms a flight can accommodate the requested party size', async () => {
  const search = await request.get('/api/flights').query({ from: 'DEL', to: 'BOM', date: VALID_DATE });
  const [flight] = search.body.flights;

  const res = await request
    .get(`/api/flights/${flight.id}/availability`)
    .query({ passengers: 2, travelClass: 'ECONOMY' });

  assert.equal(res.status, 200);
  assert.equal(res.body.flightId, flight.id);
  assert.equal(res.body.flightNumber, flight.flightNumber);
  assert.equal(res.body.requestedPassengers, 2);
  assert.equal(res.body.available, true);
  assert.ok(res.body.seatsAvailable >= 2);
});

test('GET /api/flights/:id/availability reports unavailability when seats are insufficient', async () => {
  // Seed data: SG 145 (BOM -> DEL) has only 4 business-class seats.
  const search = await request
    .get('/api/flights')
    .query({ from: 'BOM', to: 'DEL', date: VALID_DATE, travelClass: 'BUSINESS' });
  const flight = search.body.flights.find((f) => f.flightNumber === 'SG 145');
  assert.ok(flight, 'expected seed flight SG 145 to exist on BOM -> DEL');
  assert.equal(flight.seatsAvailable, 4);

  const res = await request
    .get(`/api/flights/${flight.id}/availability`)
    .query({ passengers: 6, travelClass: 'BUSINESS' });

  assert.equal(res.status, 200);
  assert.equal(res.body.available, false);
  assert.equal(res.body.seatsAvailable, 4);
});

test('GET /api/flights/:id/availability returns 404 for an unknown flight id', async () => {
  const res = await request.get('/api/flights/999999/availability').query({ passengers: 1 });

  assert.equal(res.status, 404);
  assert.match(res.body.error, /not found/i);
});

test('GET /api/flights excludes flights without enough seats for the requested passenger count', async () => {
  const unfiltered = await request
    .get('/api/flights')
    .query({ from: 'DEL', to: 'BOM', date: VALID_DATE, travelClass: 'BUSINESS' });
  const highDemand = await request
    .get('/api/flights')
    .query({ from: 'DEL', to: 'BOM', date: VALID_DATE, travelClass: 'BUSINESS', passengers: 9 });

  assert.ok(
    highDemand.body.count < unfiltered.body.count,
    'requesting more seats than some flights can offer should narrow the result set'
  );
  for (const flight of highDemand.body.flights) {
    assert.ok(flight.seatsAvailable >= 9);
  }
});
