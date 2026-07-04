import { db } from '../db.js';
import { airports } from './airports.js';
import { flights } from './flights.js';

export function seedDatabase() {
  const insertAirport = db.prepare(
    `INSERT OR REPLACE INTO airports (code, city, name, state) VALUES (@code, @city, @name, @state)`
  );
  const insertFlight = db.prepare(`
    INSERT INTO flights
      (flight_number, airline, from_code, to_code, depart_time, arrive_time, duration_minutes, stops, price_economy, price_business, seats_economy, seats_business)
    VALUES
      (@flightNumber, @airline, @from, @to, @departTime, @arriveTime, @durationMinutes, @stops, @priceEconomy, @priceBusiness, @seatsEconomy, @seatsBusiness)
  `);

  db.exec('BEGIN');
  try {
    db.exec('DELETE FROM flights');
    db.exec('DELETE FROM airports');
    for (const airport of airports) insertAirport.run(airport);
    for (const flight of flights) insertFlight.run(flight);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  return { airportCount: airports.length, flightCount: flights.length };
}
