import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const POLL_MS = 30000;

// Where each kind of notification takes you when clicked.
const TARGET = { SUBMITTED: 'approvals', CANCELLED: 'approvals', APPROVED: 'leave', REJECTED: 'leave' };

// "9 Mar 2026", "9–10 Mar 2026", "30 Mar – 2 Apr 2026". Dates stay strings so a
// Colombo browser never shifts them a day (see the pg type parser on the server).
function formatRange(start, end) {
  const [sy, sm, sd] = start.slice(0, 10).split('-').map(Number);
  const [ey, em, ed] = end.slice(0, 10).split('-').map(Number);
  if (start.slice(0, 10) === end.slice(0, 10)) return `${sd} ${MONTHS[sm - 1]} ${sy}`;
  if (sy === ey && sm === em) return `${sd}–${ed} ${MONTHS[sm - 1]} ${sy}`;
  if (sy === ey) return `${sd} ${MONTHS[sm - 1]} – ${ed} ${MONTHS[em - 1]} ${sy}`;
  return `${sd} ${MONTHS[sm - 1]} ${sy} – ${ed} ${MONTHS[em - 1]} ${ey}`;
}

function timeAgo(iso) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days < 7 ? `${days} d ago` : new Date(iso).toLocaleDateString();
}

function sentence(n) {
  const leave = `${n.leave_type} leave`;
  switch (n.kind) {
    case 'SUBMITTED': return `${n.actor_name} asked for ${leave}`;
    case 'CANCELLED': return `${n.actor_name} withdrew a ${leave} request`;
    case 'APPROVED': return `${n.actor_name} approved your ${leave}`;
    case 'REJECTED': return `${n.actor_name} rejected your ${leave}`;
    default: return leave;
  }
}

export default function Notifications({ onNavigate }) {
  const [data, setData] = useState({ unread: 0, items: [] });
  const [open, setOpen] = useState(false);
  const wrapper = useRef(null);

  const load = useCallback(
    () => api('/notifications')
      .then((d) => setData({ unread: d?.unread ?? 0, items: d?.items ?? [] }))
      .catch(() => {}), // the bell is a nicety: a failed poll just keeps the old list
    [],
  );

  // Poll, and refresh as soon as the tab is looked at again.
  useEffect(() => {
    load();
    const timer = setInterval(load, POLL_MS);
    window.addEventListener('focus', load);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', load);
    };
  }, [load]);

  // Close on Escape or a click outside the panel.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    const onClick = (e) => wrapper.current && !wrapper.current.contains(e.target) && setOpen(false);
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  async function choose(n) {
    setOpen(false);
    if (!n.read_at) {
      await api(`/notifications/${n.id}/read`, { method: 'PATCH' }).catch(() => {});
      load();
    }
    onNavigate(TARGET[n.kind] || 'leave');
  }

  async function markAllRead() {
    await api('/notifications/read-all', { method: 'POST' }).catch(() => {});
    load();
  }

  const { unread, items } = data;

  return (
    <div className="notif" ref={wrapper}>
      <button
        className={`bell${unread ? ' has-unread' : ''}`}
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => {
          if (!open) load();
          setOpen(!open);
        }}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path
            d="M12 3a6 6 0 0 0-6 6v3.6l-1.7 2.9A1 1 0 0 0 5.2 17h13.6a1 1 0 0 0 .9-1.5L18 12.6V9a6 6 0 0 0-6-6Zm-2.2 15.5a2.3 2.3 0 0 0 4.4 0Z"
            fill="currentColor"
          />
        </svg>
        {unread > 0 && <span className="bell-badge">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <div className="notif-panel" role="region" aria-label="Notifications">
          <div className="notif-head">
            <h3>Notifications</h3>
            <button className="btn-small" onClick={markAllRead} disabled={!unread}>
              Mark all read
            </button>
          </div>

          {items.length === 0 ? (
            <p className="notif-empty">You're all caught up.</p>
          ) : (
            <ul className="notif-list">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    className={`notif-item kind-${n.kind.toLowerCase()}${n.read_at ? '' : ' unread'}`}
                    onClick={() => choose(n)}
                  >
                    <span className="notif-icon" aria-hidden="true" />
                    <span className="notif-body">
                      <span className="notif-text">{sentence(n)}</span>
                      <span className="notif-meta">
                        {formatRange(n.start_date, n.end_date)}
                        {n.day_part && n.day_part !== 'FULL' && ` · ${n.day_part} half day`}
                        {' · '}{timeAgo(n.created_at)}
                      </span>
                      {n.kind === 'REJECTED' && n.decision_note && (
                        <span className="notif-note">“{n.decision_note}”</span>
                      )}
                    </span>
                    {!n.read_at && <span className="notif-dot" aria-label="unread" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
