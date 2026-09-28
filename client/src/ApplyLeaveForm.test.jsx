import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi, afterEach } from 'vitest';
import ApplyLeaveForm from './ApplyLeaveForm';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ApplyLeaveForm', () => {
  test('submit stays disabled until both dates are valid', async () => {
    const user = userEvent.setup();
    render(<ApplyLeaveForm onCreated={() => {}} />);

    const submit = screen.getByRole('button', { name: /apply/i });
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText(/start date/i), '2026-03-02');
    expect(submit).toBeDisabled(); // end date still missing

    await user.type(screen.getByLabelText(/end date/i), '2026-03-06');
    expect(submit).toBeEnabled();
  });

  test('an end date before the start date keeps submit disabled and explains why', async () => {
    const user = userEvent.setup();
    render(<ApplyLeaveForm onCreated={() => {}} />);

    await user.type(screen.getByLabelText(/start date/i), '2026-03-06');
    await user.type(screen.getByLabelText(/end date/i), '2026-03-02');

    expect(screen.getByRole('button', { name: /apply/i })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent(/before start date/i);
  });

  test('a half day pins the end date to the start date and sends day_part', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ id: 1 }),
    });
    const user = userEvent.setup();
    render(<ApplyLeaveForm onCreated={() => {}} />);

    await user.selectOptions(screen.getByLabelText(/duration/i), 'PM');
    const end = screen.getByLabelText(/end date/i);
    expect(end).toBeDisabled();

    await user.type(screen.getByLabelText('Date', { exact: true }), '2026-10-09');
    expect(end).toHaveValue('2026-10-09');

    await user.click(screen.getByRole('button', { name: /apply/i }));
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body).toMatchObject({ day_part: 'PM', start_date: '2026-10-09', end_date: '2026-10-09' });
  });

  test('shows the API error message when the server refuses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ error: { code: 'INSUFFICIENT_BALANCE', message: 'Insufficient balance' } }),
    });
    const onCreated = vi.fn();
    const user = userEvent.setup();
    render(<ApplyLeaveForm onCreated={onCreated} />);

    await user.type(screen.getByLabelText(/start date/i), '2026-03-02');
    await user.type(screen.getByLabelText(/end date/i), '2026-03-06');
    await user.click(screen.getByRole('button', { name: /apply/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Insufficient balance');
    expect(onCreated).not.toHaveBeenCalled();
  });
});
