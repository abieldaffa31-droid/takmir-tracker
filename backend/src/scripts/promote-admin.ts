import "dotenv/config";
import { eq } from "drizzle-orm";
import { db, pool } from "../db/index.js";
import { user, members } from "../db/schema/index.js";

// Alat pemulihan: pasangkan ulang akun login (`user`) dengan baris `members`
// berdasarkan email yang sama, dan naikkan role akun itu jadi admin. Perlu
// dipakai kalau seseorang ganti email pada baris `members`-nya lalu login
// ulang — akun `user` barunya default role "member" DAN baris `members`-nya
// bisa saja masih menunjuk ke akun `user` lama (kalau linking sempat
// terlewat sebelum perbaikan di invitation.service.ts).
const email = process.argv[2];

async function main() {
  if (!email) {
    console.error("Pemakaian: node dist/scripts/promote-admin.js <email>");
    process.exitCode = 1;
    return;
  }

  const account = await db.query.user.findFirst({ where: eq(user.email, email) });
  if (!account) {
    console.error(`Tidak ada akun login dengan email ${email}. Pastikan sudah pernah login minimal sekali.`);
    process.exitCode = 1;
    return;
  }

  const member = await db.query.members.findFirst({ where: eq(members.email, email) });
  if (!member) {
    console.error(`Tidak ada baris anggota (members) dengan email ${email}.`);
    process.exitCode = 1;
    return;
  }

  await db.update(user).set({ role: "admin" }).where(eq(user.id, account.id));
  if (member.userId !== account.id) {
    await db.update(members).set({ userId: account.id }).where(eq(members.id, member.id));
  }

  console.log(`Selesai. ${email}: role=admin, members.userId ditautkan ke akun login yang aktif sekarang.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
