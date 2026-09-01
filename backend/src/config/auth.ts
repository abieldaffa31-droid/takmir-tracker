import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink } from "better-auth/plugins";
import { db } from "../db/index.js";
import * as schema from "../db/schema/index.js";
import { env } from "./env.js";
import { sendEmail } from "../lib/mailer.js";
import { invitationService } from "../services/invitation.service.js";
import { memberRepo } from "../repositories/member.repo.js";

// Pendaftaran bersifat undangan saja (Backend Plan §2.1): kalau emailnya
// belum terdaftar sebagai `members`, link login sengaja TIDAK dikirim/dicetak
// — tanpa membocorkan ke pemanggil apakah emailnya valid atau tidak.
async function sendLoginEmail(email: string, url: string) {
  const member = await memberRepo.byEmail(email);
  if (!member) {
    console.log(`\n[magic-link] Percobaan masuk dengan email belum terdaftar: ${email} (diabaikan)\n`);
    return;
  }

  await sendEmail({
    to: email,
    subject: "Tautan masuk Takmir Tracker",
    logLabel: "magic-link",
    url,
    html: `
      <div style="font-family:sans-serif;max-width:420px;margin:0 auto">
        <h2>Jaga masjid bareng.</h2>
        <p>Halo ${member.nickname}, klik tombol di bawah untuk masuk ke Takmir Tracker:</p>
        <p><a href="${url}" style="display:inline-block;background:#2438FF;color:#fff;padding:14px 20px;border-radius:10px;text-decoration:none;font-weight:bold">Masuk sekarang →</a></p>
        <p style="color:#888;font-size:13px">Tautan berlaku sekali pakai. Kalau bukan kamu yang minta, abaikan email ini.</p>
      </div>
    `,
  });
}

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: [env.FRONTEND_URL],
  database: drizzleAdapter(db, { provider: "pg", schema }),
  // Anggota biasa tetap cuma bisa masuk lewat magic link (undangan-only).
  // Password cuma dipasangkan manual ke akun admin lewat script
  // set-admin-password, sebagai jalur masuk kedua yang lebih cepat —
  // disableSignUp mencegah siapa pun mendaftar password sendiri lewat API.
  emailAndPassword: { enabled: true, disableSignUp: true },
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => sendLoginEmail(email, url),
    }),
  ],
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "member",
        input: false,
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  advanced: {
    database: { generateId: () => crypto.randomUUID() },
    // Frontend dan backend hidup di domain yang benar-benar berbeda di
    // produksi (mis. dua subdomain *.up.railway.app terpisah — itu dua "site"
    // berbeda untuk keperluan cookie, bukan cuma beda port seperti di lokal).
    // SameSite=Lax default akan ditolak browser saat frontend fetch sesi ke
    // backend lintas-domain. SameSite=None butuh Secure, jadi hanya dipakai
    // saat produksi (HTTPS); di lokal (http://localhost) tetap Lax seperti biasa.
    ...(env.NODE_ENV === "production"
      ? { defaultCookieAttributes: { sameSite: "none" as const, secure: true } }
      : {}),
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await invitationService.linkUserToMember(user.id, user.email);
        },
      },
    },
  },
});
