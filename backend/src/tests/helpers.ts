import "dotenv/config";
import { db } from "../db/index.js";
import { members, periods } from "../db/schema/index.js";
import { eq } from "drizzle-orm";

let seq = 0;
function uniq(prefix: string) {
  seq += 1;
  return `${prefix}-${Date.now()}-${seq}`;
}

export async function createTestPeriod(overrides: Partial<typeof periods.$inferInsert> = {}) {
  const [period] = await db
    .insert(periods)
    .values({
      name: uniq("Periode Uji"),
      startDate: "2026-01-05", // Senin
      endDate: "2026-06-30",
      // draft, bukan active — supaya tidak bentrok dengan partial unique index
      // "hanya satu periode aktif" saat tabel sudah berisi data seed nyata.
      // Mesin ketersediaan tidak peduli status periode, jadi ini aman.
      status: "draft",
      operationalStart: "04:00",
      operationalEnd: "22:00",
      slotMinutes: 30,
      bufferMinutes: 30,
      staleAfterDays: 30,
      ...overrides,
    })
    .returning();
  return period;
}

export async function createTestMember(overrides: Partial<typeof members.$inferInsert> = {}) {
  const tag = uniq("member");
  const [member] = await db
    .insert(members)
    .values({
      fullName: `Uji ${tag}`,
      nickname: "Uji",
      email: `${tag}@example.test`,
      isActive: true,
      ...overrides,
    })
    .returning();
  return member;
}

export async function cleanupPeriod(periodId: string) {
  await db.delete(periods).where(eq(periods.id, periodId));
}

export async function cleanupMember(memberId: string) {
  await db.delete(members).where(eq(members.id, memberId));
}
