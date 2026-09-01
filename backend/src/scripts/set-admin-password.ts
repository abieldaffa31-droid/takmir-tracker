import "dotenv/config";
import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { db, pool } from "../db/index.js";
import { user, account } from "../db/schema/index.js";

// Better Auth (>=1.3) menautkan akun credential lewat kolom `issuer` sintetis
// ini, bukan cuma providerId+accountId — harus persis sama supaya sign-in
// email/password bisa menemukan baris account ini.
const CREDENTIAL_ISSUER = "local:credential";

// Alat setup: pasangkan password ke akun admin, supaya admin punya jalur
// masuk kedua yang lebih cepat (email+password) tanpa menunggu email magic
// link. Anggota biasa tetap hanya bisa masuk lewat magic link — jalur ini
// khusus akun ber-role admin (jalankan make-admin dulu kalau belum).
const email = process.argv[2];
const password = process.argv[3];

async function main() {
  if (!email || !password) {
    console.error("Pemakaian: tsx src/scripts/set-admin-password.ts <email> <password>");
    process.exitCode = 1;
    return;
  }
  if (password.length < 8) {
    console.error("Password minimal 8 karakter.");
    process.exitCode = 1;
    return;
  }

  const acc = await db.query.user.findFirst({ where: eq(user.email, email) });
  if (!acc) {
    console.error(`Tidak ada akun login dengan email ${email}. Pastikan sudah pernah login minimal sekali lewat magic link.`);
    process.exitCode = 1;
    return;
  }
  if (acc.role !== "admin") {
    console.error(`Akun ${email} bukan admin (role=${acc.role}). Jalankan make-admin dulu.`);
    process.exitCode = 1;
    return;
  }

  const hash = await hashPassword(password);
  const existing = await db.query.account.findFirst({
    where: and(eq(account.userId, acc.id), eq(account.providerId, "credential")),
  });

  if (existing) {
    await db.update(account).set({ password: hash, issuer: CREDENTIAL_ISSUER }).where(eq(account.id, existing.id));
  } else {
    await db.insert(account).values({
      id: crypto.randomUUID(),
      accountId: acc.id,
      providerId: "credential",
      issuer: CREDENTIAL_ISSUER,
      userId: acc.id,
      password: hash,
    });
  }

  console.log(`Selesai. ${email} sekarang bisa masuk pakai password lewat jalur admin.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
