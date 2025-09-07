// ===============================
// server.js
// Point d'entrée du backend complet (étape 3)
// ===============================

import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

import authRoutes from './routes/auth.js';
import categoriesRoutes from './routes/categories.js';
import incomesRoutes from './routes/incomes.js';
import expensesRoutes from './routes/expenses.js';
import summaryRoutes from './routes/summary.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: True });

app.use('/api/auth', authRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/incomes', incomesRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/summary', summaryRoutes);

app.get('/', (req, res) => res.send('Backend expenses API (étape 3) - OK'));

app.use((err, req, res, next) => {
  console.error('Erreur serveur:', err && err.stack ? err.stack : err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 API running on http://localhost:${PORT}`);
});
