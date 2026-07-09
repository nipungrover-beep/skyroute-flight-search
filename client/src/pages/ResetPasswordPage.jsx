import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../api/client.js';
import { passwordStrengthErrors } from '../lib/authValidation.js';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState(searchParams.get('token') ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();

    if (!token) {
      setError('A reset token is required.');
      return;
    }
    const passwordErrors = passwordStrengthErrors(newPassword);
    if (passwordErrors.length > 0) {
      setError(passwordErrors[0]);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Password and confirm password do not match.');
      return;
    }

    setStatus('loading');
    setError('');
    try {
      await resetPassword({ token, newPassword, confirmPassword });
      setStatus('success');
    } catch (err) {
      setError(err.message);
      setStatus('idle');
    }
  }

  if (status === 'success') {
    return (
      <div className="auth-page">
        <div className="auth-card" data-testid="reset-password-success">
          <h1>Password reset</h1>
          <p>
            Your password has been updated. <Link to="/login" data-testid="login-link">Log in</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Reset password</h1>
        <form className="auth-form" onSubmit={handleSubmit} data-testid="reset-password-form">
          <div className="field">
            <label htmlFor="reset-password-token">Reset token</label>
            <input
              id="reset-password-token"
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              data-testid="reset-password-token-input"
            />
          </div>
          <div className="field">
            <label htmlFor="reset-password-new">New password</label>
            <input
              id="reset-password-new"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              data-testid="reset-password-new-password-input"
            />
            <span className="field-hint">
              At least 10 characters, with letters, numbers, and 2+ special characters.
            </span>
          </div>
          <div className="field">
            <label htmlFor="reset-password-confirm">Confirm new password</label>
            <input
              id="reset-password-confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              data-testid="reset-password-confirm-password-input"
            />
          </div>
          <button
            type="submit"
            className="auth-submit-button"
            disabled={status === 'loading'}
            data-testid="reset-password-submit-button"
          >
            {status === 'loading' ? 'Resetting…' : 'Reset password'}
          </button>
          {error && (
            <p className="form-error" role="alert" data-testid="reset-password-error">
              {error}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
