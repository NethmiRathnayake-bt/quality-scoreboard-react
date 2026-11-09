export const pad2 = (n) => String(n).padStart(2, '0');
export const scoreClass = (pct) => (pct >= 90 ? 'good' : pct >= 70 ? 'ok' : 'bad');
export const colorFor = (pct) => (pct >= 90 ? '#16a34a' : pct >= 70 ? '#d97706' : '#dc2626');
export const r1 = (n) => Math.round(n * 10) / 10;
export const weekday = (s) =>
  new Date(s + 'T00:00:00Z').toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
