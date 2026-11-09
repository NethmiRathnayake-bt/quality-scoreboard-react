import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { Columns, Donut, HBars, LineChart } from '../components/charts.jsx';
import { r1, scoreClass } from '../util.js';

const PALETTE = { Gangs: '#16a34a', Socket: '#ea580c', Overall: '#4f46e5' };
const addDays = (s, n) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

export default function Analysis() {
  const [params, setParams] = useSearchParams();
  const [meta, setMeta] = useState({ areas: [], categories: [] });
  const [data, setData] = useState(null);
  const [form, setForm] = useState({ from: '', to: '', area_id: '0', category_id: '0' });
  const qs = params.toString();

  useEffect(() => { api('/meta').then(setMeta); }, []);
  useEffect(() => {
    api('/analysis' + (qs ? `?${qs}` : '')).then((d) => {
      setData(d);
      setForm({ from: d.from, to: d.to, area_id: String(d.areaId), category_id: String(d.categoryId) });
    });
  }, [qs]);

  if (!data) return <div className="loading">Loading...</div>;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const apply = (over = {}) => setParams({ ...form, ...over });
  const quick = (days) => apply({ from: addDays(data.defTo, -(days - 1)), to: data.defTo });

  return (
    <>
      <div className="card no-print">
        <form className="form-row" onSubmit={(e) => { e.preventDefault(); apply(); }}>
          <label className="field">From <input type="date" value={form.from} onChange={set('from')} /></label>
          <label className="field">To <input type="date" value={form.to} onChange={set('to')} /></label>
          <label className="field">Area
            <select value={form.area_id} onChange={set('area_id')}>
              <option value="0">All areas</option>
              {meta.areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </label>
          <label className="field">Category
            <select value={form.category_id} onChange={set('category_id')}>
              <option value="0">All categories</option>
              {meta.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <button type="submit">Apply</button>
          <button type="button" className="btn ghost" onClick={() => window.print()}>🖨 Print / Save as PDF</button>
        </form>
        <div className="chips">
          {[[7, 'Last 7 days'], [30, 'Last 30 days'], [90, 'Last 90 days']].map(([n, label]) => (
            <a key={n} className="chip" href="#range" onClick={(e) => { e.preventDefault(); quick(n); }}>{label}</a>
          ))}
        </div>
      </div>

      {!data.count ? (
        <div className="card"><p className="muted">No marks found between {data.from} and {data.to} for this selection. Try a wider date range.</p></div>
      ) : (
        <>
          <div className="stats">
            <div className={`stat ${scoreClass(data.overall)}`}><div className="k">Average score</div><div className="v">{r1(data.overall)}%</div><div className="s">{data.count} cell results · {data.days} day(s)</div></div>
            <div className="stat good"><div className="k">Best day</div><div className="v">{Math.round(data.bestDay.pct)}%</div><div className="s">{data.bestDay.date}</div></div>
            <div className="stat bad"><div className="k">Lowest day</div><div className="v">{Math.round(data.lowDay.pct)}%</div><div className="s">{data.lowDay.date}</div></div>
            <div className="stat"><div className="k">Excellent results (90%+)</div><div className="v">{Math.round((data.excellent / data.count) * 100)}%</div><div className="s">{data.excellent} of {data.count}</div></div>
          </div>

          <div className="card">
            <h3>Key findings</h3>
            <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>{data.insights.map((t, i) => <li key={i}>{t}</li>)}</ul>
          </div>

          <div className="card">
            <h3>Daily average score</h3>
            <LineChart labels={data.daily.labels} series={data.daily.series} colors={PALETTE} />
            <div className="legend">
              {Object.keys(data.daily.series).map((n) => <span key={n}><i style={{ background: PALETTE[n] || '#0ea5e9' }} />{n}</span>)}
            </div>
          </div>

          <div className="cards-2">
            <div className="card">
              <h3>Weekly average (each week separate)</h3>
              <Columns labels={data.weekly.labels} values={data.weekly.values} />
              <p className="muted" style={{ margin: '6px 0 0' }}>Label = Monday of the week.</p>
            </div>
            <div className="card">
              <h3>Score distribution</h3>
              <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
                <Donut parts={[['Excellent (90%+)', data.excellent, '#16a34a'], ['Good (70-89%)', data.good, '#d97706'], ['Needs work (below 70%)', data.needs, '#dc2626']]}
                       centerTop={`${Math.round((data.excellent / data.count) * 100)}%`} centerSub="excellent" />
                <div className="legend" style={{ flexDirection: 'column', alignItems: 'flex-start', margin: 0 }}>
                  <span><i style={{ background: '#16a34a' }} />Excellent 90%+ ({data.excellent})</span>
                  <span><i style={{ background: '#d97706' }} />Good 70-89% ({data.good})</span>
                  <span><i style={{ background: '#dc2626' }} />Needs work below 70% ({data.needs})</span>
                </div>
              </div>
            </div>
          </div>

          <div className="cards-2">
            <div className="card">
              <h3>Weakest criteria first</h3>
              <p className="muted" style={{ margin: '-8px 0 12px' }}>Average marks as a percentage of the maximum.</p>
              <HBars items={data.criteria.map((c) => ({ label: c.name, pct: c.pct, note: '' }))} />
            </div>
            <div className="card"><h3>Cell ranking (average score)</h3><HBars items={data.cells} /></div>
          </div>

          <div className="cards-2">
            {data.leaders.length > 0 && <div className="card"><h3>Top leaders (average score)</h3><HBars items={data.leaders} /></div>}
            {data.areaAvg.length > 1 && <div className="card"><h3>Area comparison</h3><HBars items={data.areaAvg} /></div>}
          </div>
        </>
      )}
    </>
  );
}
