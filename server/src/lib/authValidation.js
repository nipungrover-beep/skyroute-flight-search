// Login ID rules: an account is identified by email, a 10-digit Indian mobile
// number, or an optional chosen username linked to that email/mobile.
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MOBILE_RE = /^[6-9]\d{9}$/;
export const USERNAME_RE = /^[A-Za-z][A-Za-z0-9_.]{2,19}$/;

// At least 10 characters, at least one letter, at least one digit, and at
// least 2 special (non-alphanumeric) characters.
const SPECIAL_CHAR_RE = /[^A-Za-z0-9]/g;

export function isValidEmail(value) {
  return typeof value === 'string' && EMAIL_RE.test(value);
}

export function isValidMobile(value) {
  return typeof value === 'string' && MOBILE_RE.test(value);
}

export function isValidUsername(value) {
  return typeof value === 'string' && USERNAME_RE.test(value);
}

export function passwordStrengthErrors(password) {
  const errors = [];
  if (typeof password !== 'string' || password.length < 10) {
    errors.push('Password must be at least 10 characters long.');
  }
  if (typeof password === 'string') {
    if (!/[A-Za-z]/.test(password)) {
      errors.push('Password must include at least one letter.');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must include at least one number.');
    }
    const specialCount = (password.match(SPECIAL_CHAR_RE) || []).length;
    if (specialCount < 2) {
      errors.push('Password must include at least 2 special characters.');
    }
  }
  return errors;
}

// Classifies a login ID into the column it should be matched against.
// Returns null if it matches none of the three accepted shapes.
export function detectLoginIdType(loginId) {
  if (isValidEmail(loginId)) return 'email';
  if (isValidMobile(loginId)) return 'mobile';
  if (isValidUsername(loginId)) return 'username';
  return null;
}
