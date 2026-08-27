import type { Request, Response, NextFunction } from "express";

type Bucket = { count: number; resetAt: number };

// Rate limit sederhana in-memory per proses. Cukup untuk skala takmir (puluhan pengguna).
// Kalau nanti dijalankan multi-instance, ganti dengan store bersama (Redis).
export function rateLimit({ windowMs, max }: { windowMs: number; max: number }) {
  const buckets = new Map<string, Bucket>();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip ?? "unknown";
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt < now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    if (bucket.count >= max) {
      return res.status(429).json({ error: { code: "RATE_LIMITED", message: "Terlalu banyak permintaan, coba lagi sebentar lagi" } });
    }
    bucket.count += 1;
    next();
  };
}
