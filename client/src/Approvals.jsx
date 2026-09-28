import { useEffect, useState } from 'react';
import { api } from './api';
import TeamAbsences from './TeamAbsences';

export default function Approvals() {
  const [pending, setPending] = useState([]);
  const [notes, setNotes] = useState({});
  const [error, setError] = useState(null);

  function load() {
    return api('/team/requests')
      .then((data) => {
        setPending(data);
        setError(null);
      })
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    let active = true;
    api('/team/requests')
      .then((data) => active && setPending(data))
      .catch((err) => active && setError(err.message));
    return () => { active = false; };
  }, []);

  async function decide(id, action) {
    try {
      await api(`/leave-requests/${id}`, {
        method: 'PATCH',
        body: { action, decision_note: notes[id] }
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
        <p>No pending requests. Enjoy the quiet.</p>
      )}

      {pending.map((r) => (
        <p key={r.id}>
          <strong>{r.employee_name}</strong> —{' '}
          {r.start_date.slice(0, 10)} to{' '}
          {r.end_date.slice(0, 10)}
          {r.day_part !== 'FULL' && <strong> {r.day_part} half day</strong>}
          {' '}· {Number(r.days)} day{Number(r.days) === 1 ? '' : 's'} ({r.reason})
          <TeamAbsences
            from={r.start_date.slice(0, 10)}
            to={r.end_date.slice(0, 10)}
            excludeUserId={r.user_id}
          />{' '}

          <button onClick={() => decide(r.id, 'approve')}>
            Approve
          </button>

          <input
            aria-label={`Rejection note for ${r.employee_name}`}
            placeholder="Reason for rejecting"
            value={notes[r.id] || ''}
            onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })}
          />

          <button
            onClick={() => decide(r.id, 'reject')}
            disabled={!notes[r.id]?.trim()}
          >
            Reject
          </button>
        </p>
      ))}
    </main>
  );
}
