import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useToast } from '../AuthContext.jsx';
import { pad2 } from '../util.js';

function SetLeader({ onSet }) {
  const [v, setV] = useState('');
  return (
    <form className="form-row" style={{ gap: 6 }} onSubmit={async (e) => { e.preventDefault(); if (await onSet(v)) setV(''); }}>
      <input value={v} onChange={(e) => setV(e.target.value)} maxLength={6} pattern="\d{6}" inputMode="numeric" placeholder="6 digits" style={{ width: 110 }} required />
      <button className="sm" type="submit">Set</button>
    </form>
  );
}

export default function Cells() {
  const toast = useToast();
  const [meta, setMeta] = useState({ areas: [], categories: [] });
  const [cells, setCells] = useState(null);
  const [f, setF] = useState({ area_id: '', category_id: '', cell_from: '', cell_to: '' });

  const load = () => api('/admin/cells').then(setCells);
  useEffect(() => {
    api('/meta').then((m) => { setMeta(m); setF((x) => ({ ...x, area_id: m.areas[0]?.id ?? '', category_id: m.categories[0]?.id ?? '' })); });
    load();
  }, []);

  const run = async (fn) => {
    try { const r = await fn(); toast('success', r.message); load(); return true; }
    catch (e) { toast('error', e.message); return false; }
  };

  if (!cells) return <div className="loading">Loading...</div>;
  return (
    <>
      <div className="card">
        <h3>Add cells</h3>
        <form className="form-row" onSubmit={(e) => { e.preventDefault(); run(() => api('/admin/cells', { method: 'POST', body: f })); }}>
          <label className="field">Area
            <select value={f.area_id} onChange={(e) => setF({ ...f, area_id: e.target.value })}>{meta.areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
          </label>
          <label className="field">Category
            <select value={f.category_id} onChange={(e) => setF({ ...f, category_id: e.target.value })}>{meta.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          </label>
          <label className="field">From cell no. <input type="number" min="1" style={{ width: 100 }} value={f.cell_from} onChange={(e) => setF({ ...f, cell_from: e.target.value })} required /></label>
          <label className="field">To cell no. (optional) <input type="number" min="1" style={{ width: 100 }} value={f.cell_to} onChange={(e) => setF({ ...f, cell_to: e.target.value })} /></label>
          <button type="submit">Add</button>
        </form>
        <p className="muted" style={{ margin: '10px 0 0' }}>Tip: enter From 1 and To 14 to add cells 1 to 14 in one go. Leaders can change from day to day, so setting a usual leader is optional. The real leader is entered on the Score sheet every day.</p>
      </div>

      <div className="card">
        <h3>All cells ({cells.length})</h3>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Area</th><th>Category</th><th>Cell</th><th>Usual leader (optional)</th><th>Change</th><th>Status</th></tr></thead>
            <tbody>
              {cells.map((c) => (
                <tr key={c.id}>
                  <td>{c.area}</td>
                  <td><span className={`badge ${c.category.toLowerCase()}`}>{c.category}</span></td>
                  <td><strong>{pad2(c.cellNumber)}</strong></td>
                  <td>{c.leader || '-'}</td>
                  <td><SetLeader onSet={(v) => run(() => api(`/admin/cells/${c.id}/leader`, { method: 'POST', body: { employee_number: v } }))} /></td>
                  <td><button className={`sm btn ${c.is_active ? 'ghost' : 'danger'}`} onClick={() => run(() => api(`/admin/cells/${c.id}/toggle`, { method: 'POST' }))}>{c.is_active ? 'Active' : 'Disabled'}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
