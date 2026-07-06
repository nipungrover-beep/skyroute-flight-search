import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import supertest from 'supertest';

process.env.DB_PATH = ':memory:';

const { initSchema, db } = await import('../../src/db.js');
const { seedDatabase } = await import('../../src/seed/seedDatabase.js');
const { createApp } = await import('../../src/app.js');

function isoDate(daysFromToday) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  return d.toISOString().slice(0, 10);
}

function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

// Pick years comfortably in the future (so this never collides with the
// "cannot be in the past" check, however far ahead this suite is ever run).
function nextYearWithLeapness(startYear, wantLeap) {
  let year = startYear;
  while (isLeapYear(year) !== wantLeap) year += 1;
  return year;
}

const FUTURE_BASE_YEAR = new Date().getFullYear() + 5;
const LEAP_YEAR = nextYearWithLeapness(FUTURE_BASE_YEAR, true);
const NON_LEAP_YEAR = nextYearWithLeapness(FUTURE_BASE_YEAR, false);

let request;

before(() => {
  initSchema();
  seedDatabase();
  request = supertest(createApp());
});

after(() => {
  db.close();
});

function search(date) {
  return request.get('/api/flights').query({ from: 'DEL', to: 'BOM', date });
}

test('date boundary: yesterday is rejected, today and tomorrow are accepted', async (t) => {
  await t.test('yesterday (one day before the boundary) is rejected', async () => {
    const res = await search(isoDate(-1));
    assert.equal(res.status, 400);
    assert.match(res.body.error, /cannot be in the past/i);
  });

  await t.test('today (exact boundary) is accepted', async () => {
    const res = await search(isoDate(0));
    assert.equal(res.status, 200);
  });

  await t.test('tomorrow (one day after the boundary) is accepted', async () => {
    const res = await search(isoDate(1));
    assert.equal(res.status, 200);
  });
});

test('date format boundary: missing leading zeros are rejected', async () => {
  const res = await search(`${FUTURE_BASE_YEAR}-7-6`);
  assert.equal(res.status, 400);
  assert.match(res.body.error, /YYYY-MM-DD/);
});

test('calendar-validity boundary: a date matching the format regex but not a real calendar date is rejected', async (t) => {
  await t.test('month 13 does not exist', async () => {
    const res = await search(`${FUTURE_BASE_YEAR}-13-01`);
    assert.equal(res.status, 400);
    assert.match(res.body.error, /not a valid calendar date/i);
  });

  await t.test('day 45 does not exist in any month', async () => {
    const res = await search(`${FUTURE_BASE_YEAR}-01-45`);
    assert.equal(res.status, 400);
    assert.match(res.body.error, /not a valid calendar date/i);
  });

  await t.test('February 30th does not exist', async () => {
    const res = await search(`${FUTURE_BASE_YEAR}-02-30`);
    assert.equal(res.status, 400);
    assert.match(res.body.error, /not a valid calendar date/i);
  });

  await t.test('February 29th on a leap year is accepted', async () => {
    const res = await search(`${LEAP_YEAR}-02-29`);
    assert.equal(res.status, 200);
  });

  await t.test('February 29th on a non-leap year is rejected', async () => {
    const res = await search(`${NON_LEAP_YEAR}-02-29`);
    assert.equal(res.status, 400);
    assert.match(res.body.error, /not a valid calendar date/i);
  });
});
