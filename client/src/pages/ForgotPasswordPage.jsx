import { useState } from 'react';
import { Link } from 'react-router-dom';
import { requestPasswordReset } from '../api/client.js';

export default function ForgotPasswordPage() {
  const [loginId, setLoginId] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [resetToken, setResetToken] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();

    if (!loginId) {
      setError('Enter your email, mobile number, or username.');
      return;
    }

    setStatus('loading');
    setError('');
    try {
      const data = await requestPasswordReset({ loginId });
      setResetToken(data.resetToken);
      setStatus('success');
    } catch (err) {
      setError(err.message);
      setStatus('idle');
    }
  }

  if (status === 'success') {
    return (
      <div className="auth-page">
        <div className="auth-card" data-testid="forgot-password-success">
          <h1>Reset link generated</h1>
          <p className="field-hint">
            This is a demo app with no real email service, so instead of emailing a link, here it is directly:
          </p>
          <Link
            className="auth-submit-button auth-submit-link"
            to={`/reset-password?token=${encodeURIComponent(resetToken)}`}
            data-testid="reset-password-link"
          >
            Continue to reset password
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Forgot password</h1>
        <form className="auth-form" onSubmit={handleSubmit} data-testid="forgot-password-form">
          <div className="field">
            <label htmlFor="forgot-password-login-id">Login ID</label>
            <input
              id="forgot-password-login-id"
              type="text"
              placeholder="Email, mobile number, or username"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              data-testid="forgot-password-login-id-input"
            />
          </div>
          <button
            type="submit"
            className="auth-submit-button"
            disabled={status === 'loading'}
            data-testid="forgot-password-submit-button"
          >
            {status === 'loading' ? 'Sending…' : 'Send reset link'}
          </button>
          {error && (
            <p className="form-error" role="alert" data-testid="forgot-password-error">
              {error}
            </p>
          )}
        </form>
        <div className="auth-links">
          <span>
            Remembered it? <Link to="/login" data-testid="login-link">Log in</Link>
          </span>
        </div>
      </div>
    </div>
  );
}
