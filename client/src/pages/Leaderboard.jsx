import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, download } from '../api.js';
import { useAuth } from '../AuthContext.jsx';

const MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' };
const today = () => new Date().toISOString().slice(0, 10);

function Board({ title, rows, unit, me, limit }) {
  const shown = limit ? rows.slice(0, limit) : rows;
  const top = rows.length ? Math.max(1, rows[0].total) : 1;
  const firsts = rows.filter((r) => r.rank === 1).length;
  return (
    <div className="card">
      <h3><span className={`badge ${title.toLowerCase()}`}>{title}</span> &nbsp;{unit === 'leader' ? 'Winner board' : `Employees (${rows.length})`}</h3>
      {!shown.length ? (
        <p className="muted">{unit === 'leader' ? 'No marks for this week.' : 'No employee numbers were entered for this week.'}</p>
      ) : (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th></th><th>{unit === 'leader' ? 'Leader' : 'Employee'}</th><th>Cell(s)</th><th>Days</th><th>Total</th><th></th></tr></thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.employee_number} className={`${r.rank === 1 ? 'winner' : ''} ${me === r.employee_number ? 'me' : ''}`}>
                    <td className="rank">{MEDALS[r.rank] || r.rank}</td>
                    <td>{r.employee_number}</td>
                    <td>{r.cells}</td>
                    <td>{r.days}</td>
                    <td><strong>{r.total}</strong></td>
                    <td style={{ minWidth: 90 }}><div className="bar"><i style={{ width: `${Math.round((r.total / top) * 100)}%` }} /></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {firsts > 1 && <p className="muted">{unit === 'leader' ? `Tie for first place between ${firsts} leaders.` : `${firsts} employees are tied for first place.`}</p>}
        </>
      )}
    </div>
  );
}

export default function Leaderboard() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [areas, setAreas] = useState([]);
  const [data, setData] = useState(null);
  const [date, setDate] = useState(params.get('date') || today());
  const [showAll, setShowAll] = useState(false);
  const qs = params.toString();
  const me = user.role === 'leader' ? user.username : null;

  useEffect(() => { api('/meta').then((m) => setAreas(m.areas)); }, []);
  useEffect(() => {
    api('/leaderboard' + (qs ? `?${qs}` : '')).then((d) => { setData(d); setDate(d.date); });
  }, [qs]);

  if (!data) return <div className="loading">Loading...</div>;
  const go = (over) => setParams({ date: data.date, area_id: data.areaId, ...over });

  return (
    <>
      <div className="card">
        <form className="form-row" onSubmit={(e) => { e.preventDefault(); go({ date }); }}>
          <label className="field">Any date in the week <input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
          <label className="field">Area
            <select value={data.areaId} onChange={(e) => go({ area_id: e.target.value })}>
              {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </label>
          <button type="submit">Show</button>
          <button type="button" className="btn ghost"
                  onClick={() => download(`/leaderboard.csv?date=${data.date}&area_id=${data.areaId}`, `leaderboard_${data.start}_to_${data.end}.csv`)}>
            ⬇ Download CSV
          </button>
        </form>
        <p style={{ margin: '14px 0 0' }}>
          <button type="button" className="btn ghost sm" onClick={() => go({ date: data.prev })}>← Previous week</button>
          <strong style={{ margin: '0 10px' }}>Week: {data.start} to {data.end}</strong>
          <button type="button" className="btn ghost sm" onClick={() => go({ date: data.next })}>Next week →</button>
        </p>
        <p className="muted" style={{ margin: '8px 0 0' }}>Every week starts fresh from zero (Monday to Sunday). Marks are never added across weeks.</p>
      </div>

      <div className="cards-2">
        {data.boards.map((b) => <Board key={b.name} title={b.name} rows={b.rows} unit="leader" me={me} />)}
      </div>

      <h2 style={{ margin: '8px 0 14px', fontSize: 18 }}>Employee winners</h2>
      <p className="muted" style={{ margin: '-6px 0 14px' }}>
        Each employee gets the score of the cell they worked in that day. Totals are for this week only.{' '}
        <a href="#all" onClick={(e) => { e.preventDefault(); setShowAll(!showAll); }}>{showAll ? 'Show top 10 only' : 'Show everyone'}</a>
      </p>
      <div className="cards-2">
        {data.empBoards.map((b) => <Board key={b.name} title={b.name} rows={b.rows} unit="employee" limit={showAll ? 0 : 10} />)}
      </div>
    </>
  );
}
