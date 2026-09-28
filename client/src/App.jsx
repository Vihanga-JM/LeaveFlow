import { useEffect, useState } from 'react';
import Login from './Login';
import MyLeave from './MyLeave';
import Approvals from './Approvals';
import AllRequests from './AllRequests';
import Holidays from './Holidays';

const ROLE_LABELS = { EMPLOYEE: 'Employee', MANAGER: 'Manager', HR_ADMIN: 'HR admin' };

export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('leave');

  useEffect(() => {
    // Reset the page too, so the next person to log in on this browser
    // doesn't land on the previous user's HR/manager screen.
    const onLogout = () => {
      setUser(null);
      setPage('leave');
    };
    window.addEventListener('leaveflow:logout', onLogout);
    return () => window.removeEventListener('leaveflow:logout', onLogout);
  }, []);

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  const canApprove = user.role !== 'EMPLOYEE';
  const isHr = user.role === 'HR_ADMIN';

  const tabs = [
    { id: 'leave', label: 'My Leave', show: true },
    { id: 'approvals', label: 'Approvals', show: canApprove },
    { id: 'all', label: 'All Requests', show: isHr },
    { id: 'holidays', label: 'Holidays', show: isHr },
  ];

  return (
    <>
      <header className="topbar">
        <div className="brand">LeaveFlow</div>

        <nav className="tabs">
          {tabs.filter((t) => t.show).map((t) => (
            <button
              key={t.id}
              className={`tab${page === t.id ? ' active' : ''}`}
              aria-current={page === t.id ? 'page' : undefined}
              onClick={() => setPage(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="user">
          <span>{user.name}</span>
          <span className="role">{ROLE_LABELS[user.role] || user.role}</span>
          <button
            className="btn-small"
            onClick={() => {
              localStorage.removeItem('token');
              setUser(null);
              setPage('leave');
            }}
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="container">
        {page === 'approvals' && <Approvals />}
        {page === 'all' && <AllRequests />}
        {page === 'holidays' && <Holidays />}
        {page === 'leave' && <MyLeave />}
      </div>
    </>
  );
}
