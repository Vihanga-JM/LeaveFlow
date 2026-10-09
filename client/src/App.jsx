import { useEffect, useState } from 'react';
import { api } from './api';
import Login from './Login';
import MyLeave from './MyLeave';
import Approvals from './Approvals';
import AllRequests from './AllRequests';
import Holidays from './Holidays';
import Calendar from './Calendar';
import Notifications from './Notifications';

const ROLE_LABELS = { EMPLOYEE: 'Employee', MANAGER: 'Manager', HR_ADMIN: 'HR admin' };

export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('leave');
  // Bumped when a notification is clicked, so the page it opens reloads even
  // if it was already showing (e.g. My Leave right after an approval).
  const [visit, setVisit] = useState(0);

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

  useEffect(() => {
    // Every tab shares one token (localStorage is per site, not per tab). When
    // another tab signs in as someone else or signs out, follow it — otherwise
    // this tab would keep showing the old user while acting as the new one.
    const onStorage = (e) => {
      if (e.key !== 'token') return;
      setPage('leave');
      if (!e.newValue) {
        setUser(null);
        return;
      }
      api('/me').then(setUser).catch(() => setUser(null));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  const canApprove = user.role !== 'EMPLOYEE';
  const isHr = user.role === 'HR_ADMIN';

  const tabs = [
    { id: 'leave', label: 'My Leave', show: true },
    { id: 'calendar', label: 'Calendar', show: true },
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
          <Notifications
            onNavigate={(target) => {
              setPage(target);
              setVisit((v) => v + 1);
            }}
          />
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

      {/* keyed by user so a switch in another tab reloads every page's data,
          and by visit so opening a page from a notification shows fresh data */}
      <div className="container" key={`${user.id}-${visit}`}>
        {page === 'calendar' && <Calendar role={user.role} />}
        {page === 'approvals' && <Approvals />}
        {page === 'all' && <AllRequests />}
        {page === 'holidays' && <Holidays />}
        {page === 'leave' && <MyLeave />}
      </div>
    </>
  );
}
