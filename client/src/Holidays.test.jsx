import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi, afterEach } from 'vitest';
import Holidays from './Holidays';

// Bug hunt round 1 (BH-3): the Holidays page had no test, and a Delete button
// that removed the wrong date went unnoticed. Pin the behaviour.

const LIST = [
  { holiday_date: '2026-05-01', name: 'Vesak Full Moon Poya Day / International Labour Day' },
  { holiday_date: '2026-12-25', name: 'Christmas Day' },
];

function mockApi() {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, opts = {}) => ({
    ok: true,
    status: opts.method === 'DELETE' ? 204 : 200,
    json: async () => (opts.method === 'DELETE' ? null : LIST),
  }));
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Holidays page', () => {
  test('lists the year\'s holidays', async () => {
    mockApi();
    render(<Holidays />);
    expect(await screen.findByText(/Christmas Day/)).toBeInTheDocument();
    expect(screen.getByText(/Vesak Full Moon Poya Day/)).toBeInTheDocument();
  });

  test('Delete removes the holiday on that row, not another one', async () => {
    const fetchSpy = mockApi();
    const user = userEvent.setup();
    render(<Holidays />);

    await user.click(await screen.findByRole('button', { name: 'Delete 2026-12-25' }));

    const deleteCall = fetchSpy.mock.calls.find(([, opts]) => opts?.method === 'DELETE');
    expect(deleteCall[0]).toBe('/api/holidays/2026-12-25');
  });

  test('Add is disabled until both date and name are filled', async () => {
    mockApi();
    const user = userEvent.setup();
    render(<Holidays />);

    const add = screen.getByRole('button', { name: /add holiday/i });
    expect(add).toBeDisabled();
    await user.type(screen.getByLabelText('Date'), '2026-12-31');
    expect(add).toBeDisabled();
    await user.type(screen.getByLabelText('Name'), 'Special bank holiday');
    expect(add).toBeEnabled();
  });
});
