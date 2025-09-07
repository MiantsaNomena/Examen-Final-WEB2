// routes/expenses.js
import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { db } from '../models/db.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { isYYYYMMDD } from '../models/utils.js';
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
const storage = multer.diskStorage({ destination: (req,file,cb)=> cb(null, UPLOADS_DIR), filename: (req,file,cb)=> { const unique = Date.now()+'-'+Math.round(Math.random()*1e9); const ext = path.extname(file.originalname); cb(null, unique+ext); } });
function fileFilter(req,file,cb){ const allowed = ['image/jpeg','image/png','application/pdf']; if(!allowed.includes(file.mimetype)) return cb(new Error('Invalid file type (JPG, PNG, PDF)')); cb(null,true); }
const upload = multer({ storage, fileFilter, limits: { fileSize: 5*1024*1024 } });
const router = express.Router();
router.get('/', authMiddleware, (req, res) => {
  const { start, end, category, type } = req.query;
  let list = db.expenses.filter(e => e.userId === req.userId);
  if (start && !isYYYYMMDD(start)) return res.status(400).json({ error: 'invalid start date' });
  if (end && !isYYYYMMDD(end)) return res.status(400).json({ error: 'invalid end date' });
  if (category) list = list.filter(e => e.categoryId === category);
  if (type) { if (!['one','recurrent'].includes(String(type))) return res.status(400).json({ error: 'invalid type' }); list = list.filter(e => e.type === String(type)); }
  res.json(list);
});
router.get('/:id', authMiddleware, (req, res) => {
  const exp = db.expenses.find(e => e.id === req.params.id);
  if (!exp || exp.userId !== req.userId) return res.status(403).json({ error: 'Forbidden' });
  res.json(exp);
});
router.post('/', authMiddleware, upload.single('receipt'), (req, res) => {
  try {
    const { amount, date, categoryId, description, type, startDate, endDate } = req.body;
    if (amount === undefined || isNaN(Number(amount))) return res.status(400).json({ error: 'amount is required and must be a number' });
    const _type = type ? String(type) : 'one';
    if (!['one','recurrent'].includes(_type)) return res.status(400).json({ error: 'type must be "one" or "recurrent"' });
    const cat = db.categories.find(c => c.id === categoryId && c.userId === req.userId);
    if (!cat) return res.status(400).json({ error: 'invalid categoryId' });
    if (_type === 'one') { if (!date || !isYYYYMMDD(date)) return res.status(400).json({ error: 'date (YYYY-MM-DD) is required for one-time expense' }); }
    else { if (!startDate || !isYYYYMMDD(startDate)) return res.status(400).json({ error: 'startDate is required for recurrent expense' }); if (endDate && !isYYYYMMDD(endDate)) return res.status(400).json({ error: 'endDate must be YYYY-MM-DD if provided' }); }
    let receipt = null;
    if (req.file) { receipt = { filename: req.file.filename, originalName: req.file.originalname, mimeType: req.file.mimetype, size: req.file.size, path: path.join('uploads', req.file.filename) }; }
    const exp = { id: uuidv4(), userId: req.userId, amount: Number(amount), date: _type === 'one' ? String(date) : null, type: _type, categoryId: String(categoryId), description: String(description || ''), startDate: _type === 'recurrent' ? String(startDate) : null, endDate: _type === 'recurrent' ? (endDate ? String(endDate) : null) : null, createdAt: new Date().toISOString(), receipt };
    db.expenses.push(exp);
    res.status(201).json(exp);
  } catch (err) {
    if (req.file) { const p = path.join(UPLOADS_DIR, req.file.filename); if (fs.existsSync(p)) fs.unlinkSync(p); }
    res.status(400).json({ error: err.message });
  }
});
router.put('/:id', authMiddleware, upload.single('receipt'), (req, res) => {
  const exp = db.expenses.find(e => e.id === req.params.id);
  if (!exp || exp.userId !== req.userId) { if (req.file) { const p = path.join(UPLOADS_DIR, req.file.filename); if (fs.existsSync(p)) fs.unlinkSync(p); } return res.status(403).json({ error: 'Forbidden' }); }
  const { amount, date, categoryId, description, type, startDate, endDate, removeReceipt } = req.body;
  if (categoryId !== undefined) { const cat = db.categories.find(c => c.id === categoryId && c.userId === req.userId); if (!cat) return res.status(400).json({ error: 'invalid categoryId' }); exp.categoryId = String(categoryId); }
  if (type !== undefined) { if (!['one','recurrent'].includes(String(type))) return res.status(400).json({ error: 'type must be "one" or "recurrent"' }); exp.type = String(type); if (exp.type === 'one') { exp.startDate = null; exp.endDate = null; } else { exp.date = null; } }
  if (exp.type === 'one') { if (date !== undefined) { if (!isYYYYMMDD(date)) return res.status(400).json({ error: 'date must be YYYY-MM-DD' }); exp.date = String(date); } }
  else { if (startDate !== undefined) { if (!isYYYYMMDD(startDate)) return res.status(400).json({ error: 'startDate must be YYYY-MM-DD' }); exp.startDate = String(startDate); } if (endDate !== undefined && endDate !== '') { if (!isYYYYMMDD(endDate)) return res.status(400).json({ error: 'endDate must be YYYY-MM-DD' }); exp.endDate = String(endDate); } if (endDate === '') exp.endDate = null; }
  if (amount !== undefined) { if (isNaN(Number(amount))) return res.status(400).json({ error: 'amount must be a number' }); exp.amount = Number(amount); }
  if (description !== undefined) exp.description = String(description);
  if (req.file) { if (exp.receipt && exp.receipt.filename) { const oldPath = path.join(UPLOADS_DIR, exp.receipt.filename); if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath); } exp.receipt = { filename: req.file.filename, originalName: req.file.originalname, mimeType: req.file.mimetype, size: req.file.size, path: path.join('uploads', req.file.filename) }; }
  else if (removeReceipt === 'true') { if (exp.receipt && exp.receipt.filename) { const oldPath = path.join(UPLOADS_DIR, exp.receipt.filename); if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath); } exp.receipt = null; }
  res.json(exp);
});
router.delete('/:id', authMiddleware, (req, res) => {
  const idx = db.expenses.findIndex(e => e.id === req.params.id);
  const exp = idx >= 0 ? db.expenses[idx] : null;
  if (!exp || exp.userId !== req.userId) return res.status(403).json({ error: 'Forbidden' });
  if (exp.receipt && exp.receipt.filename) { const p = path.join(UPLOADS_DIR, exp.receipt.filename); if (fs.existsSync(p)) fs.unlinkSync(p); }
  db.expenses.splice(idx, 1);
  res.json({ success: true });
});
export default router;
