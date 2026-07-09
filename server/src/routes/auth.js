import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import { db } from '../db.js';
import { hashPassword, verifyPassword } from '../lib/passwordHash.js';
import {
  isValidEmail,
  isValidMobile,
  isValidUsername,
  passwordStrengthErrors,
  detectLoginIdType,
} from '../lib/authValidation.js';

export const authRouter = Router();

const RESET_TOKEN_TTL_MINUTES = 30;

function findUserByLoginId(loginId) {
  const type = detectLoginIdType(loginId);
  if (!type) return { type: null, user: undefined };
  const user = db.prepare(`SELECT * FROM users WHERE ${type} = ?`).get(loginId);
  return { type, user };
}

function publicUser(user) {
  return { userId: user.id, email: user.email, mobile: user.mobile, username: user.username };
}

authRouter.post('/signup', (req, res) => {
  const { email, mobile, username, password, confirmPassword } = req.body ?? {};

  if (!email || !mobile || !password || !confirmPassword) {
    return res.status(400).json({ error: 'email, mobile, password, and confirmPassword are required' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Enter a valid email address' });
  }
  if (!isValidMobile(mobile)) {
    return res.status(400).json({ error: 'Enter a valid 10-digit mobile number' });
  }
  const normalizedUsername = username ? String(username) : null;
  if (normalizedUsername && !isValidUsername(normalizedUsername)) {
    return res.status(400).json({
      error: 'Username must be 3-20 characters, start with a letter, and contain only letters, numbers, "_", or "."',
    });
  }

  const passwordErrors = passwordStrengthErrors(password);
  if (passwordErrors.length > 0) {
    return res.status(400).json({ error: passwordErrors[0], errors: passwordErrors });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Password and confirm password do not match' });
  }

  const existing = normalizedUsername
    ? db.prepare('SELECT id FROM users WHERE email = ? OR mobile = ? OR username = ?').get(email, mobile, normalizedUsername)
    : db.prepare('SELECT id FROM users WHERE email = ? OR mobile = ?').get(email, mobile);

  if (existing) {
    return res.status(409).json({ error: 'An account with this email, mobile number, or username already exists' });
  }

  const passwordHash = hashPassword(password);
  const result = db
    .prepare('INSERT INTO users (email, mobile, username, password_hash) VALUES (?, ?, ?, ?)')
    .run(email, mobile, normalizedUsername, passwordHash);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(Number(result.lastInsertRowid));
  res.status(201).json(publicUser(user));
});

authRouter.post('/login', (req, res) => {
  const { loginId, password } = req.body ?? {};
  if (!loginId || !password) {
    return res.status(400).json({ error: 'loginId and password are required' });
  }

  const { type, user } = findUserByLoginId(loginId);
  if (!type) {
    return res.status(400).json({ error: 'Enter a valid email, mobile number, or username' });
  }
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid login ID or password' });
  }

  res.json(publicUser(user));
});

authRouter.post('/forgot-password', (req, res) => {
  const { loginId } = req.body ?? {};
  if (!loginId) {
    return res.status(400).json({ error: 'loginId is required' });
  }

  const { user } = findUserByLoginId(loginId);
  if (!user) {
    return res.status(404).json({ error: 'No account found for that email, mobile number, or username' });
  }

  const token = randomBytes(16).toString('hex');
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000).toISOString();
  db.prepare('INSERT INTO password_resets (token, user_id, expires_at, used) VALUES (?, ?, ?, 0)').run(
    token,
    user.id,
    expiresAt
  );

  res.json({
    message: 'Password reset token generated.',
    // POC shortcut: this app has no real email service, so the token is
    // returned directly instead of being emailed, keeping the reset flow
    // fully testable end-to-end.
    resetToken: token,
    expiresAt,
  });
});

authRouter.post('/reset-password', (req, res) => {
  const { token, newPassword, confirmPassword } = req.body ?? {};
  if (!token || !newPassword || !confirmPassword) {
    return res.status(400).json({ error: 'token, newPassword, and confirmPassword are required' });
  }

  const reset = db.prepare('SELECT * FROM password_resets WHERE token = ?').get(token);
  if (!reset || reset.used) {
    return res.status(400).json({ error: 'Invalid or already-used reset token' });
  }
  if (new Date(reset.expires_at) < new Date()) {
    return res.status(400).json({ error: 'Reset token has expired' });
  }

  const passwordErrors = passwordStrengthErrors(newPassword);
  if (passwordErrors.length > 0) {
    return res.status(400).json({ error: passwordErrors[0], errors: passwordErrors });
  }
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: 'Password and confirm password do not match' });
  }

  const passwordHash = hashPassword(newPassword);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, reset.user_id);
  db.prepare('UPDATE password_resets SET used = 1 WHERE token = ?').run(token);

  res.json({ message: 'Password has been reset successfully.' });
});
