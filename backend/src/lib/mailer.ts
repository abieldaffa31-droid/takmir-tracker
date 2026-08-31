import { Resend } from "resend";
import { env } from "../config/env.js";
import { logger } from "./logger.js";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

// Titik tunggal pengiriman email. Kalau RESEND_API_KEY diisi, email beneran
// terkirim; kalau kosong, di-stub ke console.log (dev/testing) — pemanggil
// tidak perlu tahu bedanya.
export async function sendEmail({ to, subject, html, logLabel }: { to: string; subject: string; html: string; logLabel: string }) {
  if (!resend) {
    logger.info(`[${logLabel}] (email di-stub, RESEND_API_KEY belum diisi) -> ${to}: ${subject}`);
    return;
  }
  const { error } = await resend.emails.send({ from: env.MAIL_FROM, to, subject, html });
  if (error) logger.error(`[${logLabel}] Gagal kirim email ke ${to}:`, error);
}
