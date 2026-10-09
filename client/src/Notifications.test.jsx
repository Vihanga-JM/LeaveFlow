import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import Notifications from './Notifications';

const ITEMS = [
  { id: 2, kind: 'REJECTED', read_at: null, created_at: '2026-10-05T08:55:00Z',
    actor_name: 'Ruwan Jayasuriya', employee_name: 'Ishara Fernando', leave_type: 'Casual',
    start_date: '2026-10-13', end_date: '2026-10-15', day_part: 'FULL', decision_note: 'Release week' },
  { id: 1, kind: 'APPROVED', read_at: '2026-10-04T10:00:00Z', created_at: '2026-10-03T09:00:00Z',
    actor_name: 'Ruwan Jayasuriya', employee_name: 'Ishara Fernando', leave_type: 'Annual',
    start_date: '2026-10-09', end_date: '2026-10-09', day_part: 'PM', decision_note: null },
];

// A tiny fake server: GET returns the current state, PATCH/POST mark things read.
function mockApi(state = { unread: 1, items: ITEMS }) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, opts = {}) => {
    if (opts.method === 'POST' || opts.method === 'PATCH') {
      state = { unread: 0, items: state.items.map((n) => ({ ...n, read_at: n.read_at || 'now' })) };
      return { ok: true, status: 204, json: async () => null };
    }
    return { ok: true, status: 200, json: async () => state };
  });
}

beforeEach(() => {
  // Freeze only the clock so "5 min ago" is stable but timers stay real.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-05T09:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('Notifications (US-8)', () => {
  test('the bell shows the unread count and the panel says what happened', async () => {
    mockApi();
    const user = userEvent.setup();
    render(<Notifications onNavigate={() => {}} />);

    await user.click(await screen.findByRole('button', { name: 'Notifications, 1 unread' }));

    expect(screen.getByText('Ruwan Jayasuriya rejected your Casual leave')).toBeInTheDocument();
    expect(screen.getByText(/13–15 Oct 2026 · 5 min ago/)).toBeInTheDocument();
    expect(screen.getByText('“Release week”')).toBeInTheDocument();
    expect(screen.getByText('Ruwan Jayasuriya approved your Annual leave')).toBeInTheDocument();
    expect(screen.getByText(/9 Oct 2026 · PM half day · 2 d ago/)).toBeInTheDocument();
  });

  test('clicking a notification marks it read and opens the right page', async () => {
    const fetch = mockApi();
    const onNavigate = vi.fn();
    const user = userEvent.setup();
    render(<Notifications onNavigate={onNavigate} />);

    await user.click(await screen.findByRole('button', { name: /1 unread/ }));
    await user.click(screen.getByText('Ruwan Jayasuriya rejected your Casual leave'));

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/notifications/2/read'),
      expect.objectContaining({ method: 'PATCH' }),
    );
    expect(onNavigate).toHaveBeenCalledWith('leave');
    expect(await screen.findByRole('button', { name: 'Notifications' })).toBeInTheDocument();
  });

  test('a new request takes a manager to Approvals', async () => {
    mockApi({ unread: 1, items: [{ ...ITEMS[0], id: 3, kind: 'SUBMITTED', actor_name: 'Ishara Fernando' }] });
    const onNavigate = vi.fn();
    const user = userEvent.setup();
    render(<Notifications onNavigate={onNavigate} />);

    await user.click(await screen.findByRole('button', { name: /1 unread/ }));
    await user.click(screen.getByText('Ishara Fernando asked for Casual leave'));
    expect(onNavigate).toHaveBeenCalledWith('approvals');
  });

  test('mark all read clears the badge; Escape closes the panel', async () => {
    mockApi();
    const user = userEvent.setup();
    render(<Notifications onNavigate={() => {}} />);

    await user.click(await screen.findByRole('button', { name: /1 unread/ }));
    await user.click(screen.getByRole('button', { name: 'Mark all read' }));
    expect(await screen.findByRole('button', { name: 'Notifications' })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('region', { name: 'Notifications' })).not.toBeInTheDocument();
  });

  test('an empty inbox says so', async () => {
    mockApi({ unread: 0, items: [] });
    const user = userEvent.setup();
    render(<Notifications onNavigate={() => {}} />);

    await user.click(await screen.findByRole('button', { name: 'Notifications' }));
    expect(screen.getByText("You're all caught up.")).toBeInTheDocument();
  });
});
