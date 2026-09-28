export async function api(path, options = {}) {
  const token = localStorage.getItem('token');

  const res = await fetch('/api' + path, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token && {
        Authorization: `Bearer ${token}`
      })
    },
    body: options.body
      ? JSON.stringify(options.body)
      : undefined,
  });

  const data = await res.json().catch(() => null);

  // An expired or rotated token: drop it and send the user back to Login
  // (App listens for this event). The login call itself just shows its error.
  if (res.status === 401 && path !== '/auth/login') {
    localStorage.removeItem('token');
    window.dispatchEvent(new Event('leaveflow:logout'));
  }

  if (!res.ok) {
    throw new Error(
      data?.error?.message || `Request failed (${res.status})`
    );
  }

  return data;
}
