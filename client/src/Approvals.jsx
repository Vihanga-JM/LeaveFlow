import { useEffect, useState } from 'react';
import { api } from './api';

export default function Approvals() {
  const [pending, setPending] = useState([]);
  const [error, setError] = useState(null);

  async function load() {
    try {
      setError(null);
      const data = await api('/team/requests');
      setPending(data);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function decide(id, action) {
    try {
      await api(`/leave-requests/${id}`, {
        method: 'PATCH',
        body: { action }
      });

      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main>
      <h2>Approvals</h2>

      {error && <p role="alert">{error}</p>}

      {pending.length === 0 && (
        <p>No pending requests.</p>
      )}

      {pending.map((r) => (
        <p key={r.id}>
          <strong>{r.employee_name}</strong> —{' '}
          {r.start_date.slice(0, 10)} to{' '}
          {r.end_date.slice(0, 10)} ({r.reason}){' '}

          <button onClick={() => decide(r.id, 'approve')}>
            Approve
          </button>

          <button onClick={() => decide(r.id, 'reject')}>
            Reject
          </button>
        </p>
      ))}
    </main>
  );
}