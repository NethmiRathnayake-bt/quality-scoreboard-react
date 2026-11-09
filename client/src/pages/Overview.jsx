import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { HBars } from '../components/charts.jsx';
import { pad2, scoreClass } from '../util.js';

export default function Overview() {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [date, setDate] = useState(params.get('date') || '');
  const dateParam = params.get('date') || '';

  useEffect(() => {
    api('/overview' + (dateParam ? `?date=${dateParam}` : '')).then((d) => { setData(d); setDate(d.date); });
  }, [dateParam]);

  if (!data) return <div className="loading">Loading...</div>;
  const { rows, maxTotal, dates } = data;

  const count = rows.length;
  const avgPct = count && maxTotal ? Math.round(rows.reduce((s, r) => s + r.total, 0) / count / maxTotal * 100) : 0;
  const top = rows[0];
  const low = count > 1 ? rows[count - 1] : null;
  const byCat = {};
  rows.forEach((r) => (byCat[r.category] ||= []).push(r.total));
  const catItems = Object.entries(byCat).map(([cat, list]) => ({
    label: cat, pct: maxTotal ? (list.reduce((a, b) => a + b, 0) / list.length / maxTotal) * 100 : 0, note: '',
  }));

  return (
    <>
      <div className="card">
        <form className="form-row" onSubmit={(e) => { e.preventDefault(); setParams({ date }); }}>
          <label className="field">Show audits for
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <button type="submit">View</button>
          <Link className="btn ghost" to="/score-sheet">+ Enter marks</Link>
        </form>
        {dates.length > 0 && (
          <div className="chips">
            {dates.map((d) => (
              <a key={d} href={`?date=${d}`} className={`chip ${d === data.date ? 'on' : ''}`}
                 onClick={(e) => { e.preventDefault(); setParams({ date: d }); }}>{d}</a>
            ))}
          </div>
        )}
      </div>

      {!count ? (
        <div className="card"><p className="muted">No marks were entered for {data.date}.</p></div>
      ) : (
        <>
          <div className="stats">
            <div className="stat"><div className="k">Cells audited</div><div className="v">{count}</div><div className="s">{data.date}</div></div>
            <div className={`stat ${scoreClass(avgPct)}`}><div className="k">Average score</div><div className="v">{avgPct}%</div><div className="s">out of {maxTotal} per cell</div></div>
            <div className="stat good"><div className="k">Best cell</div><div className="v">{top.total}</div><div className="s">{top.area} · {top.category} · Cell {pad2(top.cellNumber)}</div></div>
            {low && <div className="stat bad"><div className="k">Needs attention</div><div className="v">{low.total}</div><div className="s">{low.area} · {low.category} · Cell {pad2(low.cellNumber)}</div></div>}
          </div>

          <div className="cards-2">
            <div className="card"><h3>Average by category</h3><HBars items={catItems} /></div>
          </div>

          <div className="card">
            <h3>Cell scores (best first)</h3>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Area</th><th>Category</th><th>Cell</th><th>Leader</th><th>Marks</th><th>Score</th><th></th></tr></thead>
                <tbody>
                  {rows.map((r, i) => {
                    const pct = maxTotal ? Math.round((r.total / maxTotal) * 100) : 0;
                    return (
                      <tr key={i}>
                        <td>{r.area}</td>
                        <td><span className={`badge ${r.category.toLowerCase()}`}>{r.category}</span></td>
                        <td><strong>{pad2(r.cellNumber)}</strong></td>
                        <td>{r.leader || '-'}</td>
                        <td><span className={`badge ${scoreClass(pct)}`}>{r.total} / {maxTotal}</span></td>
                        <td style={{ minWidth: 120 }}><div className={`bar ${scoreClass(pct)}`}><i style={{ width: `${pct}%` }} /></div></td>
                        <td><Link className="btn ghost sm" to={`/score-sheet?date=${data.date}&area_id=${r.areaId}`}>Open</Link></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  );
}
