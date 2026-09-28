import { useEffect, useState } from 'react';
import Login from './Login';
import MyLeave from './MyLeave';
import Approvals from './Approvals';
import AllRequests from './AllRequests';
import Holidays from './Holidays';

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

  return (
    <>
      <nav>
        <strong>LeaveFlow</strong> — {user.name}

        <button onClick={() => setPage('leave')}>
          My Leave
        </button>

        {canApprove && (
          <button onClick={() => setPage('approvals')}>
            Approvals
          </button>
        )}

        {isHr && (
          <button onClick={() => setPage('all')}>
            All Requests
          </button>
        )}

        {isHr && (
          <button onClick={() => setPage('holidays')}>
            Holidays
          </button>
        )}

        <button
          onClick={() => {
            localStorage.removeItem('token');
            setUser(null);
            setPage('leave');
          }}
        >
          Sign out
        </button>
      </nav>

      {page === 'approvals' && <Approvals />}
      {page === 'all' && <AllRequests />}
      {page === 'holidays' && <Holidays />}
      {page === 'leave' && <MyLeave />}
    </>
  );
}
