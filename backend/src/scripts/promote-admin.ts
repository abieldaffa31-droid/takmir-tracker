import "dotenv/config";
import { eq } from "drizzle-orm";
import { db, pool } from "../db/index.js";
import { user } from "../db/schema/index.js";

// Alat pemulihan: naikkan role akun login (bukan baris `members`) jadi admin.
// Perlu dipakai kalau seseorang login pertama kali dengan email baru dan
// akunnya otomatis dibuat dengan role default "member" (mis. setelah ganti
// email pada baris members yang tadinya terhubung ke akun admin/koordinator).
const email = process.argv[2];

async function main() {
  if (!email) {
    console.error("Pemakaian: node dist/scripts/promote-admin.js <email>");
    process.exitCode = 1;
    return;
  }
  const [updated] = await db.update(user).set({ role: "admin" }).where(eq(user.email, email)).returning();
  if (!updated) {
    console.error(`Tidak ada akun login dengan email ${email}. Pastikan sudah pernah login minimal sekali.`);
    process.exitCode = 1;
    return;
  }
  console.log(`Selesai. ${email} sekarang role-nya: ${updated.role}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
