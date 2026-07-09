import { useState } from 'react';
import { Link } from 'react-router-dom';
import { signup } from '../api/client.js';
import { isValidEmail, isValidMobile, isValidUsername, passwordStrengthErrors } from '../lib/authValidation.js';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  function validate() {
    if (!email || !mobile || !password || !confirmPassword) {
      return 'Email, mobile number, password, and confirm password are required.';
    }
    if (!isValidEmail(email)) {
      return 'Enter a valid email address.';
    }
    if (!isValidMobile(mobile)) {
      return 'Enter a valid 10-digit mobile number.';
    }
    if (username && !isValidUsername(username)) {
      return 'Username must be 3-20 characters, start with a letter, and contain only letters, numbers, "_", or ".".';
    }
    const passwordErrors = passwordStrengthErrors(password);
    if (passwordErrors.length > 0) {
      return passwordErrors[0];
    }
    if (password !== confirmPassword) {
      return 'Password and confirm password do not match.';
    }
    return '';
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setStatus('loading');
    setError('');
    try {
      await signup({ email, mobile, username: username || undefined, password, confirmPassword });
      setStatus('success');
    } catch (err) {
      setError(err.message);
      setStatus('idle');
    }
  }

  if (status === 'success') {
    return (
      <div className="auth-page">
        <div className="auth-card" data-testid="signup-success">
          <h1>Account created</h1>
          <p>
            You can now <Link to="/login" data-testid="login-link">log in</Link>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Sign up</h1>
        <form className="auth-form" onSubmit={handleSubmit} data-testid="signup-form">
          <div className="field">
            <label htmlFor="signup-email">Email</label>
            <input
              id="signup-email"
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid="signup-email-input"
            />
          </div>
          <div className="field">
            <label htmlFor="signup-mobile">Mobile number</label>
            <input
              id="signup-mobile"
              type="text"
              placeholder="10-digit mobile number"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              data-testid="signup-mobile-input"
            />
          </div>
          <div className="field">
            <label htmlFor="signup-username">Username (optional)</label>
            <input
              id="signup-username"
              type="text"
              placeholder="Linked to your email/mobile for login"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              data-testid="signup-username-input"
            />
          </div>
          <div className="field">
            <label htmlFor="signup-password">Password</label>
            <input
              id="signup-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              data-testid="signup-password-input"
            />
            <span className="field-hint">
              At least 10 characters, with letters, numbers, and 2+ special characters.
            </span>
          </div>
          <div className="field">
            <label htmlFor="signup-confirm-password">Confirm password</label>
            <input
              id="signup-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              data-testid="signup-confirm-password-input"
            />
          </div>
          <button
            type="submit"
            className="auth-submit-button"
            disabled={status === 'loading'}
            data-testid="signup-submit-button"
          >
            {status === 'loading' ? 'Creating account…' : 'Sign up'}
          </button>
          {error && (
            <p className="form-error" role="alert" data-testid="signup-error">
              {error}
            </p>
          )}
        </form>
        <div className="auth-links">
          <span>
            Already have an account? <Link to="/login" data-testid="login-link">Log in</Link>
          </span>
        </div>
      </div>
    </div>
  );
}
