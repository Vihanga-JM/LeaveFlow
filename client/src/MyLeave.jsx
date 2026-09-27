import { useEffect, useState } from 'react';
import { api } from './api';
import ApplyLeaveForm from './ApplyLeaveForm';

export default function MyLeave() {
  const [balances, setBalances] = useState([]);
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState(null);

  async function load() {
    try {
      setError(null);

      const [balanceData, requestData] = await Promise.all([
        api('/balances'),
        api('/leave-requests')
      ]);

      setBalances(balanceData);
      setRequests(requestData);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main>
      <h2>My Leave</h2>

      {error && <p role="alert">{error}</p>}

      {balances.map((b) => (
        <p key={b.id}>
          <strong>{b.name}</strong>:{' '}
          {b.annual_allocation - b.used_days} of{' '}
          {b.annual_allocation} days left
        </p>
      ))}

      <ApplyLeaveForm onCreated={load} />

      <h3>My Requests</h3>

      {requests.map((r) => (
        <p key={r.id}>
          {r.start_date.slice(0, 10)} →{' '}
          {r.end_date.slice(0, 10)} — {r.reason}{' '}
          <em>{r.status}</em>
        </p>
      ))}
    </main>
  );
}