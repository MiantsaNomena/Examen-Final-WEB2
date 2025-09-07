# Backend - Suivi des dépenses (Étape 3 - Finale)

## Description
Backend complet pour le suivi des revenus et dépenses personnelles.
Conçu pour un examen Web2 (niveau première année), ce backend :
- utilise Express (Node.js)
- stocke les données en mémoire (db.js)
- gère l'authentification JWT
- permet de créer des catégories, revenus, dépenses (ponctuelles & récurrentes)
- supporte l'upload de reçus (JPG/PNG/PDF <= 5MB)
- fournit des endpoints de résumé et d'alerte

## Installation & lancement
1. Dézippez l'archive et ouvrez un terminal à la racine du projet.
2. Installez les dépendances :
```bash
npm install
```
3. Lancez le serveur :
```bash
npm start
```
Le serveur tourne sur `http://localhost:3000`.

## Structure du projet
```
backend-expenses-api/
│── server.js
│── package.json
│── README.md
│
├── routes/
│   ├── auth.js
│   ├── categories.js
│   ├── incomes.js
│   ├── expenses.js
│   └── summary.js
│
├── middleware/
│   └── authMiddleware.js
│
├── models/
│   ├── db.js
│   └── utils.js
│
└── uploads/
```

## Endpoints principaux (exemples)
### Auth
- `POST /api/auth/signup` `{ "email": "...", "password": "..." }`
- `POST /api/auth/login` `{ "email": "...", "password": "..." }`
- `GET /api/auth/me` (Bearer token)

### Categories
- `GET /api/categories` (Bearer token)
- `POST /api/categories` `{ "name": "Voyage" }` (Bearer token)

### Incomes (revenus)
- `POST /api/incomes` `{ "amount": 5000, "date": "2025-09-01", "source":"Salaire" }` (Bearer token)
- `GET /api/incomes?start=YYYY-MM-DD&end=YYYY-MM-DD`

### Expenses (dépenses)
- `POST /api/expenses` (multipart/form-data) fields: `amount, date, categoryId, type` and optional file `receipt`
- `GET /api/expenses?start=YYYY-MM-DD&end=YYYY-MM-DD&category=<id>&type=one|recurrent`

### Summary
- `GET /api/summary/monthly?month=YYYY-MM`
- `GET /api/summary?start=YYYY-MM-DD&end=YYYY-MM-DD`
- `GET /api/summary/alerts`

## Notes pédagogiques
- Les données sont stockées en mémoire : si tu redémarres le serveur, tout est perdu.
- Le code est abondamment commenté pour t'aider à comprendre chaque ligne.
- Pour l'examen, privilégie clarté et commentaires — c'est ce que j'ai fait ici.

## Exemple rapide (curl)
1) Signup
```bash
curl -X POST http://localhost:3000/api/auth/signup -H "Content-Type: application/json" -d '{"email":"a@a.com","password":"123456"}'
```
2) Login
```bash
curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"email":"a@a.com","password":"123456"}'
```
3) Use token for protected requests:
```bash
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/categories
```
