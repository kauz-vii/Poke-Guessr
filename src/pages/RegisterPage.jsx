/**
 * RegisterPage.jsx — New account creation form with Google option
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import PokeballIcon from '../components/PokeballIcon';

/** Inline Google "G" logo SVG */
function GoogleIcon() {
  return (
    <svg className="google-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

export default function RegisterPage() {
  const navigate     = useNavigate();
  const { register, loginWithGoogle } = useAuth();
  const { showToast } = useToast();

  const [username, setUsername] = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [loading,  setLoading]  = useState(false);
  const [gLoading, setGLoading] = useState(false);
  const [error,    setError]    = useState('');

  function validate() {
    if (username.trim().length < 3)
      return 'Username must be at least 3 characters.';
    if (!/^[a-zA-Z0-9_]+$/.test(username))
      return 'Username may only contain letters, numbers, and underscores.';
    if (password.length < 6)
      return 'Password must be at least 6 characters.';
    if (password !== confirm)
      return 'Passwords do not match.';
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setLoading(true);
    try {
      await register(email.trim(), password, username.trim());
      showToast('Account created! Welcome, Trainer!', 'success');
      navigate('/game', { replace: true });
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setError('');
    setGLoading(true);
    try {
      await loginWithGoogle();
      // Supabase redirects to Google — page will navigate away automatically
    } catch (err) {
      setError(err.message || 'Google sign-in failed.');
      setGLoading(false);
    }
  }

  return (
    <div className="auth-root">
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-pokeball-wrap">
            <PokeballIcon size={56} />
          </div>
          <h1 className="auth-title">Join the Game</h1>
          <p className="auth-subtitle">Create your Trainer account</p>
        </div>

        {/* Error */}
        {error && (
          <div className="auth-error" role="alert">⚠️ {error}</div>
        )}

        {/* ── Google button (quick sign-up) ── */}
        <button
          type="button"
          className="auth-btn auth-btn-google"
          onClick={handleGoogleLogin}
          disabled={gLoading || loading}
          aria-label="Sign up with Google"
        >
          {gLoading ? (
            <span className="auth-btn-loading">
              <span className="auth-spinner auth-spinner-dark" /> Redirecting…
            </span>
          ) : (
            <>
              <GoogleIcon />
              Continue with Google
            </>
          )}
        </button>

        {/* ── Divider ── */}
        <div className="auth-divider">
          <span className="auth-divider-line" />
          <span className="auth-divider-text">or register with email</span>
          <span className="auth-divider-line" />
        </div>

        {/* ── Email registration form ── */}
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="auth-field">
            <label className="auth-label" htmlFor="reg-username">Username</label>
            <input
              id="reg-username"
              type="text"
              className="auth-input"
              placeholder="AshKetchum"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              autoFocus
              maxLength={30}
              autoComplete="username"
            />
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="reg-email">Email</label>
            <input
              id="reg-email"
              type="email"
              className="auth-input"
              placeholder="trainer@pokemon.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="reg-password">Password</label>
            <input
              id="reg-password"
              type="password"
              className="auth-input"
              placeholder="Min. 6 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="reg-confirm">Confirm Password</label>
            <input
              id="reg-confirm"
              type="password"
              className="auth-input"
              placeholder="Repeat password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            className="auth-btn auth-btn-primary"
            disabled={loading || !username || !email || !password || !confirm}
          >
            {loading ? (
              <span className="auth-btn-loading">
                <span className="auth-spinner" /> Creating account…
              </span>
            ) : '🎮 Create Account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?{' '}
          <Link className="auth-link" to="/login">Sign in</Link>
        </p>

        <Link className="auth-back" to="/">← Back to Menu</Link>
      </div>
    </div>
  );
}
