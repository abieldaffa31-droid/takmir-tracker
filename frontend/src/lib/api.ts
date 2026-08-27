const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

export class ApiError extends Error {
  code: string
  status: number
  details?: unknown
  constructor(code: string, message: string, status: number, details?: unknown) {
    super(message)
    this.code = code
    this.status = status
    this.details = details
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  })

  if (res.status === 204) return undefined as T
  if (res.status === 304) return undefined as T

  const json = await res.json().catch(() => null)
  if (!res.ok) {
    const err = json?.error ?? { code: 'UNKNOWN', message: 'Terjadi kesalahan tak terduga' }
    throw new ApiError(err.code, err.message, res.status, err.details)
  }
  return json.data as T
}

function withQuery(path: string, params?: Record<string, string | number | boolean | undefined>) {
  if (!params) return path
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined) qs.set(k, String(v))
  const s = qs.toString()
  return s ? `${path}?${s}` : path
}

export const api = {
  get: <T,>(path: string, params?: Record<string, string | number | boolean | undefined>) =>
    request<T>(withQuery(path, params)),
  post: <T,>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: <T,>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined }),
  put: <T,>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: body !== undefined ? JSON.stringify(body) : undefined }),
  delete: <T,>(path: string) => request<T>(path, { method: 'DELETE' }),
}
