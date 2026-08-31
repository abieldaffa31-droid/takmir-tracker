import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { env } from "../config/env.js";
import { sendEmail } from "../lib/mailer.js";
import { db } from "../db/index.js";
import { user } from "../db/schema/index.js";
import { memberRepo } from "../repositories/member.repo.js";
import { invitationRepo } from "../repositories/invitation.repo.js";
import type { Actor } from "../lib/types.js";

const INVITE_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 hari

// Undangan cuma sebuah penanda + email ajakan — sesi masuk yang sesungguhnya
// tetap lewat magic link Better Auth begitu penerima membuka tautan ini dan
// memasukkan emailnya di halaman login.
async function sendInvitationEmail(email: string, fullName: string) {
  const url = `${env.FRONTEND_URL}/masuk?email=${encodeURIComponent(email)}`;
  await sendEmail({
    to: email,
    subject: "Kamu diundang ke Takmir Tracker",
    logLabel: "undangan",
    html: `
      <div style="font-family:sans-serif;max-width:420px;margin:0 auto">
        <h2>Jaga masjid bareng.</h2>
        <p>Halo ${fullName}, kamu diundang untuk gabung ke Takmir Tracker — isi jadwalmu supaya koordinator tahu kapan kamu bisa jaga masjid.</p>
        <p><a href="${url}" style="display:inline-block;background:#2438FF;color:#fff;padding:14px 20px;border-radius:10px;text-decoration:none;font-weight:bold">Buka undangan →</a></p>
        <p style="color:#888;font-size:13px">Di halaman itu, masukkan email ini (${email}) untuk masuk — tanpa password.</p>
      </div>
    `,
  });
}

export const invitationService = {
  async send(memberId: string, actor?: Actor) {
    const member = await memberRepo.byId(memberId);
    if (!member) throw new Error("Member tidak ditemukan");

    const token = crypto.randomUUID();
    await invitationRepo.create({
      memberId,
      email: member.email,
      token,
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      invitedBy: actor?.memberId,
    });
    await sendInvitationEmail(member.email, member.fullName);
    return { token };
  },

  async resend(memberId: string, actor?: Actor) {
    return invitationService.send(memberId, actor);
  },

  // Dipanggil dari Better Auth databaseHooks.user.create.after — menautkan
  // baris `user` yang baru dibuat Better Auth ke baris `members` yang sudah
  // ada berdasarkan email, lalu menandai undangan pending sebagai diterima.
  //
  // Kalau member ini sebelumnya sudah tertaut ke akun `user` LAIN (mis. email
  // anggota diganti, sehingga login berikutnya membuat akun baru), akun baru
  // itu jadi akun aktifnya — dan role dari akun lama (admin/coordinator, dsb)
  // dipindahkan juga, supaya ganti email tidak diam-diam menurunkan hak akses.
  async linkUserToMember(userId: string, email: string) {
    const member = await memberRepo.byEmail(email);
    if (!member) return;

    if (member.userId && member.userId !== userId) {
      const previousUser = await db.query.user.findFirst({ where: eq(user.id, member.userId) });
      if (previousUser && previousUser.role !== "member") {
        await db.update(user).set({ role: previousUser.role }).where(eq(user.id, userId));
      }
    }
    if (member.userId !== userId) {
      await memberRepo.linkUser(member.id, userId);
    }

    const pending = await invitationRepo.latestPendingForEmail(email);
    if (pending) await invitationRepo.markAccepted(pending.id);
  },
};
