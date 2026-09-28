import { useEffect, useState } from 'react';
import Login from './Login';
import MyLeave from './MyLeave';
import Approvals from './Approvals';
import AllRequests from './AllRequests';

export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('leave');

  useEffect(() => {
    const onLogout = () => setUser(null);
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

        <button
          onClick={() => {
            localStorage.removeItem('token');
            setUser(null);
          }}
        >
          Sign out
        </button>
      </nav>

      {page === 'approvals' && <Approvals />}
      {page === 'all' && <AllRequests />}
      {page === 'leave' && <MyLeave />}
    </>
  );
}
