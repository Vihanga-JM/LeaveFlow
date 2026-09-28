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

      {error && <p role="alert" className="alert">{error}</p>}

      {pending.length === 0 && (
        <p className="empty">No pending requests. Enjoy the quiet.</p>
      )}

      <div className="list">
        {pending.map((r) => (
          <p key={r.id} className="row approval">
            <span className="row-main">
              <span className="row-title">
                {r.employee_name}
                {r.day_part !== 'FULL' && <span className="chip">{r.day_part} half day</span>}
              </span>
              <span className="row-sub">
                {r.start_date.slice(0, 10)} to {r.end_date.slice(0, 10)}
                {' · '}{Number(r.days)} day{Number(r.days) === 1 ? '' : 's'} · {r.reason}
              </span>
              <TeamAbsences
                from={r.start_date.slice(0, 10)}
                to={r.end_date.slice(0, 10)}
                excludeUserId={r.user_id}
              />
            </span>

            <span className="actions">
              <button className="btn-primary" onClick={() => decide(r.id, 'approve')}>
                Approve
              </button>

              <input
                aria-label={`Rejection note for ${r.employee_name}`}
                placeholder="Reason for rejecting"
                value={notes[r.id] || ''}
                onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })}
              />

              <button
                className="btn-danger"
                onClick={() => decide(r.id, 'reject')}
                disabled={!notes[r.id]?.trim()}
              >
                Reject
              </button>
            </span>
          </p>
        ))}
      </div>
    </main>
  );
}
