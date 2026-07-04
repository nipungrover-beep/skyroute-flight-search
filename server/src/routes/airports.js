import { Router } from 'express';
import { db } from '../db.js';

export const airportsRouter = Router();

airportsRouter.get('/', (req, res) => {
  const q = (req.query.q ?? '').toString().trim().toLowerCase();

  const all = db.prepare('SELECT code, city, name, state FROM airports ORDER BY city').all();

  if (!q) {
    return res.json(all.slice(0, 8));
  }

  const matches = all.filter(
    (a) =>
      a.code.toLowerCase().startsWith(q) ||
      a.city.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q)
  );

  res.json(matches.slice(0, 8));
});
