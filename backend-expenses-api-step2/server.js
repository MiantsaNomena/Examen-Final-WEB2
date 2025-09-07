// ===============================
//  server.js
//  -> Point d'entrée principal de l'application Express
//  -> Comme la place centrale du village 🏰
// ===============================

// 1) IMPORTS DES LIBRAIRIES
import express from 'express';   // Express = framework serveur HTTP
import cors from 'cors';         // CORS = autoriser l'accès depuis React (autre port)
import { fileURLToPath } from 'url';
import path from 'path';

// 2) IMPORT DE NOS ROUTES
import authRoutes from './routes/auth.js'; // Rue Auth

// 3) CONFIGURATION DE BASE
const app = express();
const PORT = process.env.PORT || 3000;

// 4) MIDDLEWARES GLOBAUX
app.use(cors());
app.use(express.json());

// 5) ROUTES
app.use('/api/auth', authRoutes);

// 6) DEMARRAGE
app.listen(PORT, () => {
  console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`);
});
