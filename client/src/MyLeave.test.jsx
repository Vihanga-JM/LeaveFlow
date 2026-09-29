import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi, afterEach } from 'vitest';
import MyLeave from './MyLeave';

const BALANCES = [{ id: 2, name: 'Casual', annual_allocation: 7, used_days: '0', reserved_days: '0.5' }];
const REQUESTS = [
  { id: 5, start_date: '2026-10-09', end_date: '2026-10-09', day_part: 'PM', days: '0.5', reason: 'Bank errand', status: 'PENDING' },
  { id: 4, start_date: '2026-11-20', end_date: '2026-11-20', day_part: 'FULL', days: '1', reason: 'Trip', status: 'APPROVED' },
];

function mockApi() {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => ({
    ok: true,
    status: 200,
    json: async () => (url.endsWith('/balances') ? BALANCES : url.endsWith('/leave-requests') ? REQUESTS : {}),
  }));
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('MyLeave', () => {
  test('a pending request can be cancelled from the list', async () => {
    const fetchSpy = mockApi();
    const user = userEvent.setup();
    render(<MyLeave />);

    await user.click(await screen.findByRole('button', { name: 'Cancel request 2026-10-09' }));

    const patch = fetchSpy.mock.calls.find(([, opts]) => opts?.method === 'PATCH');
    expect(patch[0]).toBe('/api/leave-requests/5');
    expect(JSON.parse(patch[1].body)).toEqual({ action: 'cancel' });
  });

  test('only PENDING requests get a Cancel button', async () => {
    mockApi();
    render(<MyLeave />);
    await screen.findByText(/Bank errand/);
    expect(screen.getAllByRole('button', { name: /^Cancel request/ })).toHaveLength(1);
  });
});
