import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useToast } from '../AuthContext.jsx';
import { pad2 } from '../util.js';

const today = () => new Date().toISOString().slice(0, 10);

// colour a mark box: green 90%+, amber 60%+, red below
const markClass = (v, max) => {
  if (v === '' || v == null || Number.isNaN(Number(v))) return '';
  const r = Number(v) / max;
  return r >= 0.9 ? 'v-high' : r >= 0.6 ? 'v-mid' : 'v-low';
};

export default function ScoreSheet() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [areas, setAreas] = useState([]);
  const [date, setDate] = useState(params.get('date') || today());
  const [areaId, setAreaId] = useState(params.get('area_id') || '');
  const [sheet, setSheet] = useState(null);
  const [form, setForm] = useState({});     // what is typed in the boxes
  const [errors, setErrors] = useState([]);
  const [saving, setSaving] = useState(false);

  const qDate = params.get('date') || today();
  const qArea = params.get('area_id') || '';

  useEffect(() => { api('/meta').then((m) => setAreas(m.areas)); }, []);

  // load the sheet whenever the date / area in the address changes
  useEffect(() => {
    setErrors([]);
    if (!qArea) { setSheet(null); return; }
    api(`/sheet?date=${qDate}&area_id=${qArea}`).then((d) => {
      setSheet(d);
      const f = {};
      d.cells.forEach((c) => {
        const marks = {};
        d.criteria.forEach((cr) => { const v = d.scores[c.id]?.[cr.id]; marks[cr.id] = v == null ? '' : String(v); });
        f[c.id] = { leader: d.info[c.id].leader, remarks: d.info[c.id].remarks, employees: d.info[c.id].employees, marks };
      });
      setForm(f);
    });
  }, [qDate, qArea]);

  const setField = (cid, field, value) => setForm((f) => ({ ...f, [cid]: { ...f[cid], [field]: value } }));
  const setMark = (cid, crid, value) =>
    setForm((f) => ({ ...f, [cid]: { ...f[cid], marks: { ...f[cid].marks, [crid]: value } } }));

  const maxTotal = sheet ? sheet.criteria.reduce((s, c) => s + c.maxMarks, 0) : 0;
  const totals = useMemo(() => {
    const t = {};
    if (!sheet) return t;
    sheet.cells.forEach((c) => {
      t[c.id] = sheet.criteria.reduce((s, cr) => {
        const v = parseInt(form[c.id]?.marks?.[cr.id], 10);
        return s + (Number.isNaN(v) ? 0 : v);
      }, 0);
    });
    return t;
  }, [form, sheet]);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors([]);
    try {
      await api('/sheet', { method: 'POST', body: { date: qDate, areaId: Number(qArea), cells: form } });
      toast('success', `Audit saved for ${qDate}.`);
      setSheet((s) => ({ ...s, existing: true }));
    } catch (err) {
      setErrors(err.errors || [err.message]);
    } finally {
      setSaving(false);
    }
  };

  // group the cells by category for the header row
  const groups = [];
  (sheet?.cells || []).forEach((c) => {
    const last = groups[groups.length - 1];
    if (last && last.name === c.category) last.count++;
    else groups.push({ name: c.category, count: 1 });
  });

  return (
    <>
      <div className="card">
        <form className="form-row" onSubmit={(e) => { e.preventDefault(); setParams({ date, area_id: areaId }); }}>
          <label className="field">Date <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></label>
          <label className="field">Area
            <select value={areaId} onChange={(e) => setAreaId(e.target.value)} required>
              <option value="">Select area</option>
              {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </label>
          <button type="submit">Load sheet</button>
        </form>
      </div>

      {errors.map((m, i) => <div className="alert-err" key={i}>{m}</div>)}

      {sheet && sheet.areaId > 0 && sheet.cells.length === 0 && (
        <div className="card"><p className="muted">No active cells in this area yet. An admin can add them under Work cells.</p></div>
      )}

      {sheet && sheet.cells.length > 0 && (
        <form className="card" onSubmit={save}>
          <div className="sheet-wrap">
            <table className="sheet">
              <tbody>
                <tr>
                  <th className="stick" rowSpan={3}>Criteria</th>
                  {groups.map((g) => <th key={g.name} colSpan={g.count} className={`g-${g.name.toLowerCase()}`}>{g.name}</th>)}
                </tr>
                <tr>{sheet.cells.map((c) => <th key={c.id} className="cellno">Cell {pad2(c.cellNumber)}</th>)}</tr>
                <tr>
                  {sheet.cells.map((c) => (
                    <th key={c.id}>
                      <input className="emp" maxLength={6} inputMode="numeric" placeholder="Leader no."
                             value={form[c.id]?.leader ?? ''} onChange={(e) => setField(c.id, 'leader', e.target.value)} />
                    </th>
                  ))}
                </tr>

                {sheet.criteria.map((cr) => (
                  <tr key={cr.id}>
                    <td className="stick">{cr.name}</td>
                    {sheet.cells.map((c) => {
                      const v = form[c.id]?.marks?.[cr.id] ?? '';
                      return (
                        <td key={c.id}>
                          <input className={`mark ${markClass(v, cr.maxMarks)}`} type="number" min="0" max={cr.maxMarks}
                                 value={v} onChange={(e) => setMark(c.id, cr.id, e.target.value)} />
                        </td>
                      );
                    })}
                  </tr>
                ))}

                <tr className="totals">
                  <td className="stick" style={{ background: '#eef2ff' }}>Total (out of {maxTotal})</td>
                  {sheet.cells.map((c) => <td key={c.id}>{totals[c.id]}</td>)}
                </tr>
                <tr className="totals">
                  <td className="stick" style={{ background: '#eef2ff' }}>Score</td>
                  {sheet.cells.map((c) => <td key={c.id}>{maxTotal ? Math.round((totals[c.id] * 100) / maxTotal) : 0}%</td>)}
                </tr>
                <tr>
                  <td className="stick">Remarks</td>
                  {sheet.cells.map((c) => (
                    <td key={c.id}><input className="rem" maxLength={255} value={form[c.id]?.remarks ?? ''} onChange={(e) => setField(c.id, 'remarks', e.target.value)} /></td>
                  ))}
                </tr>
                <tr>
                  <td className="stick">Employees of the day<br /><span className="muted" style={{ fontWeight: 400 }}>6-digit numbers, space or new line between</span></td>
                  {sheet.cells.map((c) => (
                    <td key={c.id}>
                      <textarea className="emps" rows={5} placeholder="optional" value={form[c.id]?.employees ?? ''} onChange={(e) => setField(c.id, 'employees', e.target.value)} />
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <p style={{ margin: '16px 0 0' }}>
            <button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save audit'}</button>{' '}
            <span className="muted">The leader number is only a suggestion (the last leader of that cell). Change it if someone else worked there today. Leave a mark box empty if it was not checked.</span>
          </p>
        </form>
      )}
    </>
  );
}
