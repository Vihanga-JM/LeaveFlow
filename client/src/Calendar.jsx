import { useEffect, useState } from 'react';
import { api } from './api';

// US-7: a month grid of who is off, with public holidays and weekends shaded.
// Visibility is decided by the API: employees see themselves, managers their
// team, HR everyone.

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const PEOPLE_COLOURS = 6;
const MAX_CHIPS = 3;

const TITLES = {
  EMPLOYEE: ['My calendar', 'Your leave and the public holidays.'],
  MANAGER: ['Team calendar', 'You and the people who report to you.'],
  HR_ADMIN: ['Company calendar', 'Everyone at Ceylon Roots.'],
};

const pad = (n) => String(n).padStart(2, '0');

function thisMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function shiftMonth(month, delta) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

function formatMonth(month) {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString('en-GB', {
    month: 'long', year: 'numeric', timeZone: 'UTC',
  });
}

function formatDay(iso) {
  return new Date(`${iso}T00:00:00Z`).toLocaleString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC',
  });
}

const firstName = (name) => name.split(' ')[0];
const colourOf = (userId) => `p${(userId % PEOPLE_COLOURS) + 1}`;
const halfLabel = (dayPart) => (dayPart === 'FULL' ? '' : `${dayPart} half day`);

// Mon-first cells for the month, padded with blanks to whole weeks.
function buildCells(month) {
  const [y, m] = month.split('-').map(Number);
  const leading = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const total = Math.ceil((leading + days) / 7) * 7;
  return Array.from({ length: total }, (_, i) => {
    const day = i - leading + 1;
    if (day < 1 || day > days) return null;
    return { day, iso: `${month}-${pad(day)}`, weekend: i % 7 >= 5 };
  });
}

export default function Calendar({ role = 'EMPLOYEE' }) {
  const [month, setMonth] = useState(thisMonth);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    api(`/calendar?month=${month}`)
      .then((d) => {
        if (!active) return;
        setData(d);
        setError(null);
      })
      .catch((err) => active && setError(err.message));
    return () => { active = false; };
  }, [month]);

  const [title, subtitle] = TITLES[role] || TITLES.EMPLOYEE;
  const holidays = Object.fromEntries((data?.holidays || []).map((h) => [h.holiday_date, h.name]));
  const leave = data?.month === month ? data.leave : [];
  const people = [...new Map(leave.map((l) => [l.user_id, l.employee_name])).entries()];
  const todayIso = today();

  // Leave is only drawn on days it actually takes: not weekends or holidays.
  const offOn = (cell) =>
    cell.weekend || holidays[cell.iso]
      ? []
      : leave.filter((l) => l.start_date <= cell.iso && l.end_date >= cell.iso);

  return (
    <main>
      <h2 className="page-title">{title}</h2>
      <p className="page-subtitle">{subtitle}</p>

      {error && <p role="alert" className="alert">{error}</p>}

      <div className="card cal">
        <div className="cal-toolbar">
          <button className="btn-small" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month">‹</button>
          <h3 className="cal-month" aria-live="polite">{formatMonth(month)}</h3>
          <button className="btn-small" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Next month">›</button>
          <button className="btn-small cal-today-btn" onClick={() => setMonth(thisMonth())} disabled={month === thisMonth()}>
            Today
          </button>
        </div>

        <div className="cal-grid" role="grid" aria-label={`Leave in ${formatMonth(month)}`}>
          {WEEKDAYS.map((d, i) => (
            <div key={d} className={`cal-weekday${i >= 5 ? ' weekend' : ''}`} role="columnheader">{d}</div>
          ))}

          {buildCells(month).map((cell, i) => {
            if (!cell) return <div key={`blank-${i}`} className="cal-cell outside" aria-hidden="true" />;
            const holiday = holidays[cell.iso];
            const off = offOn(cell);
            const label = [
              formatDay(cell.iso),
              holiday && `public holiday: ${holiday}`,
              cell.weekend && 'weekend',
              ...off.map((l) => `${l.employee_name} off${l.day_part !== 'FULL' ? ` (${l.day_part})` : ''}, ${l.status.toLowerCase()}`),
            ].filter(Boolean).join('; ');

            return (
              <div
                key={cell.iso}
                role="gridcell"
                aria-label={label}
                className={[
                  'cal-cell',
                  cell.weekend && 'weekend',
                  holiday && 'holiday',
                  cell.iso === todayIso && 'today',
                ].filter(Boolean).join(' ')}
              >
                <span className="cal-day">{cell.day}</span>
                {holiday && <span className="cal-holiday" title={holiday}>{holiday}</span>}
                {off.length > 0 && (
                  <ul className="cal-chips">
                    {off.slice(0, MAX_CHIPS).map((l) => (
                      <li
                        key={l.id}
                        className={`cal-chip ${colourOf(l.user_id)}${l.status === 'PENDING' ? ' pending' : ''}`}
                        title={[l.employee_name, l.leave_type, halfLabel(l.day_part), l.status].filter(Boolean).join(' · ')}
                      >
                        <span className="cal-chip-name">{firstName(l.employee_name)}</span>
                        {l.day_part !== 'FULL' && <span className="cal-half">{l.day_part}</span>}
                      </li>
                    ))}
                    {off.length > MAX_CHIPS && <li className="cal-more">+{off.length - MAX_CHIPS} more</li>}
                  </ul>
                )}
              </div>
            );
          })}
        </div>

        <div className="cal-legend" aria-label="Legend">
          <span><i className="swatch approved" /> Approved</span>
          <span><i className="swatch pending" /> Pending</span>
          <span><i className="swatch holiday" /> Public holiday</span>
          <span><i className="swatch weekend" /> Weekend</span>
          <span><i className="swatch today" /> Today</span>
          {people.map(([id, name]) => (
            <span key={id}><i className={`swatch person ${colourOf(id)}`} /> {name}</span>
          ))}
        </div>
      </div>

      <section className="section">
        <h3>Off in {formatMonth(month)}</h3>
        {leave.length === 0 && <p className="empty">No one is off this month.</p>}
        <div className="list">
          {leave.map((l) => (
            <p key={l.id} className="row">
              <span className={`swatch person ${colourOf(l.user_id)}`} aria-hidden="true" />
              <span className="row-main">
                <span className="row-title">{l.employee_name}</span>
                <span className="row-sub">
                  {l.leave_type} · {l.start_date} → {l.end_date}
                  {l.day_part !== 'FULL' && ` (${halfLabel(l.day_part)})`} · {Number(l.days)} day{Number(l.days) === 1 ? '' : 's'}
                </span>
              </span>
              <span className={`badge badge-${l.status.toLowerCase()}`}>{l.status}</span>
            </p>
          ))}
        </div>
      </section>

      {data?.month === month && data.holidays.length > 0 && (
        <section className="section">
          <h3>Public holidays in {formatMonth(month)}</h3>
          <div className="list">
            {data.holidays.map((h) => (
              <p key={h.holiday_date} className="row">
                <span className="swatch holiday" aria-hidden="true" />
                <span className="row-main">
                  <span className="row-title">{h.name}</span>
                  <span className="row-sub">{formatDay(h.holiday_date)} · not counted against anyone&apos;s balance</span>
                </span>
              </p>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
