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

      {error && <p role="alert" className="alert">{error}</p>}

      <form className="card inline-form" onSubmit={add}>
        <label className="field">
          Date
          <input
            type="date"
            value={form.holiday_date}
            onChange={(e) => setForm({ ...form, holiday_date: e.target.value })}
          />
        </label>
        <label className="field">
          Name
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>
        <button type="submit" className="btn-primary" disabled={!form.holiday_date || !form.name.trim()}>
          Add holiday
        </button>
      </form>

      {holidays.length > 0 && (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Holiday</th>
                <th className="right"><span className="muted">{holidays.length} days</span></th>
              </tr>
            </thead>
            <tbody>
              {holidays.map((h) => (
                <tr key={h.holiday_date}>
                  <td>{h.holiday_date}</td>
                  <td className="wrap">{h.name}</td>
                  <td className="right">
                    <button
                      className="btn-danger btn-small"
                      onClick={() => remove(h.holiday_date)}
                      aria-label={`Delete ${h.holiday_date}`}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
