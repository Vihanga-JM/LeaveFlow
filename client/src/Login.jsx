import { useState } from 'react';
import { api } from './api';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();

    try {
      const data = await api('/auth/login', {
        method: 'POST',
        body: { email, password }
      });

      localStorage.setItem('token', data.token);
      onLogin(data.user);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="login-page">
      <form className="card login-card" onSubmit={submit}>
        <h1>LeaveFlow</h1>
        <p className="tagline">Sign in to manage your leave.</p>

        <input
          type="email"
          aria-label="Email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
        />

        <input
          type="password"
          aria-label="Password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
        />

        <button type="submit" className="btn-primary">Sign in</button>

        {error && <p role="alert" className="alert">{error}</p>}
      </form>
    </div>
  );
}
