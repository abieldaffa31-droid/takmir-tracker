import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().default(4000),
  BETTER_AUTH_SECRET: z.string().min(16),
  BETTER_AUTH_URL: z.string().url(),
  FRONTEND_URL: z.string().url(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  // Opsional: kalau diisi, magic link beneran dikirim lewat Resend.
  // Kalau kosong, tetap di-stub ke console.log (dev/testing).
  RESEND_API_KEY: z.string().optional(),
  MAIL_FROM: z.string().default("Takmir Tracker <onboarding@resend.dev>"),
});

export const env = envSchema.parse(process.env);
