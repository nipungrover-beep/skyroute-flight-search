import { useState } from 'react';
import { Link } from 'react-router-dom';
import { login } from '../api/client.js';

export default function LoginPage() {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!loginId || !password) {
      setError('Enter your login ID and password.');
      setStatus('idle');
      return;
    }

    setStatus('loading');
    setError('');
    try {
      const data = await login({ loginId, password });
      setUser(data);
      setStatus('success');
    } catch (err) {
      setError(err.message);
      setStatus('idle');
    }
  }

  if (status === 'success' && user) {
    return (
      <div className="auth-page">
        <div className="auth-card" data-testid="login-success">
          <h1>Welcome back</h1>
          <p>
            Logged in as <strong>{user.username ?? user.email}</strong> ({user.email})
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Log in</h1>
        <form className="auth-form" onSubmit={handleSubmit} data-testid="login-form">
          <div className="field">
            <label htmlFor="login-id">Login ID</label>
            <input
              id="login-id"
              type="text"
              placeholder="Email, mobile number, or username"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              data-testid="login-id-input"
            />
          </div>
          <div className="field">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              data-testid="login-password-input"
            />
          </div>
          <button
            type="submit"
            className="auth-submit-button"
            disabled={status === 'loading'}
            data-testid="login-submit-button"
          >
            {status === 'loading' ? 'Logging in…' : 'Log in'}
          </button>
          {error && (
            <p className="form-error" role="alert" data-testid="login-error">
              {error}
            </p>
          )}
        </form>
        <div className="auth-links">
          <Link to="/forgot-password" data-testid="forgot-password-link">
            Forgot password?
          </Link>
          <span className="auth-links-sep">·</span>
          <span>
            New here? <Link to="/signup" data-testid="signup-link">Sign up</Link>
          </span>
        </div>
      </div>
    </div>
  );
}
