import { initSchema } from '../db.js';
import { seedDatabase } from './seedDatabase.js';

initSchema();
const { airportCount, flightCount } = seedDatabase();
console.log(`Seeded ${airportCount} airports and ${flightCount} flights.`);
