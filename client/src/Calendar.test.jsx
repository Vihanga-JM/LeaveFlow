import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import Calendar from './Calendar';

const OCTOBER = {
  month: '2026-10',
  first: '2026-10-01',
  last: '2026-10-31',
  holidays: [{ holiday_date: '2026-10-14', name: 'Test Poya Day' }],
  leave: [
    { id: 1, user_id: 2, employee_name: 'Ishara Fernando', leave_type: 'Annual',
      start_date: '2026-10-09', end_date: '2026-10-09', day_part: 'PM', days: '0.5', status: 'PENDING' },
    { id: 2, user_id: 1, employee_name: 'Ruwan Jayasuriya', leave_type: 'Casual',
      start_date: '2026-10-13', end_date: '2026-10-15', day_part: 'FULL', days: '2', status: 'APPROVED' },
  ],
};

function mockApi() {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
    const month = new URL(url, 'http://x').searchParams.get('month');
    const body = month === '2026-10' ? OCTOBER : { month, holidays: [], leave: [] };
    return { ok: true, status: 200, json: async () => body };
  });
}

const cell = (name) => screen.getByRole('gridcell', { name: new RegExp(name) });

beforeEach(() => {
  // Freeze only the clock, so "this month" is October 2026 but timers stay real.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-05T09:00:00'));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('Calendar (US-7)', () => {
  test('shows the month, the role-specific title, leave and holidays', async () => {
    mockApi();
    render(<Calendar role="MANAGER" />);

    expect(screen.getByRole('heading', { name: 'Team calendar' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'October 2026' })).toBeInTheDocument();

    expect(await screen.findByRole('gridcell', { name: /Friday 9 October.*Ishara Fernando off \(PM\), pending/ })).toBeInTheDocument();
    expect(cell('Tuesday 13 October')).toHaveAccessibleName(/Ruwan Jayasuriya off, approved/);
  });

  test('leave is not drawn on a public holiday or a weekend inside the range', async () => {
    mockApi();
    render(<Calendar role="MANAGER" />);
    await screen.findByRole('gridcell', { name: /Tuesday 13 October.*Ruwan/ });

    const holiday = cell('Wednesday 14 October');
    expect(holiday).toHaveAccessibleName(/public holiday: Test Poya Day/);
    expect(holiday).not.toHaveAccessibleName(/Ruwan/);
    expect(within(holiday).getByText('Test Poya Day')).toBeInTheDocument();
    expect(cell('Thursday 15 October')).toHaveAccessibleName(/Ruwan/);
    expect(cell('Saturday 10 October')).toHaveAccessibleName(/weekend/);
  });

  test('lists everyone off this month below the grid', async () => {
    mockApi();
    render(<Calendar role="MANAGER" />);
    const list = (await screen.findByRole('heading', { name: 'Off in October 2026' })).parentElement;
    expect(await within(list).findByText('Ishara Fernando')).toBeInTheDocument();
    expect(within(list).getByText('Ruwan Jayasuriya')).toBeInTheDocument();
    expect(within(list).getByText('PENDING')).toBeInTheDocument();

    // Holidays get their own list, so phones (where cells are too small for
    // names) still show them.
    const holidays = screen.getByRole('heading', { name: 'Public holidays in October 2026' }).parentElement;
    expect(within(holidays).getByText('Test Poya Day')).toBeInTheDocument();
  });

  test('the arrows change month and fetch it; Today comes back', async () => {
    const fetchSpy = mockApi();
    const user = userEvent.setup();
    render(<Calendar role="EMPLOYEE" />);
    expect(screen.getByRole('heading', { name: 'My calendar' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next month' }));
    expect(screen.getByRole('heading', { name: 'November 2026' })).toBeInTheDocument();
    expect(fetchSpy).toHaveBeenLastCalledWith('/api/calendar?month=2026-11', expect.anything());
    expect(await screen.findByText('No one is off this month.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Today' }));
    expect(screen.getByRole('heading', { name: 'October 2026' })).toBeInTheDocument();
  });

  test('December rolls over to January of the next year', async () => {
    mockApi();
    vi.setSystemTime(new Date('2026-12-15T09:00:00'));
    const user = userEvent.setup();
    render(<Calendar role="HR_ADMIN" />);
    expect(screen.getByRole('heading', { name: 'Company calendar' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next month' }));
    expect(screen.getByRole('heading', { name: 'January 2027' })).toBeInTheDocument();
  });
});
