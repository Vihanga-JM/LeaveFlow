import { useState } from 'react';
import { api } from './api';

export default function ApplyLeaveForm({ onCreated }) {
  const [form, setForm] = useState({
    leave_type_id: 1,
    day_part: 'FULL',
    start_date: '',
    end_date: '',
    reason: ''
  });

  const [error, setError] = useState(null);

  const isHalfDay = form.day_part !== 'FULL';

  const update = (key) => (e) => {
    const value = key === 'leave_type_id' ? Number(e.target.value) : e.target.value;
    const next = { ...form, [key]: value };
    // A half day is a single date: keep the end date pinned to the start date.
    if (next.day_part !== 'FULL') next.end_date = next.start_date;
    setForm(next);
  };

  const datesValid =
    form.start_date !== '' &&
    form.end_date !== '' &&
    form.end_date >= form.start_date;

  async function submit(e) {
    e.preventDefault();

    if (!datesValid) {
      return setError('End date is before start date');
    }

    try {
      await api('/leave-requests', {
        method: 'POST',
        body: form
      });

      setError(null);
      setForm({ ...form, day_part: 'FULL', start_date: '', end_date: '', reason: '' });
      onCreated();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form onSubmit={submit}>
      <h3>Apply for Leave</h3>

      <label>
        Leave type
        <select
          value={form.leave_type_id}
          onChange={update('leave_type_id')}
        >
          <option value="1">Annual</option>
          <option value="2">Casual</option>
          <option value="3">Sick</option>
        </select>
      </label>

      <label>
        Duration
        <select
          value={form.day_part}
          onChange={update('day_part')}
        >
          <option value="FULL">Full day(s)</option>
          <option value="AM">Morning half day</option>
          <option value="PM">Afternoon half day</option>
        </select>
      </label>

      <label>
        {isHalfDay ? 'Date' : 'Start date'}
        <input
          type="date"
          value={form.start_date}
          onChange={update('start_date')}
        />
      </label>

      <label>
        End date
        <input
          type="date"
          value={form.end_date}
          onChange={update('end_date')}
          disabled={isHalfDay}
        />
      </label>

      <label>
        Reason
        <input
          value={form.reason}
          onChange={update('reason')}
        />
      </label>

      <button type="submit" disabled={!datesValid}>Apply</button>

      {form.start_date && form.end_date && !datesValid && (
        <p role="alert">End date is before start date</p>
      )}
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
