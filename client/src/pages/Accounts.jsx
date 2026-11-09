import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth, useToast } from '../AuthContext.jsx';

function ChangePassword({ onChange }) {
  const [v, setV] = useState('');
  return (
    <form className="form-row" style={{ gap: 6 }} onSubmit={async (e) => { e.preventDefault(); if (await onChange(v)) setV(''); }}>
      <input type="password" minLength={6} placeholder="New password" value={v} onChange={(e) => setV(e.target.value)} required />
      <button className="sm" type="submit">Change</button>
    </form>
  );
}

export default function Accounts() {
  const toast = useToast();
  const { user: me } = useAuth();
  const [list, setList] = useState(null);
  const [f, setF] = useState({ username: '', password: '', role: 'auditor' });

  const load = () => api('/admin/accounts').then(setList);
  useEffect(() => { load(); }, []);

  const run = async (fn) => {
    try { const r = await fn(); toast('success', r.message); load(); return true; }
    catch (e) { toast('error', e.message); return false; }
  };

  if (!list) return <div className="loading">Loading...</div>;
  const pending = list.filter((u) => !u.is_active && u.role === 'leader');
  const toggle = (id) => run(() => api(`/admin/accounts/${id}/toggle`, { method: 'POST' }));

  return (
    <>
      {pending.length > 0 && (
        <div className="card" style={{ borderLeft: '4px solid var(--ok)' }}>
          <h3>Waiting for approval ({pending.length})</h3>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Employee number</th><th>Requested</th><th></th></tr></thead>
              <tbody>
                {pending.map((p) => (
                  <tr key={p.id}><td><strong>{p.username}</strong></td><td>{p.created_at}</td><td><button className="sm" onClick={() => toggle(p.id)}>Approve</button></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card">
        <h3>Create account</h3>
        <form className="form-row" onSubmit={async (e) => { e.preventDefault(); if (await run(() => api('/admin/accounts', { method: 'POST', body: f }))) setF({ ...f, username: '', password: '' }); }}>
          <label className="field">Username (or 6-digit employee no. for a leader)
            <input value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} required />
          </label>
          <label className="field">Password
            <input type="password" minLength={6} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required />
          </label>
          <label className="field">Role
            <select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
              <option value="auditor">Auditor: enter marks, view reports</option>
              <option value="leader">Team leader: sees own marks only</option>
              <option value="admin">Admin: everything</option>
            </select>
          </label>
          <button type="submit">Create</button>
        </form>
        <p className="muted" style={{ margin: '10px 0 0' }}>Team leaders can also sign themselves up on the sign-in page. Their accounts appear above until you approve them.</p>
      </div>

      <div className="card">
        <h3>All accounts</h3>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Username</th><th>Role</th><th>Status</th><th>Created</th><th>Change password</th><th></th></tr></thead>
            <tbody>
              {list.map((u) => (
                <tr key={u.id}>
                  <td><strong>{u.username}</strong></td>
                  <td><span className={`badge ${u.role === 'admin' ? 'ok' : u.role === 'leader' ? 'socket' : 'good'}`}>{u.role}</span></td>
                  <td><span className={`badge ${u.is_active ? 'good' : 'off'}`}>{u.is_active ? 'Active' : 'Disabled / pending'}</span></td>
                  <td>{u.created_at}</td>
                  <td><ChangePassword onChange={(v) => run(() => api(`/admin/accounts/${u.id}/password`, { method: 'POST', body: { password: v } }))} /></td>
                  <td>{u.id !== me.id && <button className={`sm btn ${u.is_active ? 'danger' : ''}`} onClick={() => toggle(u.id)}>{u.is_active ? 'Disable' : 'Enable'}</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
