export function ok<T>(data: T, meta?: Record<string, unknown>) {
  return { data, ...(meta ? { meta } : {}) };
}

export function created<T>(data: T, meta?: Record<string, unknown>) {
  return ok(data, meta);
}
