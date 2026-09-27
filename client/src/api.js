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

  if (!res.ok) {
    throw new Error(
      data?.error?.message || `Request failed (${res.status})`
    );
  }

  return data;
}