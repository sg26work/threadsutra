export async function apiGet<T = any>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error('Request failed');
  return res.json();
}

export async function apiSend<T = any>(path: string, method: string, body: any): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => null);
    throw new Error(error?.error || 'Request failed');
  }
  return res.json();
}

export const money = (n: number) =>
  '\u20b9' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
