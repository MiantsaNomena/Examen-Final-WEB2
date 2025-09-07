// models/utils.js
import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET || 'DEV_SECRET_CHANGE_ME';
export function signToken(userId) { return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: '7d' }); }
export function isYYYYMMDD(str) { return /^\d{4}-\d{2}-\d{2}$/.test(str); }
export function isYYYYMM(str) { return /^\d{4}-\d{2}$/.test(str); }
export function toDate(d) { return new Date(d + 'T00:00:00.000Z'); }
export function yearMonthKey(dateObj) { const y = dateObj.getUTCFullYear(); const m = String(dateObj.getUTCMonth()+1).padStart(2,'0'); return `${y}-${m}`; }
export function inclusiveMonthCount(startYYYYMM, endYYYYMM) { const [sy, sm] = startYYYYMM.split('-').map(Number); const [ey, em] = endYYYYMM.split('-').map(Number); return (ey - sy) * 12 + (em - sm) + 1; }
export function isRecurringActiveInMonth(expense, yyyymm) { if (expense.type !== 'recurrent') return false; const startKey = yearMonthKey(toDate(expense.startDate)); const endKey = expense.endDate ? yearMonthKey(toDate(expense.endDate)) : null; if (yyyymm < startKey) return false; if (endKey && yyyymm > endKey) return false; return true; }
export function recurringMonthsInRange(expense, startStr, endStr) { if (expense.type !== 'recurrent') return 0; const startKey = yearMonthKey(toDate(startStr)); const endKey = yearMonthKey(toDate(endStr)); const expStartKey = yearMonthKey(toDate(expense.startDate)); const expEndKey = expense.endDate ? yearMonthKey(toDate(expense.endDate)) : null; const realStart = startKey > expStartKey ? startKey : expStartKey; const realEnd = expEndKey ? (endKey < expEndKey ? endKey : expEndKey) : endKey; if (realEnd < realStart) return 0; return inclusiveMonthCount(realStart, realEnd); }
export function filterByDateRange(list, start, end, dateFieldName='date') { return list.filter(item => { const d = toDate(item[dateFieldName]).getTime(); const okStart = start ? d >= toDate(start).getTime() : true; const okEnd = end ? d <= toDate(end).getTime() : true; return okStart && okEnd; }); }
