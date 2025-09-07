// routes/categories.js
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../models/db.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
const router = express.Router();
router.get('/', authMiddleware, (req, res) => {
  const list = db.categories.filter(c => c.userId === req.userId);
  res.json(list);
});
router.post('/', authMiddleware, (req, res) => {
  const { name } = req.body;
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'name is required' });
  const cat = { id: uuidv4(), userId: req.userId, name: String(name).trim(), createdAt: new Date().toISOString() };
  db.categories.push(cat);
  res.status(201).json(cat);
});
router.put('/:id', authMiddleware, (req, res) => {
  const cat = db.categories.find(c => c.id === req.params.id);
  if (!cat || cat.userId !== req.userId) return res.status(403).json({ error: 'Forbidden' });
  const { name } = req.body;
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'name is required' });
  cat.name = String(name).trim();
  res.json(cat);
});
router.delete('/:id', authMiddleware, (req, res) => {
  const idx = db.categories.findIndex(c => c.id === req.params.id);
  const cat = idx >= 0 ? db.categories[idx] : null;
  if (!cat || cat.userId !== req.userId) return res.status(403).json({ error: 'Forbidden' });
  const used = db.expenses.some(e => e.userId === req.userId && e.categoryId === cat.id);
  if (used) return res.status(400).json({ error: 'category is in use and cannot be deleted' });
  db.categories.splice(idx, 1);
  res.json({ success: true });
});
export default router;
