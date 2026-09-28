import { useState } from 'react';
import { api } from './api';

export default function ApplyLeaveForm({ onCreated }) {
  const [form, setForm] = useState({
    leave_type_id: 1,
    start_date: '',
    end_date: '',
    reason: ''
  });

  const [error, setError] = useState(null);

  const update = (key) => (e) => {
    setForm({
      ...form,
      [key]: key === 'leave_type_id'
        ? Number(e.target.value)
        : e.target.value
    });
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
      setForm({ ...form, start_date: '', end_date: '', reason: '' });
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
        Start date
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
