import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink } from "better-auth/plugins";
import { db } from "../db/index.js";
import * as schema from "../db/schema/index.js";
import { env } from "./env.js";
import { invitationService } from "../services/invitation.service.js";
import { memberRepo } from "../repositories/member.repo.js";

// Pengiriman email di-stub: link login dicetak ke console server (dev only).
// Ganti dengan provider nyata (Resend/SMTP) dengan menaruh kredensial di .env
// dan menukar isi fungsi ini — tidak ada bagian lain yang perlu berubah.
//
// Pendaftaran bersifat undangan saja (Backend Plan §2.1): kalau emailnya
// belum terdaftar sebagai `members`, link login sengaja TIDAK dikirim/dicetak
// — tanpa membocorkan ke pemanggil apakah emailnya valid atau tidak.
async function sendLoginEmail(email: string, url: string) {
  const member = await memberRepo.byEmail(email);
  if (!member) {
    console.log(`\n[magic-link] Percobaan masuk dengan email belum terdaftar: ${email} (diabaikan)\n`);
    return;
  }
  console.log(`\n[magic-link] Login untuk ${email}:\n  ${url}\n`);
}

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: [env.FRONTEND_URL],
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: { enabled: false },
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
