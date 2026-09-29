import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi, afterEach } from 'vitest';
import App from './App';

// Found in demo rehearsal: two tabs share one token, so after signing in as
// Dilini in tab B, tab A still said "Ishara" while every request went out as
// Dilini. Tabs must follow the shared login.

const ISHARA = { id: 2, name: 'Ishara Fernando', role: 'EMPLOYEE' };
const DILINI = { id: 3, name: 'Dilini Weerasinghe', email: 'dilini@ceylonroots.lk', role: 'HR_ADMIN' };

function mockApi() {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => ({
    ok: true,
    status: 200,
    json: async () => {
      if (url.endsWith('/auth/login')) return { token: 'ishara-token', user: ISHARA };
      if (url.endsWith('/me')) return DILINI;
      return [];
    },
  }));
}

async function signInAsIshara() {
  const user = userEvent.setup();
  render(<App />);
  await user.type(screen.getByPlaceholderText('Email'), 'ishara@ceylonroots.lk');
  await user.type(screen.getByPlaceholderText('Password'), 'password123');
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
  expect(await screen.findByText('Ishara Fernando')).toBeInTheDocument();
}

function otherTabSetsToken(value) {
  act(() => {
    window.dispatchEvent(new StorageEvent('storage', { key: 'token', newValue: value }));
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('login shared across tabs', () => {
  test('signing in as someone else in another tab switches this tab to them', async () => {
    mockApi();
    await signInAsIshara();

    otherTabSetsToken('dilini-token');

    expect(await screen.findByText('Dilini Weerasinghe')).toBeInTheDocument();
    expect(screen.queryByText('Ishara Fernando')).not.toBeInTheDocument();
  });

  test('signing out in another tab signs this tab out too', async () => {
    mockApi();
    await signInAsIshara();

    otherTabSetsToken(null);

    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });
});
