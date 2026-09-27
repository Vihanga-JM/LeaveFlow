import { useState } from 'react';
import Login from './Login';
import MyLeave from './MyLeave';
import Approvals from './Approvals';

export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('leave');

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  const canApprove = user.role !== 'EMPLOYEE';

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

        <button
          onClick={() => {
            localStorage.removeItem('token');
            setUser(null);
          }}
        >
          Sign out
        </button>
      </nav>

      {page === 'approvals' ? <Approvals /> : <MyLeave />}
    </>
  );
}