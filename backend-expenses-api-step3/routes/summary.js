// routes/summary.js
import express from 'express';
import { db } from '../models/db.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { isYYYYMM, isYYYYMMDD, toDate, yearMonthKey, recurringMonthsInRange, isRecurringActiveInMonth } from '../models/utils.js';
const router = express.Router();
router.get('/monthly', authMiddleware, (req, res) => {
  const { month } = req.query;
  const targetMonth = month && isYYYYMM(month) ? month : yearMonthKey(new Date());
  const incomes = db.incomes.filter(i => i.userId === req.userId && yearMonthKey(toDate(i.date)) === targetMonth);
  const totalIncome = incomes.reduce((s, i) => s + i.amount, 0);
  const oneExpenses = db.expenses.filter(e => e.userId === req.userId && e.type === 'one' && yearMonthKey(toDate(e.date)) === targetMonth);
  const totalOne = oneExpenses.reduce((s, e) => s + e.amount, 0);
  const recurrentExpenses = db.expenses.filter(e => e.userId === req.userId && e.type === 'recurrent' && isRecurringActiveInMonth(e, targetMonth));
  const totalRec = recurrentExpenses.reduce((s, e) => s + e.amount, 0);
  const totalExpenses = totalOne + totalRec;
  const balance = totalIncome - totalExpenses;
  res.json({ month: targetMonth, totalIncome, totalExpenses, balance, incomes, oneExpenses, recurrentExpenses });
});
router.get('/', authMiddleware, (req, res) => {
  const { start, end } = req.query;
  if (!start || !end || !isYYYYMMDD(start) || !isYYYYMMDD(end)) return res.status(400).json({ error: 'start and end (YYYY-MM-DD) are required' });
  const incomes = db.incomes.filter(i => i.userId === req.userId && toDate(i.date).getTime() >= toDate(start).getTime() && toDate(i.date).getTime() <= toDate(end).getTime());
  const totalIncome = incomes.reduce((s, i) => s + i.amount, 0);
  const oneExpenses = db.expenses.filter(e => e.userId === req.userId && e.type === 'one' && toDate(e.date).getTime() >= toDate(start).getTime() && toDate(e.date).getTime() <= toDate(end).getTime());
  const totalOne = oneExpenses.reduce((s, e) => s + e.amount, 0);
  const recurrentExpenses = db.expenses.filter(e => e.userId === req.userId && e.type === 'recurrent');
  let totalRec = 0;
  recurrentExpenses.forEach(e => { const months = recurringMonthsInRange(e, start, end); totalRec += (months * e.amount); });
  const totalExpenses = totalOne + totalRec;
  const balance = totalIncome - totalExpenses;
  res.json({ range: { start, end }, totalIncome, totalExpenses, balance, incomes, oneExpenses, recurrentExpenses, recurrentCountedAmount: totalRec });
});
router.get('/alerts', authMiddleware, (req, res) => {
  const currentMonth = yearMonthKey(new Date());
  const incomes = db.incomes.filter(i => i.userId === req.userId && yearMonthKey(toDate(i.date)) === currentMonth);
  const totalIncome = incomes.reduce((s, i) => s + i.amount, 0);
  const ones = db.expenses.filter(e => e.userId === req.userId && e.type === 'one' && yearMonthKey(toDate(e.date)) === currentMonth);
  const recs = db.expenses.filter(e => e.userId === req.userId && e.type === 'recurrent' && isRecurringActiveInMonth(e, currentMonth));
  const totalExpenses = ones.reduce((s, e) => s + e.amount, 0) + recs.reduce((s, e) => s + e.amount, 0);
  const alert = totalExpenses > totalIncome;
  res.json({ alert, message: alert ? `Vous avez dépassé votre budget mensuel de ${(totalExpenses - totalIncome).toFixed(2)} $` : 'Budget OK' });
});
export default router;
