// Resolve the REST API base URL at build time.
// - NEXT_PUBLIC_API_URL: full override, e.g. https://api.example.com/api
// - NEXT_PUBLIC_API_HOST: just the host (e.g. injected by Render's fromService),
//   turned into https://<host>/api
// - otherwise fall back to local development.
function resolveApiBaseEnv(): string | null {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (url) return url.replace(/\/+$/, '');
  const host = process.env.NEXT_PUBLIC_API_HOST;
  if (host) {
    const cleanHost = host.replace(/^https?:\/\//, '').replace(/\/+$/, '');
    // Render's fromService gives an internal hostname with no dots (e.g.
    // "profinder-backend-4xns"). Append .onrender.com so the browser can
    // resolve it as the public external URL.
    const fullHost = cleanHost.includes('.') ? cleanHost : `${cleanHost}.onrender.com`;
    return `https://${fullHost}/api`;
  }
  return null;
}

const API_BASE_ENV = resolveApiBaseEnv();

// Server-safe concrete API base: prefer build-time env, otherwise default
// to localhost so server-side code has a defined value during prerender.
const API_BASE = API_BASE_ENV ?? 'http://localhost:8000/api';

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
  // Determine base URL at runtime. Prefer explicit env build-time value,
  // otherwise try to detect a Render backend host when running in browser.
  let apiBase = API_BASE_ENV;
  if (!apiBase && typeof window !== 'undefined') {
    const cached = sessionStorage.getItem('profinder_api_base');
    if (cached) apiBase = cached;
    else {
      // Try a few candidate backend host patterns derived from the frontend host.
      const host = window.location.hostname; // e.g. profinder-e433.onrender.com
      const candidates: string[] = [];
      // If frontend is like name-hash.onrender.com, try name-backend-hash
      const m = host.match(/^(.*?)(-\w+)?(\.onrender\.com)$/);
      if (m) {
        const prefix = m[1];
        const hash = m[2] || '';
        const suffix = m[3];
        candidates.push(`${prefix}-backend${hash}${suffix}`);
        candidates.push(`${prefix}backend${hash}${suffix}`);
        candidates.push(`backend-${prefix}${hash}${suffix}`);
      }
      // also try a straightforward backend variant
      candidates.push(`profinder-backend${host.includes('.onrender.com') ? host.slice(host.indexOf('-')) : ''}.onrender.com`);

      // Probe each candidate for /api/health/ and pick the first working one.
      for (const c of candidates) {
        try {
          // use timeout for quick failure
          const controller = new AbortController();
          const id = setTimeout(() => controller.abort(), 2000);
          const probe = await fetch(`https://${c}/api/health/`, { method: 'GET', signal: controller.signal });
          clearTimeout(id);
          if (probe.ok) {
            apiBase = `https://${c}/api`;
            sessionStorage.setItem('profinder_api_base', apiBase);
            break;
          }
        } catch (e) {
          // ignore probe error and continue
        }
      }
    }
  }

  // Fallback to server-safe API base if nothing found (useful for local dev)
  if (!apiBase) apiBase = API_BASE;

  let token = getAccessToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res = await fetch(`${apiBase}${path}`, { ...options, headers });

  if (res.status === 401) {
    token = await refreshAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      res = await fetch(`${apiBase}${path}`, { ...options, headers });
    }
  }
  return res;
}

export const API_BASE_URL = API_BASE;
// Derive the WebSocket origin from the API URL: switch http(s)->ws(s) and drop
// the trailing "/api" path so it becomes e.g. ws://host:8000 (chat routing
// lives at /ws/chat/<id>/ on the host root, not under /api).
export const WS_BASE_URL = API_BASE.replace(/^http/, 'ws').replace(/\/api\/?$/, '');
