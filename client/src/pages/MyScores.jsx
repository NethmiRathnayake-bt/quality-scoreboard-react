import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { pad2, scoreClass, weekday } from '../util.js';

export default function MyScores() {
  const [params, setParams] = useSearchParams();
  const [d, setD] = useState(null);
  const qs = params.toString();

  useEffect(() => { api('/my-scores' + (qs ? `?${qs}` : '')).then(setD); }, [qs]);
  if (!d) return <div className="loading">Loading...</div>;

  const best = d.weeks.length ? Math.max(...d.weeks.map((w) => w.total)) : 1;

  return (
    <>
      <div className="card">
        <h3>Employee {d.empNo}</h3>
        <p className="muted" style={{ margin: 0 }}>Your marks are shown week by week. Each week starts again from zero (Monday to Sunday).</p>
      </div>

      {!d.weeks.length ? (
        <div className="card"><p className="muted">No marks have been recorded for you yet.</p></div>
      ) : (
        <>
          <div className="stats">
            <div className="stat"><div className="k">Week</div><div className="v" style={{ fontSize: 18 }}>{d.start}</div><div className="s">to {d.end}</div></div>
            <div className={`stat ${scoreClass(d.avgPct)}`}><div className="k">Week total</div><div className="v">{d.weekTotal}</div><div className="s">{d.avgPct}% average per cell-day</div></div>
            <div className="stat"><div className="k">Days audited</div><div className="v">{d.dayCount}</div><div className="s">{d.daily.length} cell result(s)</div></div>
            {d.ranks.map((rk) => (
              <div className="stat good" key={rk.label}><div className="k">Rank this week</div>
                <div className="v">{rk.rank} <span className="muted" style={{ fontSize: 14 }}>of {rk.of}</span></div><div className="s">{rk.label}</div></div>
            ))}
          </div>

          <div className="cards-2">
            <div className="card">
              <h3>Daily marks (week of {d.start})</h3>
              {!d.daily.length ? <p className="muted">No marks this week.</p> : (
                <div className="table-wrap">
                  <table className="table">
                    <thead><tr><th>Day</th><th>Category</th><th>Cell</th><th>Marks</th><th>Remarks</th><th></th></tr></thead>
                    <tbody>
                      {d.daily.map((x, i) => {
                        const pct = d.maxTotal ? Math.round((x.total / d.maxTotal) * 100) : 0;
                        return (
                          <tr key={i}>
                            <td>{weekday(x.date)} {x.date}</td>
                            <td><span className={`badge ${x.category.toLowerCase()}`}>{x.category}</span></td>
                            <td><strong>{pad2(x.cellNumber)}</strong></td>
                            <td><span className={`badge ${scoreClass(pct)}`}>{x.total} / {d.maxTotal}</span></td>
                            <td>{x.remarks || ''}</td>
                            <td><a className="btn ghost sm" href="#detail" onClick={(e) => { e.preventDefault(); setParams({ week: d.start, day: x.date }); }}>Details</a></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="card">
              <h3>Weekly history</h3>
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Week</th><th>Days</th><th>Total</th><th></th></tr></thead>
                  <tbody>
                    {d.weeks.map((w) => (
                      <tr key={w.weekStart} className={w.weekStart === d.start ? 'week-sel' : ''}>
                        <td><a href="#week" onClick={(e) => { e.preventDefault(); setParams({ week: w.weekStart }); }}>{w.weekStart}</a></td>
                        <td>{w.days}</td>
                        <td><strong>{w.total}</strong></td>
                        <td style={{ minWidth: 90 }}><div className="bar"><i style={{ width: `${Math.round((w.total / Math.max(1, best)) * 100)}%` }} /></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {d.detail && d.detail.rows.length > 0 && (
            <div className="card" id="detail">
              <h3>Marks by criteria on {d.detail.day}</h3>
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Criteria</th>{d.detail.cols.map((c) => <th key={c}>{c}</th>)}</tr></thead>
                  <tbody>
                    {d.detail.rows.map((r) => (
                      <tr key={r.name}>
                        <td>{r.name}</td>
                        {d.detail.cols.map((c) => {
                          const m = r.cells[c];
                          return <td key={c}>{m == null ? '-' : <span className={`badge ${scoreClass(r.max ? (m / r.max) * 100 : 0)}`}>{m} / {r.max}</span>}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
