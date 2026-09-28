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

      {error && <p role="alert" className="alert">{error}</p>}

      {requests.length === 0 && !error && <p className="empty">No leave requests yet.</p>}

      {requests.length > 0 && (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Type</th>
                <th>Dates</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id}>
                  <td><strong>{r.employee_name}</strong></td>
                  <td>{r.leave_type}</td>
                  <td>{r.start_date.slice(0, 10)} → {r.end_date.slice(0, 10)}</td>
                  <td><span className={`badge badge-${r.status.toLowerCase()}`}>{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
