// Resolve the REST API base URL at build time.
// - NEXT_PUBLIC_API_URL: full override, e.g. https://api.example.com/api
// - NEXT_PUBLIC_API_HOST: just the host (e.g. injected by Render's fromService),
//   turned into https://<host>/api
// - otherwise fall back to local development.
function resolveApiBase(): string {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (url) return url.replace(/\/+$/, '');
  const host = process.env.NEXT_PUBLIC_API_HOST;
  if (host) {
    const cleanHost = host.replace(/^https?:\/\//, '').replace(/\/+$/, '');
    return `https://${cleanHost}/api`;
  }
  return 'http://localhost:8000/api';
}

const API_BASE = resolveApiBase();

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem('access_token', access);
  localStorage.setItem('refresh_token', refresh);
}

export function clearTokens() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}

async function refreshAccessToken(): Promise<string | null> {
  const refresh = localStorage.getItem('refresh_token');
  if (!refresh) return null;
  const res = await fetch(`${API_BASE}/auth/token/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  });
  if (!res.ok) {
    clearTokens();
    return null;
  }
  const data = await res.json();
  localStorage.setItem('access_token', data.access);
  if (data.refresh) localStorage.setItem('refresh_token', data.refresh);
  return data.access;
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  let token = getAccessToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    token = await refreshAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    }
  }
  return res;
}

export const API_BASE_URL = API_BASE;
// Derive the WebSocket origin from the API URL: switch http(s)->ws(s) and drop
// the trailing "/api" path so it becomes e.g. ws://host:8000 (chat routing
// lives at /ws/chat/<id>/ on the host root, not under /api).
export const WS_BASE_URL = API_BASE.replace(/^http/, 'ws').replace(/\/api\/?$/, '');
