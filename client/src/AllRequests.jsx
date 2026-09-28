import { useEffect, useState } from 'react';
import { api } from './api';

export default function AllRequests() {
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    api('/admin/requests').then(setRequests).catch((err) => setError(err.message));
  }, []);

  return (
    <main>
      <h2>All Requests</h2>

      {error && <p role="alert">{error}</p>}

      {requests.map((r) => (
        <p key={r.id}>
          <strong>{r.employee_name}</strong> — {r.leave_type}:{' '}
          {r.start_date.slice(0, 10)} → {r.end_date.slice(0, 10)}{' '}
          <em>{r.status}</em>
        </p>
      ))}
    </main>
  );
}
