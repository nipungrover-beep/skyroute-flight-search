import { createApp } from './app.js';
import { initSchema, db } from './db.js';

initSchema();

const airportCount = db.prepare('SELECT COUNT(*) AS n FROM airports').get().n;
if (airportCount === 0) {
  console.log('Database is empty. Run `npm run seed -w server` to load sample data.');
}

const app = createApp();
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Flight search API listening on http://localhost:${PORT}`);
});
