import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useToast } from '../AuthContext.jsx';

export default function Leaders() {
  const toast = useToast();
  const [list, setList] = useState(null);
  const [emp, setEmp] = useState('');

  const load = () => api('/admin/leaders').then(setList);
  useEffect(() => { load(); }, []);

  // run an admin action, show its message, then reload the list
  const run = async (fn) => {
    try { const r = await fn(); toast('success', r.message); load(); return true; }
    catch (e) { toast('error', e.message); return false; }
  };

  const add = async (e) => {
    e.preventDefault();
    if (await run(() => api('/admin/leaders', { method: 'POST', body: { employee_number: emp } }))) setEmp('');
  };

  if (!list) return <div className="loading">Loading...</div>;
  return (
    <>
      <div className="card">
        <h3>Add a leader</h3>
        <form className="form-row" onSubmit={add}>
          <label className="field">Employee number (6 digits)
            <input value={emp} onChange={(e) => setEmp(e.target.value)} maxLength={6} pattern="\d{6}" inputMode="numeric" required />
          </label>
          <button type="submit">Add leader</button>
        </form>
      </div>
      <div className="card">
        <h3>All leaders ({list.length})</h3>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Employee number</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {list.map((l) => (
                <tr key={l.id}>
                  <td><strong>{l.employee_number}</strong></td>
                  <td><span className={`badge ${l.is_active ? 'good' : 'off'}`}>{l.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td><button className="btn ghost sm" onClick={() => run(() => api(`/admin/leaders/${l.id}/toggle`, { method: 'POST' }))}>{l.is_active ? 'Deactivate' : 'Activate'}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
