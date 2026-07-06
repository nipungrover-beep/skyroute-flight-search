import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.DB_PATH = ':memory:';

const { initSchema, db } = await import('../../src/db.js');
const { seedDatabase } = await import('../../src/seed/seedDatabase.js');
const { airports } = await import('../../src/seed/airports.js');
const { flights, addMinutes } = await import('../../src/seed/flights.js');

const TIME_RE = /^\d{2}:\d{2}$/;
const AIRPORT_CODE_RE = /^[A-Z]{3}$/;

before(() => {
  initSchema();
});

after(() => {
  db.close();
});

test('extract: source airport records are well-formed and unique', () => {
  assert.equal(airports.length, 12);
  const codes = airports.map((a) => a.code);
  assert.equal(new Set(codes).size, codes.length, 'airport codes must be unique');
  for (const airport of airports) {
    assert.match(airport.code, AIRPORT_CODE_RE);
    assert.ok(airport.city && airport.name && airport.state);
  }
});

test('extract: source flight records total the expected count', () => {
  assert.equal(flights.length, 55);
});

test('transform: addMinutes computes clock arithmetic correctly, including day wraparound', () => {
  assert.equal(addMinutes('06:00', 130), '08:10');
  assert.equal(addMinutes('21:15', 165), '00:00'); // exact midnight rollover
  assert.equal(addMinutes('23:50', 20), '00:10'); // past-midnight rollover
  assert.equal(addMinutes('00:00', 0), '00:00');
});

test('transform: every flight\'s arriveTime matches its own departTime + duration', () => {
  for (const flight of flights) {
    const expected = addMinutes(flight.departTime, flight.durationMinutes);
    assert.equal(
      flight.arriveTime,
      expected,
      `${flight.flightNumber}: expected arriveTime ${expected}, got ${flight.arriveTime}`
    );
  }
});

test('transform: flight records pass basic data-quality checks', () => {
  for (const flight of flights) {
    assert.match(flight.departTime, TIME_RE, `${flight.flightNumber} departTime`);
    assert.match(flight.arriveTime, TIME_RE, `${flight.flightNumber} arriveTime`);
    assert.ok(flight.durationMinutes > 0, `${flight.flightNumber} durationMinutes`);
    assert.ok(flight.stops >= 0, `${flight.flightNumber} stops`);
    assert.ok(flight.priceEconomy > 0 && flight.priceBusiness > 0, `${flight.flightNumber} prices`);
    assert.ok(flight.priceBusiness > flight.priceEconomy, `${flight.flightNumber} business should cost more than economy`);
    assert.ok(flight.seatsEconomy > 0 && flight.seatsBusiness > 0, `${flight.flightNumber} seat counts`);
  }
});

test('load: seedDatabase() loads exactly the source row counts', () => {
  const result = seedDatabase();
  assert.deepEqual(result, { airportCount: 12, flightCount: 55 });

  const airportRows = db.prepare('SELECT COUNT(*) AS n FROM airports').get().n;
  const flightRows = db.prepare('SELECT COUNT(*) AS n FROM flights').get().n;
  assert.equal(airportRows, 12);
  assert.equal(flightRows, 55);
});

test('load: every flight references an airport that actually exists', () => {
  seedDatabase();
  const orphans = db
    .prepare(
      `SELECT flight_number FROM flights
       WHERE from_code NOT IN (SELECT code FROM airports)
          OR to_code NOT IN (SELECT code FROM airports)`
    )
    .all();
  assert.deepEqual(orphans, [], 'no flight should reference an unknown airport code');
});

test('load: re-seeding is idempotent — no duplicate or accumulating rows', () => {
  seedDatabase();
  const first = {
    airports: db.prepare('SELECT COUNT(*) AS n FROM airports').get().n,
    flights: db.prepare('SELECT COUNT(*) AS n FROM flights').get().n,
  };

  seedDatabase();
  seedDatabase();
  const second = {
    airports: db.prepare('SELECT COUNT(*) AS n FROM airports').get().n,
    flights: db.prepare('SELECT COUNT(*) AS n FROM flights').get().n,
  };

  assert.deepEqual(second, first);
});

test('load: the intentionally-unseeded GOI <-> IXC route stays empty', () => {
  seedDatabase();
  const count = db
    .prepare(
      `SELECT COUNT(*) AS n FROM flights
       WHERE (from_code = 'GOI' AND to_code = 'IXC')
          OR (from_code = 'IXC' AND to_code = 'GOI')`
    )
    .get().n;
  assert.equal(count, 0, 'this route is used elsewhere in the suite as the empty-results fixture');
});
