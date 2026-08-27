import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "../db/index.js";
import { activityRepo } from "../repositories/activity.repo.js";
import { availabilityRepo } from "../repositories/availability.repo.js";
import { exceptionRepo } from "../repositories/exception.repo.js";
import { memberRepo } from "../repositories/member.repo.js";
import { availabilityService } from "../services/availability.service.js";
import { scheduleService } from "../services/schedule.service.js";
import { serializeActivity } from "../lib/serialize.js";
import { isoWeekday, slotsPerDay } from "../lib/time.js";
import type { Actor } from "../lib/types.js";
import { cleanupMember, cleanupPeriod, createTestMember, createTestPeriod } from "./helpers.js";

describe("mesin ketersediaan (Backend Plan §7, tes wajib 1-10)", () => {
  let periodId: string;
  const memberIds: string[] = [];

  beforeEach(async () => {
    const period = await createTestPeriod();
    periodId = period.id;
  });

  afterEach(async () => {
    for (const id of memberIds.splice(0)) await cleanupMember(id);
    await cleanupPeriod(periodId);
  });

  async function member() {
    const m = await createTestMember();
    memberIds.push(m.id);
    return m;
  }

  function actorFor(m: { id: string }, role: Actor["role"] = "member"): Actor {
    return { userId: `user-${m.id}`, memberId: m.id, role };
  }

  it("1) aktivitas 09:50–10:40 memblokir slot 09:30 hingga 11:00 (pembulatan ke luar)", async () => {
    const m = await member();
    await db.transaction(async (tx) => {
      await activityRepo.create(
        {
          memberId: m.id,
          periodId,
          category: "kuliah",
          title: "Kalkulus",
          isOutsideArea: false,
          source: "manual",
          schedules: [{ weekday: 1, startTime: "09:50", endTime: "10:40", recurrence: "weekly" }],
        },
        tx,
      );
      await availabilityService.recomputeMember(m.id, periodId, tx);
    });

    const slots = await availabilityRepo.slotsForMember(m.id, periodId);
    const byIndex = new Map(slots.filter((s) => s.weekday === 1).map((s) => [s.slotIndex, s.status]));

    expect(byIndex.get(10)).toBe("implicit_free");
    expect(byIndex.get(11)).toBe("hard_blocked");
    expect(byIndex.get(12)).toBe("hard_blocked");
    expect(byIndex.get(13)).toBe("hard_blocked");
    expect(byIndex.get(14)).toBe("implicit_free");
  });

  it("2) buffer tidak menimpa hard_blocked", async () => {
    const m = await member();
    let hardActivityId = "";
    await db.transaction(async (tx) => {
      const soft = await activityRepo.create(
        {
          memberId: m.id,
          periodId,
          category: "pribadi",
          title: "Urusan pribadi di luar area",
          isOutsideArea: true,
          source: "manual",
          schedules: [{ weekday: 1, startTime: "09:00", endTime: "09:30", recurrence: "weekly" }],
        },
        tx,
      );
      const hard = await activityRepo.create(
        {
          memberId: m.id,
          periodId,
          category: "kuliah",
          title: "Kuliah",
          isOutsideArea: false,
          source: "manual",
          schedules: [{ weekday: 1, startTime: "09:30", endTime: "10:00", recurrence: "weekly" }],
        },
        tx,
      );
      hardActivityId = hard.id;
      void soft;
      await availabilityService.recomputeMember(m.id, periodId, tx);
    });

    const slots = await availabilityRepo.slotsForMember(m.id, periodId);
    const slot11 = slots.find((s) => s.weekday === 1 && s.slotIndex === 11);
    expect(slot11?.status).toBe("hard_blocked");
    expect(slot11?.sourceActivityId).toBe(hardActivityId);
  });

  it("3) buffer tidak meluber keluar jam operasional", async () => {
    const m = await member();
    await db.transaction(async (tx) => {
      // Aktivitas di slot pertama (04:00) dan di slot terakhir (21:30) jam operasional.
      await activityRepo.create(
        {
          memberId: m.id,
          periodId,
          category: "pribadi",
          title: "Awal hari",
          isOutsideArea: true,
          source: "manual",
          schedules: [{ weekday: 2, startTime: "04:00", endTime: "04:30", recurrence: "weekly" }],
        },
        tx,
      );
      await activityRepo.create(
        {
          memberId: m.id,
          periodId,
          category: "pribadi",
          title: "Akhir hari",
          isOutsideArea: true,
          source: "manual",
          schedules: [{ weekday: 2, startTime: "21:30", endTime: "22:00", recurrence: "weekly" }],
        },
        tx,
      );
      await availabilityService.recomputeMember(m.id, periodId, tx);
    });

    const slots = await availabilityRepo.slotsForMember(m.id, periodId);
    const weekday2 = slots.filter((s) => s.weekday === 2);
    const totalSlots = weekday2.length;
    expect(totalSlots).toBe(36); // (22:00-04:00)/30menit
    expect(Math.min(...weekday2.map((s) => s.slotIndex))).toBeGreaterThanOrEqual(0);
    expect(Math.max(...weekday2.map((s) => s.slotIndex))).toBeLessThan(totalSlots);
  });

  it("4) shift 22:00–06:00 menghasilkan dua baris jadwal pada hari berbeda", async () => {
    const m = await member();
    const actor = actorFor(m);
    const result = await scheduleService.create(actor, {
      periodId,
      category: "amanah_masjid",
      title: "Piket malam",
      schedules: [{ weekday: 6, startTime: "22:00", endTime: "06:00", recurrence: "weekly" }],
    } as any);

    expect(result.schedules).toHaveLength(2);
    const sorted = [...result.schedules].sort((a: any, b: any) => a.weekday - b.weekday);
    expect(sorted[0]).toMatchObject({ weekday: 6, startTime: "22:00", endTime: "23:59" });
    expect(sorted[1]).toMatchObject({ weekday: 7, startTime: "00:00", endTime: "06:00" });
  });

  it("5) pengecualian seharian menimpa seluruh slot pada tanggal itu, tanpa mengubah pola induk", async () => {
    const m = await member();
    const period = await db.query.periods.findFirst({ where: (p, { eq }) => eq(p.id, periodId) });
    const targetDate = period!.startDate; // weekday hari pertama periode
    const weekday = isoWeekday(targetDate);

    await db.transaction(async (tx) => {
      await activityRepo.create(
        {
          memberId: m.id,
          periodId,
          category: "kuliah",
          title: "Kuliah",
          isOutsideArea: false,
          source: "manual",
          schedules: [{ weekday, startTime: "08:00", endTime: "09:00", recurrence: "weekly" }],
        },
        tx,
      );
      await availabilityService.recomputeMember(m.id, periodId, tx);
    });

    await exceptionRepo.create({
      memberId: m.id,
      startDate: targetDate,
      endDate: targetDate,
      isAllDay: true,
      type: "sakit",
    });

    const resolved = await availabilityService.resolveForDate([m.id], periodId, targetDate);
    const cells = resolved!.get(m.id)!;
    expect(cells.every((c) => c.status === "exception_blocked")).toBe(true);

    // Pola induk (mingguan) tidak berubah — masih ada slot kuliah hard_blocked di sana.
    const weeklySlots = await availabilityRepo.slotsForMember(m.id, periodId);
    const stillHardBlocked = weeklySlots.some((s) => s.weekday === weekday && s.status === "hard_blocked");
    expect(stillHardBlocked).toBe(true);
  });

  it("6) tanggal di luar rentang periode mengembalikan tanpa data, bukan tersedia", async () => {
    const m = await member();
    const result = await availabilityService.resolveForDate([m.id], periodId, "2030-01-01");
    expect(result).toBeNull();
  });

  it("7) aktivitas bi-mingguan hanya aktif pada pekan yang sesuai", async () => {
    const m = await member();
    const period = await db.query.periods.findFirst({ where: (p, { eq }) => eq(p.id, periodId) });
    const week1Date = period!.startDate;
    const weekday = isoWeekday(week1Date);
    const week2Date = new Date(new Date(`${week1Date}T00:00:00Z`).getTime() + 7 * 86400000)
      .toISOString()
      .slice(0, 10);

    await db.transaction(async (tx) => {
      await activityRepo.create(
        {
          memberId: m.id,
          periodId,
          category: "kuliah",
          title: "Kuliah ganjil",
          isOutsideArea: false,
          source: "manual",
          schedules: [{ weekday, startTime: "08:00", endTime: "09:00", recurrence: "biweekly_odd" }],
        },
        tx,
      );
      await availabilityService.recomputeMember(m.id, periodId, tx);
    });

    const slotIdx = 8; // 08:00 -> (8-4)*60/30 = 8
    const week1 = await availabilityService.resolveForDate([m.id], periodId, week1Date);
    const week2 = await availabilityService.resolveForDate([m.id], periodId, week2Date);

    expect(week1!.get(m.id)![slotIdx].status).toBe("hard_blocked");
    expect(week2!.get(m.id)![slotIdx].status).toBe("implicit_free");
  });

  it("8) anggota nonaktif tidak muncul di hasil pencarian", async () => {
    const active = await member();
    const inactive = await member();
    await memberRepo.setActive(inactive.id, false);

    const pool = await memberRepo.activeMatching({});
    const ids = pool.map((p) => p.id);
    expect(ids).toContain(active.id);
    expect(ids).not.toContain(inactive.id);
  });

  it("9) anggota busy_only tidak pernah membocorkan title ke pemohon non-koordinator", async () => {
    const owner = await member();
    await memberRepo.update(owner.id, { detailVisibility: "busy_only" });
    const stranger = await member();

    const activity = {
      id: "x",
      memberId: owner.id,
      category: "kuliah" as const,
      title: "Kalkulus Rahasia",
      location: "Gedung A",
      note: "catatan",
      isOutsideArea: false,
      source: "manual" as const,
    };
    const ownerRow = await memberRepo.byId(owner.id);

    const strangerView = serializeActivity(actorFor(stranger, "member"), activity as any, ownerRow!);
    expect(strangerView.title).toBeNull();
    expect(strangerView.location).toBeNull();
    expect(strangerView.category).toBe("kuliah");

    const coordinatorView = serializeActivity(actorFor(stranger, "coordinator"), activity as any, ownerRow!);
    expect(coordinatorView.title).toBe("Kalkulus Rahasia");

    const ownView = serializeActivity(actorFor(owner, "member"), activity as any, ownerRow!);
    expect(ownView.title).toBe("Kalkulus Rahasia");
  });

  it("10) materialisasi ulang penuh menghasilkan tabel yang identik dengan materialisasi bertahap", async () => {
    const m = await member();

    await db.transaction(async (tx) => {
      await activityRepo.create(
        {
          memberId: m.id,
          periodId,
          category: "kuliah",
          title: "A",
          isOutsideArea: false,
          source: "manual",
          schedules: [{ weekday: 1, startTime: "08:00", endTime: "10:00", recurrence: "weekly" }],
        },
        tx,
      );
      await availabilityService.recomputeMember(m.id, periodId, tx);
    });
    await db.transaction(async (tx) => {
      await activityRepo.create(
        {
          memberId: m.id,
          periodId,
          category: "kerja",
          title: "B",
          isOutsideArea: true,
          source: "manual",
          schedules: [{ weekday: 3, startTime: "13:00", endTime: "17:00", recurrence: "weekly" }],
        },
        tx,
      );
      await availabilityService.recomputeMember(m.id, periodId, tx);
    });
    await db.transaction(async (tx) => {
      await activityRepo.create(
        {
          memberId: m.id,
          periodId,
          category: "luang_preferred",
          title: "C",
          isOutsideArea: false,
          source: "manual",
          schedules: [{ weekday: 6, startTime: "15:00", endTime: "17:40", recurrence: "weekly" }],
        },
        tx,
      );
      await availabilityService.recomputeMember(m.id, periodId, tx);
    });

    const incremental = (await availabilityRepo.slotsForMember(m.id, periodId))
      .map((s) => ({ weekday: s.weekday, slotIndex: s.slotIndex, status: s.status }))
      .sort((a, b) => a.weekday - b.weekday || a.slotIndex - b.slotIndex);

    // Materialisasi ulang penuh sekali lagi dari tabel sumber — harus identik.
    await db.transaction((tx) => availabilityService.recomputeMember(m.id, periodId, tx));

    const fullRebuild = (await availabilityRepo.slotsForMember(m.id, periodId))
      .map((s) => ({ weekday: s.weekday, slotIndex: s.slotIndex, status: s.status }))
      .sort((a, b) => a.weekday - b.weekday || a.slotIndex - b.slotIndex);

    expect(fullRebuild).toEqual(incremental);
  });
});
