import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET || 'DEV_SECRET_CHANGE_ME';

export function signToken(userId) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: '7d' });
}
