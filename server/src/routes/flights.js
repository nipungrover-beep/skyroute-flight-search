import { Router } from 'express';
import { db } from '../db.js';

export const flightsRouter = Router();

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function timeToMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function inWindow(departTime, window) {
  const minutes = timeToMinutes(departTime);
  switch (window) {
    case 'early-morning': // 00:00 - 05:59
      return minutes < 360;
    case 'morning': // 06:00 - 11:59
      return minutes >= 360 && minutes < 720;
    case 'afternoon': // 12:00 - 17:59
      return minutes >= 720 && minutes < 1080;
    case 'evening': // 18:00 - 23:59
      return minutes >= 1080;
    default:
      return true;
  }
}

function todayIso() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

flightsRouter.get('/', (req, res) => {
  const { from, to, date } = req.query;
  const passengers = Number.parseInt(req.query.passengers, 10) || 1;
  const travelClass = req.query.travelClass === 'BUSINESS' ? 'BUSINESS' : 'ECONOMY';

  if (!from || !to || !date) {
    return res.status(400).json({ error: 'from, to, and date are required query parameters' });
  }

  if (!DATE_RE.test(date)) {
    return res.status(400).json({ error: 'date must be in YYYY-MM-DD format' });
  }

  if (date < todayIso()) {
    return res.status(400).json({ error: 'Departure date cannot be in the past' });
  }

  if (from === to) {
    return res.status(400).json({ error: 'Origin and destination cannot be the same' });
  }

  if (passengers < 1 || passengers > 9) {
    return res.status(400).json({ error: 'passengers must be between 1 and 9' });
  }

  const airportCodes = new Set(
    db.prepare('SELECT code FROM airports').all().map((a) => a.code)
  );
  if (!airportCodes.has(from)) {
    return res.status(400).json({ error: `Unknown origin airport code: ${from}` });
  }
  if (!airportCodes.has(to)) {
    return res.status(400).json({ error: `Unknown destination airport code: ${to}` });
  }

  const airportsByCode = Object.fromEntries(
    db.prepare('SELECT * FROM airports').all().map((a) => [a.code, a])
  );

  let rows = db
    .prepare('SELECT * FROM flights WHERE from_code = ? AND to_code = ?')
    .all(from, to);

  const stopsFilter = req.query.stops;
  if (stopsFilter === 'nonstop') {
    rows = rows.filter((r) => r.stops === 0);
  } else if (stopsFilter === '1stop') {
    rows = rows.filter((r) => r.stops >= 1);
  }

  const airlinesFilter = (req.query.airlines ?? '')
    .toString()
    .split(',')
    .map((a) => a.trim())
    .filter(Boolean);
  if (airlinesFilter.length > 0) {
    rows = rows.filter((r) => airlinesFilter.includes(r.airline));
  }

  const minPrice = Number.parseInt(req.query.minPrice, 10);
  const maxPrice = Number.parseInt(req.query.maxPrice, 10);
  const priceField = travelClass === 'BUSINESS' ? 'price_business' : 'price_economy';
  if (!Number.isNaN(minPrice)) {
    rows = rows.filter((r) => r[priceField] >= minPrice);
  }
  if (!Number.isNaN(maxPrice)) {
    rows = rows.filter((r) => r[priceField] <= maxPrice);
  }

  const departureWindow = req.query.departure;
  if (departureWindow) {
    rows = rows.filter((r) => inWindow(r.depart_time, departureWindow));
  }

  const seatsField = travelClass === 'BUSINESS' ? 'seats_business' : 'seats_economy';
  rows = rows.filter((r) => r[seatsField] >= passengers);

  const sort = req.query.sort ?? 'price';
  rows.sort((a, b) => {
    if (sort === 'duration') return a.duration_minutes - b.duration_minutes;
    if (sort === 'departure') return timeToMinutes(a.depart_time) - timeToMinutes(b.depart_time);
    return a[priceField] - b[priceField];
  });

  const originAirport = airportsByCode[from];
  const destinationAirport = airportsByCode[to];

  const results = rows.map((r) => ({
    id: r.id,
    flightNumber: r.flight_number,
    airline: r.airline,
    from: { code: originAirport.code, city: originAirport.city },
    to: { code: destinationAirport.code, city: destinationAirport.city },
    date,
    departTime: r.depart_time,
    arriveTime: r.arrive_time,
    durationMinutes: r.duration_minutes,
    stops: r.stops,
    travelClass,
    price: r[priceField],
    seatsAvailable: r[seatsField],
  }));

  res.json({
    query: { from, to, date, passengers, travelClass },
    count: results.length,
    flights: results,
  });
});

flightsRouter.get('/:id/availability', (req, res) => {
  const flightId = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(flightId) || flightId <= 0) {
    return res.status(400).json({ error: 'Invalid flight id' });
  }

  const passengers = Number.parseInt(req.query.passengers, 10) || 1;
  if (passengers < 1 || passengers > 9) {
    return res.status(400).json({ error: 'passengers must be between 1 and 9' });
  }

  const travelClass = req.query.travelClass === 'BUSINESS' ? 'BUSINESS' : 'ECONOMY';
  const seatsField = travelClass === 'BUSINESS' ? 'seats_business' : 'seats_economy';

  const flight = db.prepare('SELECT * FROM flights WHERE id = ?').get(flightId);
  if (!flight) {
    return res.status(404).json({ error: 'Flight not found' });
  }

  const airportsByCode = Object.fromEntries(
    db.prepare('SELECT * FROM airports').all().map((a) => [a.code, a])
  );

  const seatsAvailable = flight[seatsField];

  res.json({
    flightId: flight.id,
    flightNumber: flight.flight_number,
    airline: flight.airline,
    from: { code: flight.from_code, city: airportsByCode[flight.from_code]?.city },
    to: { code: flight.to_code, city: airportsByCode[flight.to_code]?.city },
    travelClass,
    requestedPassengers: passengers,
    seatsAvailable,
    available: seatsAvailable >= passengers,
  });
});
