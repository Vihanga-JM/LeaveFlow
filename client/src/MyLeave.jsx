import { useEffect, useState } from 'react';
import { api } from './api';
import ApplyLeaveForm from './ApplyLeaveForm';

export default function MyLeave() {
  const [balances, setBalances] = useState([]);
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState(null);

  function fetchAll() {
    return Promise.all([api('/balances'), api('/leave-requests')]);
  }

  function load() {
    return fetchAll()
      .then(([balanceData, requestData]) => {
        setBalances(balanceData);
        setRequests(requestData);
        setError(null);
      })
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    let active = true;
    fetchAll()
      .then(([balanceData, requestData]) => {
        if (!active) return;
        setBalances(balanceData);
        setRequests(requestData);
      })
      .catch((err) => active && setError(err.message));
    return () => { active = false; };
  }, []);

  return (
    <main>
      <h2>My Leave</h2>

      {error && <p role="alert" className="alert">{error}</p>}

      <div className="balances">
        {balances.map((b) => {
          const left = b.annual_allocation - b.used_days;
          const pct = b.annual_allocation ? Math.max(0, (left / b.annual_allocation) * 100) : 0;
          return (
            <p key={b.id} className="card balance">
              <span className="balance-name">{b.name}</span>
              <span className="balance-left">
                <span className="big">{left}</span> of {b.annual_allocation} days left
              </span>
              {Number(b.reserved_days) > 0 && (
                <span className="balance-reserved">
                  ({Number(b.reserved_days)} reserved by pending requests)
                </span>
              )}
              <span className="meter" aria-hidden="true">
                <span style={{ width: `${pct}%` }} />
              </span>
            </p>
          );
        })}
      </div>

      <ApplyLeaveForm onCreated={load} />

      <section className="section">
        <h3>My Requests</h3>

        {requests.length === 0 && <p className="empty">No requests yet.</p>}

        <div className="list">
          {requests.map((r) => (
            <p key={r.id} className="row">
              <span className="row-main">
                <span className="row-title">
                  {r.start_date.slice(0, 10)} → {r.end_date.slice(0, 10)}
                  {r.day_part !== 'FULL' && ` (${r.day_part} half day)`}
                </span>
                <span className="row-sub">
                  {Number(r.days)} day{Number(r.days) === 1 ? '' : 's'} · {r.reason}
                </span>
              </span>
              <span className={`badge badge-${r.status.toLowerCase()}`}>{r.status}</span>

              {r.status === 'REJECTED' && r.decision_note && (
                <span className="row-note">Manager&apos;s note: {r.decision_note}</span>
              )}
            </p>
          ))}
        </div>
      </section>
    </main>
  );
}
