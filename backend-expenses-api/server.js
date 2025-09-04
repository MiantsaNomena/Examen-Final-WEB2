// ===============================
//  Backend Express - Suivi dépenses
//  (Projet pédagogique, 1ère année)
//  -> ENTIEREMENT COMMENTÉ LIGNE PAR LIGNE
// ===============================

// 1) IMPORTS
import express from 'express';          // Framework HTTP minimaliste
import cors from 'cors';                // Autoriser les requêtes depuis le frontend
import multer from 'multer';            // Upload de fichiers (reçus)
import jwt from 'jsonwebtoken';         // Création/Vérification des tokens JWT
import bcrypt from 'bcryptjs';          // Hachage des mots de passe
import { v4 as uuidv4 } from 'uuid';    // Identifiants uniques
import path from 'path';                // Chemins de fichiers
import fs from 'fs';                    // Système de fichiers
import { fileURLToPath } from 'url';    // Récupérer __dirname en ESModules

// 2) OUTILS SYSTEME (recréation de __dirname en ESModules)
const __filename = fileURLToPath(import.meta.url); // Fichier courant (server.js)
const __dirname = path.dirname(__filename);        // Dossier contenant server.js

// 3) APP EXPRESS + CONFIG
const app = express();                            // Crée l'application Express
const PORT = process.env.PORT || 3000;            // Port HTTP (3000 par défaut)
const JWT_SECRET = process.env.JWT_SECRET || 'DEV_SECRET_CHANGE_ME'; // Clé pour signer les JWT

app.use(cors());                                  // Active CORS
app.use(express.json());                          // Parse le JSON des requêtes

// 4) DOSSIER DES UPLOADS (reçus)
const UPLOADS_DIR = path.join(__dirname, 'uploads'); // Chemin pour les reçus
if (!fs.existsSync(UPLOADS_DIR)) {                   // Si le dossier n'existe pas
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });    // On le crée
}

// 5) "BASE DE DONNÉES" EN MÉMOIRE (objets JS en RAM)
const db = {
  users: [],       // { id, email, passwordHash, createdAt }
  categories: [],  // { id, userId, name, createdAt }
  incomes: [],     // { id, userId, amount, date, source, description, createdAt }
  expenses: []     // { id, userId, amount, date, type, categoryId, description, startDate, endDate, createdAt, receipt }
};

// 6) CATEGORIES PAR DEFAUT lors d'une inscription utilisateur
const DEFAULT_CATEGORIES = ['Alimentation','Transport','Logement','Loisirs','Santé','Éducation','Autres'];

// 7) FONCTIONS UTILITAIRES
function signToken(userId){                           // Crée un JWT avec l'id utilisateur
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: '7d' }); // expire dans 7 jours
}
function authMiddleware(req,res,next){                // Protège les routes privées
  const auth = req.headers['authorization'];          // On lit l'en-tête Authorization
  if(!auth) return res.status(401).json({error:'Authorization header missing'});
  const [scheme, token] = auth.split(' ');            // Format: "Bearer <token>"
  if(scheme!=='Bearer' || !token) return res.status(401).json({error:'Invalid Authorization format'});
  try{
    const payload = jwt.verify(token, JWT_SECRET);    // Vérifie la signature + expiration
    req.userId = payload.sub;                         // Stocke l'id user sur la requête
    next();                                           // Passe à la suite
  }catch(e){
    return res.status(401).json({error:'Invalid or expired token'});
  }
}
function findUserByEmail(email){                      // Recherche d'un utilisateur par email
  return db.users.find(u=>u.email.toLowerCase()===String(email).toLowerCase());
}
function isYYYYMMDD(str){ return /^\d{4}-\d{2}-\d{2}$/.test(str); } // Vérifie "YYYY-MM-DD"
function isYYYYMM(str){ return /^\d{4}-\d{2}$/.test(str); }          // Vérifie "YYYY-MM"
function toDate(d){ return new Date(d+'T00:00:00.000Z'); }             // Convertit en Date (minuit UTC)
function ymKey(date){ const y=date.getUTCFullYear(); const m=String(date.getUTCMonth()+1).padStart(2,'0'); return `${y}-${m}`; }
function isRecurringActiveInMonth(expense, yyyymm){                     // Dépense récurrente active pour un mois donné?
  if(expense.type!=='recurrent') return false;                          // Seulement pour 'recurrent'
  const start = ymKey(toDate(expense.startDate));                       // Mois de début
  const end   = expense.endDate ? ymKey(toDate(expense.endDate)) : null;// Mois de fin éventuel
  if(yyyymm<start) return false;                                        // Avant le début
  if(end && yyyymm>end) return false;                                   // Après la fin
  return true;                                                          // Sinon: active
}

// 8) CONFIG UPLOAD (Multer) pour les reçus (JPG/PNG/PDF, <=5Mo)
const storage = multer.diskStorage({                                    // On sauve sur disque
  destination: (req,file,cb)=> cb(null, UPLOADS_DIR),                   // Dossier cible
  filename: (req,file,cb)=> {                                           // Nom de fichier unique
    const unique = Date.now()+'-'+Math.round(Math.random()*1e9);
    const ext = path.extname(file.originalname);
    cb(null, unique+ext);
  }
});
function fileFilter(req,file,cb){                                       // Filtre type MIME
  const ok = ['image/jpeg','image/png','application/pdf'].includes(file.mimetype);
  if(!ok) return cb(new Error('Invalid file type (JPG, PNG, PDF)'));
  cb(null,true);
}
const upload = multer({ storage, fileFilter, limits:{ fileSize: 5*1024*1024 } }); // 5 Mo

// 9) AUTHENTIFICATION (signup/login/me)
app.post('/api/auth/signup', async (req,res)=>{                          // Créer un compte
  try{
    const {email,password} = req.body;
    if(!email||!password) return res.status(400).json({error:'email and password are required'});
    if(findUserByEmail(email)) return res.status(400).json({error:'email already registered'});
    const hash = await bcrypt.hash(password,10);                         // Hacher le mot de passe
    const user = { id: uuidv4(), email, passwordHash: hash, createdAt: new Date().toISOString() };
    db.users.push(user);                                                 // Sauvegarde en mémoire
    DEFAULT_CATEGORIES.forEach(name=> db.categories.push({ id: uuidv4(), userId: user.id, name, createdAt: new Date().toISOString() }));
    const token = signToken(user.id);                                    // Génère le JWT
    res.status(201).json({ token, user:{ id:user.id, email:user.email, createdAt:user.createdAt } });
  }catch(err){ res.status(500).json({error:err.message}); }
});
app.post('/api/auth/login', async (req,res)=>{                           // Se connecter
  try{
    const {email,password} = req.body;
    const user = findUserByEmail(email);
    if(!user) return res.status(400).json({error:'invalid credentials'});
    const ok = await bcrypt.compare(password, user.passwordHash);
    if(!ok) return res.status(400).json({error:'invalid credentials'});
    const token = signToken(user.id);
    res.json({ token, user:{ id:user.id, email:user.email, createdAt:user.createdAt } });
  }catch(err){ res.status(500).json({error:err.message}); }
});
app.get('/api/auth/me', authMiddleware, (req,res)=>{                     // Profil
  const u = db.users.find(x=>x.id===req.userId);
  res.json({ id:u.id, email:u.email, createdAt:u.createdAt });
});

// 10) CATEGORIES (CRUD minimal)
app.get('/api/categories', authMiddleware, (req,res)=>{                  // Liste catégories
  res.json(db.categories.filter(c=>c.userId===req.userId));
});
app.post('/api/categories', authMiddleware, (req,res)=>{                 // Créer catégorie
  const {name} = req.body;
  if(!name||!String(name).trim()) return res.status(400).json({error:'name is required'});
  const cat = { id: uuidv4(), userId:req.userId, name:String(name).trim(), createdAt:new Date().toISOString() };
  db.categories.push(cat);
  res.status(201).json(cat);
});

// 11) REVENUS (incomes)
app.post('/api/incomes', authMiddleware, (req,res)=>{                    // Créer revenu
  const { amount, date, source, description } = req.body;
  if(amount===undefined || isNaN(Number(amount))) return res.status(400).json({error:'amount must be a number'});
  if(!date || !isYYYYMMDD(date)) return res.status(400).json({error:'date (YYYY-MM-DD) is required'});
  const inc = { id:uuidv4(), userId:req.userId, amount:Number(amount), date:String(date), source:String(source||''), description:String(description||''), createdAt:new Date().toISOString() };
  db.incomes.push(inc);
  res.status(201).json(inc);
});

// 12) DEPENSES (expenses) ponctuelles & récurrentes + reçu
app.post('/api/expenses', authMiddleware, upload.single('receipt'), (req,res)=>{ // Créer dépense
  try{
    const { amount, date, categoryId, description, type, startDate, endDate } = req.body;
    if(amount===undefined || isNaN(Number(amount))) return res.status(400).json({error:'amount must be a number'});
    const _type = type ? String(type) : 'one';
    if(!['one','recurrent'].includes(_type)) return res.status(400).json({error:'type must be "one" or "recurrent"'});
    const cat = db.categories.find(c=>c.id===categoryId && c.userId===req.userId);
    if(!cat) return res.status(400).json({error:'invalid categoryId'});
    if(_type==='one'){ if(!date || !isYYYYMMDD(date)) return res.status(400).json({error:'date (YYYY-MM-DD) is required for one-time expense'}); }
    else { if(!startDate || !isYYYYMMDD(startDate)) return res.status(400).json({error:'startDate is required (YYYY-MM-DD)'});
           if(endDate && !isYYYYMMDD(endDate)) return res.status(400).json({error:'endDate must be YYYY-MM-DD'}); }
    let receipt = null;
    if(req.file){ receipt = { filename:req.file.filename, originalName:req.file.originalname, mimeType:req.file.mimetype, size:req.file.size, path:path.join('uploads', req.file.filename) }; }
    const exp = { id:uuidv4(), userId:req.userId, amount:Number(amount), date:_type==='one'?String(date):null, type:_type, categoryId:String(categoryId), description:String(description||''), startDate:_type==='recurrent'?String(startDate):null, endDate:_type==='recurrent'?(endDate?String(endDate):null):null, createdAt:new Date().toISOString(), receipt };
    db.expenses.push(exp);
    res.status(201).json(exp);
  }catch(err){ res.status(400).json({error:err.message}); }
});

// 13) RECUS (téléchargement)
app.get('/api/receipts/:idExpense', authMiddleware, (req,res)=>{         // Récupérer le reçu
  const exp = db.expenses.find(e=>e.id===req.params.idExpense && e.userId===req.userId);
  if(!exp) return res.status(404).json({error:'expense not found'});
  if(!exp.receipt) return res.status(404).json({error:'receipt not found'});
  const abs = path.join(__dirname, exp.receipt.path);
  if(!fs.existsSync(abs)) return res.status(404).json({error:'file missing on server'});
  res.sendFile(abs);
});

// 14) RESUMES mensuels
app.get('/api/summary/monthly', authMiddleware, (req,res)=>{             // Bilan du mois
  const month = isYYYYMM(req.query.month) ? req.query.month : ymKey(new Date());
  const incs = db.incomes.filter(i=>i.userId===req.userId && ymKey(toDate(i.date))===month);
  const ones = db.expenses.filter(e=>e.userId===req.userId && e.type==='one' && ymKey(toDate(e.date))===month);
  const recs = db.expenses.filter(e=>e.userId===req.userId && e.type==='recurrent' && isRecurringActiveInMonth(e, month));
  const totalIncome = incs.reduce((s,i)=>s+i.amount,0);
  const totalExpenses = ones.reduce((s,e)=>s+e.amount,0) + recs.reduce((s,e)=>s+e.amount,0);
  res.json({ month, totalIncome, totalExpenses, balance: totalIncome-totalExpenses, incomes:incs, oneExpenses:ones, recurrentExpenses:recs });
});

// 15) ALERTES (dépenses > revenus pour le mois courant)
app.get('/api/summary/alerts', authMiddleware, (req,res)=>{
  const month = ymKey(new Date());
  const incs = db.incomes.filter(i=>i.userId===req.userId && ymKey(toDate(i.date))===month);
  const ones = db.expenses.filter(e=>e.userId===req.userId && e.type==='one' && ymKey(toDate(e.date))===month);
  const recs = db.expenses.filter(e=>e.userId===req.userId && e.type==='recurrent' && isRecurringActiveInMonth(e, month));
  const totalIncome = incs.reduce((s,i)=>s+i.amount,0);
  const totalExpenses = ones.reduce((s,e)=>s+e.amount,0) + recs.reduce((s,e)=>s+e.amount,0);
  const alert = totalExpenses>totalIncome;
  res.json({ alert, message: alert ? `Vous avez dépassé votre budget mensuel de ${(totalExpenses-totalIncome).toFixed(2)} $` : 'Budget OK' });
});

// 16) ERREURS et DEMARRAGE
app.use((err,req,res,next)=>{ console.error(err); res.status(err.status||500).json({error:err.message||'Server error'}); });
app.listen(PORT, ()=> console.log(`API running on http://localhost:${PORT}`));
