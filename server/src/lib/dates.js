// Small date helpers. Dates are plain 'YYYY-MM-DD' text.
export function validDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function addDays(s, n) {
  const d = new Date(s + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

// Monday and Sunday of the week that contains the date.
export function weekRange(s) {
  const d = new Date(s + 'T00:00:00Z');
  const back = (d.getUTCDay() + 6) % 7; // Monday = 0
  const mon = addDays(s, -back);
  return [mon, addDays(mon, 6)];
}
