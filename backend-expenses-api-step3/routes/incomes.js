// routes/incomes.js
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../models/db.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { isYYYYMMDD, filterByDateRange } from '../models/utils.js';
const router = express.Router();
router.get('/', authMiddleware, (req, res) => {
  const { start, end } = req.query;
  let list = db.incomes.filter(i => i.userId === req.userId);
  if (start && !isYYYYMMDD(start)) return res.status(400).json({ error: 'invalid start date' });
  if (end && !isYYYYMMDD(end)) return res.status(400).json({ error: 'invalid end date' });
  if (start || end) list = filterByDateRange(list, start, end, 'date');
  res.json(list);
});
router.post('/', authMiddleware, (req, res) => {
  const { amount, date, source, description } = req.body;
  if (amount === undefined || isNaN(Number(amount))) return res.status(400).json({ error: 'amount is required and must be a number' });
  if (!date || !isYYYYMMDD(date)) return res.status(400).json({ error: 'date (YYYY-MM-DD) is required' });
  const inc = { id: uuidv4(), userId: req.userId, amount: Number(amount), date: String(date), source: String(source || ''), description: String(description || ''), createdAt: new Date().toISOString() };
  db.incomes.push(inc);
  res.status(201).json(inc);
});
router.get('/:id', authMiddleware, (req, res) => {
  const inc = db.incomes.find(i => i.id === req.params.id);
  if (!inc || inc.userId !== req.userId) return res.status(403).json({ error: 'Forbidden' });
  res.json(inc);
});
router.put('/:id', authMiddleware, (req, res) => {
  const inc = db.incomes.find(i => i.id === req.params.id);
  if (!inc || inc.userId !== req.userId) return res.status(403).json({ error: 'Forbidden' });
  const { amount, date, source, description } = req.body;
  if (amount !== undefined && isNaN(Number(amount))) return res.status(400).json({ error: 'amount must be a number' });
  if (date !== undefined && !isYYYYMMDD(date)) return res.status(400).json({ error: 'date must be YYYY-MM-DD' });
  if (amount !== undefined) inc.amount = Number(amount);
  if (date !== undefined) inc.date = String(date);
  if (source !== undefined) inc.source = String(source);
  if (description !== undefined) inc.description = String(description);
  res.json(inc);
});
router.delete('/:id', authMiddleware, (req, res) => {
  const idx = db.incomes.findIndex(i => i.id === req.params.id);
  const inc = idx >= 0 ? db.incomes[idx] : null;
  if (!inc || inc.userId !== req.userId) return res.status(403).json({ error: 'Forbidden' });
  db.incomes.splice(idx, 1);
  res.json({ success: true });
});
export default router;
