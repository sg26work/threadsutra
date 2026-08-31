type ApiBody = { kind: 'json'; value: unknown } | { kind: 'form'; value: Record<string, unknown> };

export async function apiRequest<T = any>(path: string, method = 'GET', body?: ApiBody): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  let payload: BodyInit | undefined;
  if (body?.kind === 'json') {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body.value);
  } else if (body?.kind === 'form') {
    headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
    const form = new URLSearchParams();
    for (const [key, value] of Object.entries(body.value)) {
      if (value !== undefined && value !== null) form.set(key, String(value));
    }
    payload = form;
  }
  const response = await fetch(path, { method, headers, body: payload, credentials: 'same-origin' });
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new Error(result?.jsonMessage || result?.error || 'Request failed');
  return result as T;
}

export const apiGet = <T = any>(path: string) => apiRequest<T>(path);

export const apiSend = <T = any>(path: string, method: string, body: unknown) =>
  apiRequest<T>(path, method, { kind: 'json', value: body });

export const apiForm = <T = any>(path: string, body: Record<string, unknown>) =>
  apiRequest<T>(path, 'POST', { kind: 'form', value: body });

export const money = (n: number) =>
  '\u20b9' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
