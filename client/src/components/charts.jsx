// Charts drawn with plain SVG / HTML, so no chart library and no internet are needed.
import { colorFor } from '../util.js';

const f = (n) => n.toFixed(1);

export function LineChart({ labels, series, colors, w = 820, h = 300 }) {
  const names = Object.keys(series);
  const all = names.flatMap((n) => series[n].filter((v) => v != null));
  if (!labels.length || !all.length) return null;

  const padL = 44, padR = 16, padT = 16, padB = 34;
  let min = Math.max(0, Math.floor((Math.min(...all) - 5) / 10) * 10);
  const max = 100;
  if (min >= max) min = 0;
  const pw = w - padL - padR, ph = h - padT - padB, n = labels.length;
  const x = (i) => padL + (n === 1 ? pw / 2 : (i * pw) / (n - 1));
  const y = (v) => padT + ph - ((v - min) / (max - min)) * ph;
  const step = max - min > 50 ? 20 : 10;
  const grid = [];
  for (let g = min; g <= max; g += step) grid.push(g);
  const every = Math.max(1, Math.ceil(n / 8));

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 'auto' }} role="img">
      {grid.map((g) => (
        <g key={g}>
          <line x1={padL} x2={w - padR} y1={f(y(g))} y2={f(y(g))} stroke="#e2e8f0" />
          <text x={padL - 8} y={f(y(g) + 4)} textAnchor="end" fontSize="11" fill="#64748b">{g}%</text>
        </g>
      ))}
      {labels.map((l, i) => i % every === 0 && (
        <text key={i} x={f(x(i))} y={h - 10} textAnchor="middle" fontSize="11" fill="#64748b">{l}</text>
      ))}
      {names.map((name) => {
        const color = colors[name] || '#0ea5e9';
        const pts = series[name].map((v, i) => (v != null ? `${f(x(i))},${f(y(v))}` : null)).filter(Boolean);
        return (
          <g key={name}>
            {pts.length > 1 && <polyline fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" points={pts.join(' ')} />}
            {series[name].map((v, i) => v != null && (
              <circle key={i} cx={f(x(i))} cy={f(y(v))} r="3.5" fill={color}>
                <title>{`${name} · ${labels[i]}: ${v.toFixed(1)}%`}</title>
              </circle>
            ))}
          </g>
        );
      })}
    </svg>
  );
}

export function Columns({ labels, values, w = 480, h = 280 }) {
  const n = labels.length;
  if (!n) return null;
  const padL = 38, padR = 10, padT = 24, padB = 34;
  const pw = w - padL - padR, ph = h - padT - padB;
  const slot = pw / n, bw = Math.min(54, slot * 0.62);
  const every = Math.max(1, Math.ceil(n / 8));
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 'auto' }} role="img">
      {[0, 25, 50, 75, 100].map((g) => (
        <g key={g}>
          <line x1={padL} x2={w - padR} y1={f(padT + ph - (g / 100) * ph)} y2={f(padT + ph - (g / 100) * ph)} stroke="#e2e8f0" />
          <text x={padL - 6} y={f(padT + ph - (g / 100) * ph + 4)} textAnchor="end" fontSize="11" fill="#64748b">{g}%</text>
        </g>
      ))}
      {values.map((v, i) => {
        const bh = Math.max(1, (v / 100) * ph);
        const bx = padL + i * slot + (slot - bw) / 2;
        const by = padT + ph - bh;
        return (
          <g key={i}>
            <rect x={f(bx)} y={f(by)} width={f(bw)} height={f(bh)} rx="5" fill={colorFor(v)}>
              <title>{`${labels[i]}: ${v.toFixed(1)}%`}</title>
            </rect>
            <text x={f(bx + bw / 2)} y={f(by - 6)} textAnchor="middle" fontSize="11" fontWeight="700" fill="#1e293b">{Math.round(v)}%</text>
            {i % every === 0 && <text x={f(bx + bw / 2)} y={h - 10} textAnchor="middle" fontSize="11" fill="#64748b">{labels[i]}</text>}
          </g>
        );
      })}
    </svg>
  );
}

// parts = [[label, value, color], ...]
export function Donut({ parts, centerTop, centerSub, size = 220 }) {
  const total = parts.reduce((s, p) => s + p[1], 0);
  if (total <= 0) return null;
  const r = 80, c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg viewBox="0 0 220 220" style={{ width: size, maxWidth: '100%', height: 'auto' }} role="img">
      <circle cx="110" cy="110" r={r} fill="none" stroke="#f1f5f9" strokeWidth="28" />
      {parts.map(([label, value, color]) => {
        if (value <= 0) return null;
        const len = (value / total) * c;
        const el = (
          <circle key={label} cx="110" cy="110" r={r} fill="none" stroke={color} strokeWidth="28"
            strokeDasharray={`${f(len)} ${f(c - len)}`} strokeDashoffset={f(-offset)} transform="rotate(-90 110 110)">
            <title>{`${label}: ${value}`}</title>
          </circle>
        );
        offset += len;
        return el;
      })}
      <text x="110" y="112" textAnchor="middle" fontSize="30" fontWeight="700" fill="#1e293b">{centerTop}</text>
      <text x="110" y="134" textAnchor="middle" fontSize="12" fill="#64748b">{centerSub}</text>
    </svg>
  );
}

// items = [{label, pct, note}], a null item draws a "..." divider
export function HBars({ items }) {
  return (
    <div>
      {items.map((it, i) => it === null ? (
        <div key={i} className="muted" style={{ textAlign: 'center', margin: '6px 0' }}>...</div>
      ) : (
        <div className="hbar-row" key={i}>
          <span className="lab">{it.label}</span>
          <span className="hbar"><i style={{ width: `${Math.max(1, Math.min(100, it.pct))}%`, background: colorFor(it.pct) }} /></span>
          <strong>{Math.round(it.pct)}%</strong>
          {it.note ? <span className="muted note">{it.note}</span> : null}
        </div>
      ))}
    </div>
  );
}
