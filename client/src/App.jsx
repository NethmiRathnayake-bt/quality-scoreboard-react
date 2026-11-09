import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import Layout from './components/Layout.jsx';
import SignIn from './pages/SignIn.jsx';
import Join from './pages/Join.jsx';
import Overview from './pages/Overview.jsx';
import ScoreSheet from './pages/ScoreSheet.jsx';
import Leaderboard from './pages/Leaderboard.jsx';
import Analysis from './pages/Analysis.jsx';
import MyScores from './pages/MyScores.jsx';
import Leaders from './pages/Leaders.jsx';
import Cells from './pages/Cells.jsx';
import Accounts from './pages/Accounts.jsx';

const STAFF = ['admin', 'auditor'];

// Only signed-in users get past this. Others go to /signin.
function Protected({ allow, children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Loading...</div>;
  if (!user) return <Navigate to="/signin" replace />;
  if (allow && !allow.includes(user.role)) return <Navigate to="/" replace />;
  return <Layout>{children}</Layout>;
}

// "/" sends each role to its own first page.
function Home() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Loading...</div>;
  if (!user) return <Navigate to="/signin" replace />;
  return <Navigate to={user.role === 'leader' ? '/my-scores' : '/overview'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/signin" element={<SignIn />} />
      <Route path="/join" element={<Join />} />
      <Route path="/overview" element={<Protected allow={STAFF}><Overview /></Protected>} />
      <Route path="/score-sheet" element={<Protected allow={STAFF}><ScoreSheet /></Protected>} />
      <Route path="/analysis" element={<Protected allow={STAFF}><Analysis /></Protected>} />
      <Route path="/leaderboard" element={<Protected><Leaderboard /></Protected>} />
      <Route path="/my-scores" element={<Protected allow={['leader']}><MyScores /></Protected>} />
      <Route path="/team-leaders" element={<Protected allow={['admin']}><Leaders /></Protected>} />
      <Route path="/work-cells" element={<Protected allow={['admin']}><Cells /></Protected>} />
      <Route path="/accounts" element={<Protected allow={['admin']}><Accounts /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
