import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

export default function Join() {
  const [emp, setEmp] = useState('');
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (pass !== pass2) return setError('The two passwords do not match.');
    try {
      await api('/auth/join', { method: 'POST', body: { employee_number: emp.trim(), password: pass } });
      setDone(true);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Team leader sign-up</h1>
        <p>Create your account to see your daily and weekly audit marks.</p>
        {done ? (
          <>
            <div className="ok-box">Request sent. You can sign in after an admin approves your account.</div>
            <Link className="btn" style={{ display: 'block', textAlign: 'center' }} to="/signin">Back to sign in</Link>
          </>
        ) : (
          <>
            {error && <div className="alert-err">{error}</div>}
            <form onSubmit={submit}>
              <input placeholder="Employee number (6 digits)" maxLength={6} inputMode="numeric" pattern="\d{6}" value={emp} onChange={(e) => setEmp(e.target.value)} required autoFocus />
              <input type="password" placeholder="Choose a password" minLength={6} value={pass} onChange={(e) => setPass(e.target.value)} required />
              <input type="password" placeholder="Repeat the password" minLength={6} value={pass2} onChange={(e) => setPass2(e.target.value)} required />
              <p className="hint">Your employee number is your username.</p>
              <button type="submit">Request access</button>
            </form>
            <p style={{ margin: '16px 0 0', textAlign: 'center' }}><Link to="/signin">Already have an account? Sign in</Link></p>
          </>
        )}
      </div>
    </div>
  );
}
