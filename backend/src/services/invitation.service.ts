import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { env } from "../config/env.js";
import { db } from "../db/index.js";
import { user } from "../db/schema/index.js";
import { memberRepo } from "../repositories/member.repo.js";
import { invitationRepo } from "../repositories/invitation.repo.js";
import type { Actor } from "../lib/types.js";

const INVITE_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 hari

export const invitationService = {
  // Undangan = trigger langsung ke magic link Better Auth. Satu email, satu
  // tautan yang begitu diklik langsung masuk — tidak ada langkah "minta
  // tautan masuk" terpisah lagi. `auth` diimpor lazy di dalam fungsi supaya
  // tidak bentrok dengan config/auth.ts yang mengimpor invitationService
  // balik untuk databaseHooks (keduanya cuma dipakai saat fungsi dipanggil,
  // bukan saat modul dimuat, jadi impor melingkar ini aman di ESM).
  async send(memberId: string, actor?: Actor) {
    const { auth } = await import("../config/auth.js");
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

    await auth.api.signInMagicLink({
      body: { email: member.email, callbackURL: `${env.FRONTEND_URL}/` },
      headers: new Headers(),
    });

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
