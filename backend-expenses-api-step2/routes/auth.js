import express from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

import { db, DEFAULT_CATEGORIES } from '../models/db.js';
import { signToken } from '../models/utils.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// Inscription
router.post('/signup', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }
  const exists = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (exists) {
    return res.status(400).json({ error: 'email already registered' });
  }
  const hash = await bcrypt.hash(password, 10);
  const user = { id: uuidv4(), email, passwordHash: hash, createdAt: new Date().toISOString() };
  db.users.push(user);
  DEFAULT_CATEGORIES.forEach(name => {
    db.categories.push({ id: uuidv4(), userId: user.id, name, createdAt: new Date().toISOString() });
  });
  const token = signToken(user.id);
  res.status(201).json({ token, user: { id: user.id, email: user.email, createdAt: user.createdAt } });
});

// Connexion
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) return res.status(400).json({ error: 'invalid credentials' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(400).json({ error: 'invalid credentials' });
  const token = signToken(user.id);
  res.json({ token, user: { id: user.id, email: user.email, createdAt: user.createdAt } });
});

// Profil
router.get('/me', authMiddleware, (req, res) => {
  const user = db.users.find(u => u.id === req.userId);
  res.json({ id: user.id, email: user.email, createdAt: user.createdAt });
});

export default router;
