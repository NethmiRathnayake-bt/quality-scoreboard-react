import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken } from './api.js';

// ----- who is signed in -----
const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!getToken());

  useEffect(() => {
    if (!getToken()) return;
    api('/auth/me')
      .then((d) => setUser(d.user))
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (username, password) => {
    const d = await api('/auth/login', { method: 'POST', body: { username, password } });
    setToken(d.token);
    setUser(d.user);
  };
  const logout = () => { setToken(null); setUser(null); };

  return <AuthCtx.Provider value={{ user, loading, login, logout }}>{children}</AuthCtx.Provider>;
}

// ----- small pop-up messages (success / error) -----
const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((type, msg) => {
    const id = Date.now() + Math.random();
    setItems((l) => [...l, { id, type, msg }]);
    setTimeout(() => setItems((l) => l.filter((t) => t.id !== id)), 4500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      {items.length > 0 && (
        <div className="toasts">
          {items.map((t) => <div key={t.id} className={`toast ${t.type}`}>{t.msg}</div>)}
        </div>
      )}
    </ToastCtx.Provider>
  );
}
