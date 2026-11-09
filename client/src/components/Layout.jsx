import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';

const TITLES = {
  '/overview': 'Overview', '/score-sheet': 'Score sheet', '/leaderboard': 'Weekly leaderboard',
  '/analysis': 'Analysis', '/my-scores': 'My scores', '/team-leaders': 'Team leaders',
  '/work-cells': 'Work cells', '/accounts': 'Accounts',
};

const Item = ({ to, icon, label }) => (
  <NavLink to={to}><span>{icon}</span>{label}</NavLink>
);

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]); // close the phone menu after choosing a page
  useEffect(() => { document.title = `${TITLES[pathname] || 'Quality Scoreboard'} · Quality Scoreboard`; }, [pathname]);

  return (
    <div className="app">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand"><span className="logo">✓</span>Quality Scoreboard</div>
        <nav className="nav">
          {user.role === 'leader' ? (
            <>
              <div className="label">My results</div>
              <Item to="/my-scores" icon="🎯" label="My scores" />
              <Item to="/leaderboard" icon="🏆" label="Leaderboard" />
            </>
          ) : (
            <>
              <div className="label">Audit</div>
              <Item to="/overview" icon="📊" label="Overview" />
              <Item to="/score-sheet" icon="🧾" label="Score sheet" />
              <Item to="/leaderboard" icon="🏆" label="Leaderboard" />
              <Item to="/analysis" icon="📈" label="Analysis" />
              {user.role === 'admin' && (
                <>
                  <div className="label">Manage</div>
                  <Item to="/team-leaders" icon="👷" label="Team leaders" />
                  <Item to="/work-cells" icon="🔲" label="Work cells" />
                  <Item to="/accounts" icon="🔑" label="Accounts" />
                </>
              )}
            </>
          )}
        </nav>
        <div className="userbox">
          <strong>{user.username}</strong>
          <small>{user.role[0].toUpperCase() + user.role.slice(1)}</small>
          <a href="#signout" onClick={(e) => { e.preventDefault(); logout(); navigate('/signin'); }}>Sign out</a>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <button className="menu-btn" onClick={() => setOpen(!open)} aria-label="Menu">☰</button>
          <h1>{TITLES[pathname] || ''}</h1>
        </header>
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
