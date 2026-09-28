import { useEffect, useState } from 'react';
import { api } from './api';

// HR_ADMIN only: the year's public holidays, which are never deducted from balances.
export default function Holidays() {
  const year = new Date().getFullYear();
  const [holidays, setHolidays] = useState([]);
  const [form, setForm] = useState({ holiday_date: '', name: '' });
  const [error, setError] = useState(null);

  function load() {
    return api(`/holidays?year=${year}`)
      .then((rows) => {
        setHolidays(rows);
        setError(null);
      })
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    let active = true;
    api(`/holidays?year=${year}`)
      .then((rows) => active && setHolidays(rows))
      .catch((err) => active && setError(err.message));
    return () => { active = false; };
  }, [year]);

  async function add(e) {
    e.preventDefault();
    try {
      await api('/holidays', { method: 'POST', body: form });
      setForm({ holiday_date: '', name: '' });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(date) {
    try {
      await api(`/holidays/${date}`, { method: 'DELETE' });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main>
      <h2>Public holidays {year}</h2>

      {error && <p role="alert">{error}</p>}

      <form onSubmit={add}>
        <label>
          Date
          <input
            type="date"
            value={form.holiday_date}
            onChange={(e) => setForm({ ...form, holiday_date: e.target.value })}
          />
        </label>
        <label>
          Name
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>
        <button type="submit" disabled={!form.holiday_date || !form.name.trim()}>
          Add holiday
        </button>
      </form>

      {holidays.map((h) => (
        <p key={h.holiday_date}>
          {h.holiday_date} — {h.name}{' '}
          <button onClick={() => remove(h.holiday_date)} aria-label={`Delete ${h.holiday_date}`}>
            Delete
          </button>
        </p>
      ))}
    </main>
  );
}
