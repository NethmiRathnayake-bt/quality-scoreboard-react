// Talks to the Node server. The login token is kept in the browser (localStorage).
const BASE = 'https://quality-scoreboard-react-ufhq-2x4s4osu0-rathnayakenethmi82-3678.vercel.app/';

export const getToken = () => localStorage.getItem('qs_token');
export const setToken = (t) => (t ? localStorage.setItem('qs_token', t) : localStorage.removeItem('qs_token'));

export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* no body */ }

  if (!res.ok) {
    // token expired or account disabled: go back to the sign-in page
    if (res.status === 401 && getToken()) {
      setToken(null);
      window.location.href = '/signin';
    }
    const err = new Error(data?.error || (data?.errors || []).join(' ') || 'Something went wrong.');
    err.errors = data?.errors;
    throw err;
  }
  return data;
}

// Download a file (CSV) from a protected address.
export async function download(path, filename) {
  const res = await fetch(BASE + path, { headers: { Authorization: `Bearer ${getToken()}` } });
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
