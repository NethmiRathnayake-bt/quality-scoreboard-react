import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';

export default function SignIn() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(username.trim(), password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Quality Scoreboard</h1>
        <p>Sign in to enter and review daily cell audits.</p>
        {error && <div className="alert-err">{error}</div>}
        <form onSubmit={submit}>
          <input placeholder="Username or employee number" value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button type="submit">Sign in</button>
        </form>
        <p style={{ margin: '16px 0 0', textAlign: 'center' }}>Team leader? <Link to="/join">Join here</Link></p>
      </div>
    </div>
  );
}
