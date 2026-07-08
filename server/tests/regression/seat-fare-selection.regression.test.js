import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import supertest from 'supertest';

process.env.DB_PATH = ':memory:';

const { initSchema, db } = await import('../../src/db.js');
const { seedDatabase } = await import('../../src/seed/seedDatabase.js');
const { createApp } = await import('../../src/app.js');

let request;
let flightId;

before(() => {
  initSchema();
  seedDatabase();
  request = supertest(createApp());
});

after(() => {
  db.close();
});

test('[API-REG-010] GET /api/flights/:id/fares returns three ascending fare tiers derived from the base price', async () => {
  const search = await request.get('/api/flights').query({ from: 'DEL', to: 'BOM', date: '2027-01-01' });
  flightId = search.body.flights[0].id;
  const basePrice = search.body.flights[0].price;

  const res = await request.get(`/api/flights/${flightId}/fares`).query({ travelClass: 'ECONOMY' });

  assert.equal(res.status, 200);
  assert.equal(res.body.basePrice, basePrice);
  assert.deepEqual(
    res.body.fares.map((f) => f.id),
    ['saver', 'flexi', 'flexi-plus']
  );
  const prices = res.body.fares.map((f) => f.price);
  assert.deepEqual(prices, [...prices].sort((a, b) => a - b));
  assert.equal(res.body.fares[0].price, basePrice);
  assert.ok(res.body.fares[2].freeCancellation);
});

test('[API-REG-011] GET /api/flights/:id/fares returns 404 for an unknown flight', async () => {
  const res = await request.get('/api/flights/999999/fares');
  assert.equal(res.status, 404);
});

test('[API-REG-012] GET /api/flights/:id/seatmap generates a seat for every unit of capacity, and is deterministic', async () => {
  const availability = await request.get(`/api/flights/${flightId}/availability`).query({ travelClass: 'ECONOMY' });
  const capacity = availability.body.seatsAvailable;

  const first = await request.get(`/api/flights/${flightId}/seatmap`).query({ travelClass: 'ECONOMY' });
  const second = await request.get(`/api/flights/${flightId}/seatmap`).query({ travelClass: 'ECONOMY' });

  assert.equal(first.status, 200);
  assert.equal(first.body.seats.length, capacity);
  assert.deepEqual(first.body.columns, ['A', 'B', 'C', 'D', 'E', 'F']);
  assert.deepEqual(first.body.seats, second.body.seats, 'seat map must be deterministic across requests');
  assert.ok(first.body.seats.some((s) => !s.available), 'expected at least one pre-occupied seat');
  assert.ok(
    first.body.seats.filter((s) => s.row <= 2).every((s) => s.type === 'extra-legroom' && s.fee > 0),
    'first two rows should be fee-bearing extra-legroom seats'
  );
});

test('[API-REG-013] GET /api/flights/:id/seatmap uses a 2-2 business layout', async () => {
  const res = await request.get(`/api/flights/${flightId}/seatmap`).query({ travelClass: 'BUSINESS' });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.columns, ['A', 'C', 'D', 'F']);
});

test('[API-REG-014] GET /api/flights/:id/confirm computes the correct total for fare x passengers + seat fee', async () => {
  const fares = await request.get(`/api/flights/${flightId}/fares`).query({ travelClass: 'ECONOMY' });
  const flexi = fares.body.fares.find((f) => f.id === 'flexi');
  const seatmap = await request.get(`/api/flights/${flightId}/seatmap`).query({ travelClass: 'ECONOMY' });
  const availableExtraLegroom = seatmap.body.seats.find((s) => s.available && s.type === 'extra-legroom');

  const res = await request.get(`/api/flights/${flightId}/confirm`).query({
    travelClass: 'ECONOMY',
    fareId: 'flexi',
    seatId: availableExtraLegroom.id,
    passengers: 2,
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.totalPrice, flexi.price * 2 + availableExtraLegroom.fee);
  assert.equal(res.body.seat.id, availableExtraLegroom.id);
  assert.match(res.body.selectionId, new RegExp(`^SEL-${flightId}-flexi-${availableExtraLegroom.id}-2$`));
});

test('[API-REG-015] GET /api/flights/:id/confirm rejects an already-taken seat', async () => {
  const seatmap = await request.get(`/api/flights/${flightId}/seatmap`).query({ travelClass: 'ECONOMY' });
  const takenSeat = seatmap.body.seats.find((s) => !s.available);
  assert.ok(takenSeat, 'expected at least one taken seat in the fixture');

  const res = await request
    .get(`/api/flights/${flightId}/confirm`)
    .query({ travelClass: 'ECONOMY', fareId: 'saver', seatId: takenSeat.id, passengers: 1 });

  assert.equal(res.status, 400);
  assert.match(res.body.error, /already taken/i);
});

test('[API-REG-016] GET /api/flights/:id/confirm rejects an unknown fare or seat id', async () => {
  const badFare = await request
    .get(`/api/flights/${flightId}/confirm`)
    .query({ travelClass: 'ECONOMY', fareId: 'bogus', seatId: '3A', passengers: 1 });
  assert.equal(badFare.status, 400);
  assert.match(badFare.body.error, /unknown fare id/i);

  const badSeat = await request
    .get(`/api/flights/${flightId}/confirm`)
    .query({ travelClass: 'ECONOMY', fareId: 'saver', seatId: '99Z', passengers: 1 });
  assert.equal(badSeat.status, 400);
  assert.match(badSeat.body.error, /unknown seat id/i);
});

test('[API-REG-017] GET /api/flights/:id/confirm requires both fareId and seatId', async () => {
  const res = await request.get(`/api/flights/${flightId}/confirm`).query({ travelClass: 'ECONOMY' });
  assert.equal(res.status, 400);
  assert.match(res.body.error, /fareId and seatId/i);
});
