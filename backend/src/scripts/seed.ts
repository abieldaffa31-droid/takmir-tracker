import "dotenv/config";
import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { db, pool } from "../db/index.js";
import { members, periods, timeBands, user, activities, activitySchedules } from "../db/schema/index.js";
import { availabilityService } from "../services/availability.service.js";
import type { ActivityCategory } from "../db/schema/enums.js";

const NAMES = [
  "Bilal Ramadhan",
  "Hasan Abdullah",
  "Umar Syarif",
  "Zaid Maulana",
  "Salim Taufik",
  "Yusuf Hakim",
  "Ridwan Malik",
  "Fahri Aditya",
  "Iqbal Ramadhan",
  "Dzaki Firmansyah",
  "Rafi Nugroho",
  "Farhan Setiawan",
  "Naufal Wibowo",
  "Rizky Pratama",
  "Miftahul Huda",
  "Arif Rahman",
  "Taufan Hidayat",
  "Wahid Kurniawan",
  "Faisal Anwar",
  "Ilham Saputra",
  "Reza Firdaus",
  "Aldi Gunawan",
  "Fadli Syahputra",
  "Hafizh Ramadhan",
  "Syahrul Gunawan",
  "Dimas Prakoso",
  "Aji Santoso",
  "Rahmat Hidayatullah",
  "Nizar Al Farizi",
  "Zulfikar Ramadhan",
];

const DIVISIONS = ["Peribadatan", "Humas", "Pendidikan", "Kepemudaan", "Kesekretariatan"];
const DOMICILES = ["dalam_kompleks", "dekat", "dekat", "jauh"] as const;

function nicknameFor(fullName: string) {
  return fullName.split(" ")[0];
}

function emailFor(fullName: string, idx: number) {
  return `${fullName.toLowerCase().replace(/\s+/g, ".")}.${idx}@contoh.test`;
}

function pick<T>(arr: readonly T[], seed: number): T {
  return arr[seed % arr.length];
}

type ScheduleSeed = { weekday: number; startTime: string; endTime: string; category: ActivityCategory; title: string };

// Pola aktivitas per anggota dibuat dari indeks anggota supaya beragam tapi
// deterministik — cukup untuk data contoh, tidak perlu meniru persis mockup.
function activitiesFor(idx: number): { category: ActivityCategory; title: string; isOutsideArea: boolean; schedules: Omit<ScheduleSeed, "category" | "title">[] }[] {
  const out: { category: ActivityCategory; title: string; isOutsideArea: boolean; schedules: Omit<ScheduleSeed, "category" | "title">[] }[] = [];

  // Kuliah/kerja: mayoritas anggota (mahasiswa/pekerja), Senin-Jumat pagi-siang.
  if (idx % 3 !== 2) {
    const isKuliah = idx % 2 === 0;
    const days = [1, 2, 3, 4].filter((_, i) => (idx + i) % 3 !== 0);
    out.push({
      category: isKuliah ? "kuliah" : "kerja",
      title: isKuliah ? "Kuliah" : "Kerja",
      isOutsideArea: !isKuliah,
      schedules: days.map((weekday) => ({ weekday, startTime: "08:00", endTime: idx % 2 === 0 ? "12:00" : "16:00" })),
    });
  }

  // Amanah masjid rutin untuk sebagian anggota (piket, kajian).
  if (idx % 4 === 0) {
    out.push({
      category: "amanah_masjid",
      title: "Piket jaga masjid",
      isOutsideArea: false,
      schedules: [{ weekday: 6, startTime: "04:40", endTime: "06:30" }],
    });
  }

  // Aktivitas pribadi/organisasi sesekali.
  if (idx % 5 === 1) {
    out.push({
      category: "organisasi",
      title: "Rapat organisasi",
      isOutsideArea: false,
      schedules: [{ weekday: 3, startTime: "19:00", endTime: "21:00" }],
    });
  }

  // Sebagian menandai eksplisit "lebih suka jaga" ba'da Maghrib/Isya akhir pekan.
  if (idx % 3 === 0) {
    out.push({
      category: "luang_preferred",
      title: "Siap jaga akhir pekan",
      isOutsideArea: false,
      schedules: [{ weekday: 6, startTime: "17:40", endTime: "19:00" }],
    });
  }

  return out;
}

async function main() {
  console.log("Membersihkan data contoh lama (jika ada)...");
  await db.delete(periods); // cascade ke activities, timeBands, availability_*
  await db.delete(members); // cascade ke member_competencies, member_invitations
  await db.delete(user); // cascade ke session, account (Better Auth)

  console.log("Membuat pengguna koordinator (admin) beserta akun login...");
  const coordinatorEmail = "koordinator@masjidpogungraya.test";
  const [coordinatorMember] = await db
    .insert(members)
    .values({
      fullName: "Ahmad Fauzi",
      nickname: "Fauzi",
      email: coordinatorEmail,
      memberStatus: "keduanya",
      division: "Peribadatan",
      domicileZone: "dalam_kompleks",
      isActive: true,
      joinedAt: "2024-01-01",
      lastReviewedAt: new Date(),
    })
    .returning();

  const [authUser] = await db
    .insert(user)
    .values({
      id: crypto.randomUUID(),
      name: coordinatorMember.fullName,
      email: coordinatorEmail,
      emailVerified: true,
      role: "admin",
    })
    .returning();
  await db.update(members).set({ userId: authUser.id }).where(eq(members.id, coordinatorMember.id));

  console.log("Membuat periode aktif Ganjil 2026/2027...");
  const [activePeriod] = await db
    .insert(periods)
    .values({
      name: "Ganjil 2026/2027",
      startDate: "2026-08-01",
      endDate: "2026-12-31",
      status: "active",
      operationalStart: "04:00",
      operationalEnd: "22:00",
      slotMinutes: 30,
      bufferMinutes: 30,
      staleAfterDays: 30,
      createdBy: coordinatorMember.id,
    })
    .returning();

  await db.insert(timeBands).values([
    { periodId: activePeriod.id, key: "qabla_subuh", label: "Qabla Subuh", startTime: "04:00", endTime: "04:40", sortOrder: 1 },
    { periodId: activePeriod.id, key: "badha_subuh", label: "Ba'da Subuh", startTime: "04:40", endTime: "06:30", sortOrder: 2 },
    { periodId: activePeriod.id, key: "dhuha", label: "Dhuha", startTime: "06:30", endTime: "11:00", sortOrder: 3 },
    { periodId: activePeriod.id, key: "dzuhur", label: "Dzuhur", startTime: "11:00", endTime: "14:00", sortOrder: 4 },
    { periodId: activePeriod.id, key: "badha_ashar", label: "Ba'da Ashar", startTime: "15:00", endTime: "17:40", sortOrder: 5 },
    { periodId: activePeriod.id, key: "badha_maghrib", label: "Ba'da Maghrib", startTime: "17:40", endTime: "19:00", sortOrder: 6 },
    { periodId: activePeriod.id, key: "badha_isya", label: "Ba'da Isya", startTime: "19:00", endTime: "22:00", sortOrder: 7 },
  ]);

  console.log("Membuat periode arsip Genap 2025/2026...");
  await db.insert(periods).values({
    name: "Genap 2025/2026",
    startDate: "2026-02-01",
    endDate: "2026-06-30",
    status: "archived",
    operationalStart: "04:00",
    operationalEnd: "22:00",
    slotMinutes: 30,
    bufferMinutes: 30,
    staleAfterDays: 30,
    createdBy: coordinatorMember.id,
  });

  console.log(`Membuat ${NAMES.length} anggota...`);
  const memberRows = [coordinatorMember];
  for (let i = 0; i < NAMES.length; i++) {
    const fullName = NAMES[i];
    const hasReviewed = i % 4 !== 0; // ~7 dari 30 belum ngisi
    const [m] = await db
      .insert(members)
      .values({
        fullName,
        nickname: nicknameFor(fullName),
        email: emailFor(fullName, i),
        memberStatus: i % 2 === 0 ? "mahasiswa" : "pekerja",
        division: pick(DIVISIONS, i),
        domicileZone: pick(DOMICILES, i),
        detailVisibility: "busy_only",
        isActive: true,
        joinedAt: "2026-08-01",
        lastReviewedAt: hasReviewed ? new Date() : null,
      })
      .returning();
    memberRows.push(m);
  }

  console.log("Membuat aktivitas rutin untuk tiap anggota...");
  for (let i = 0; i < memberRows.length; i++) {
    const m = memberRows[i];
    for (const a of activitiesFor(i)) {
      const [activity] = await db
        .insert(activities)
        .values({
          memberId: m.id,
          periodId: activePeriod.id,
          category: a.category,
          title: a.title,
          isOutsideArea: a.isOutsideArea,
          source: "manual",
        })
        .returning();
      await db.insert(activitySchedules).values(
        a.schedules.map((s) => ({ ...s, activityId: activity.id, recurrence: "weekly" as const })),
      );
    }
  }

  console.log("Menjalankan materialisasi ketersediaan untuk seluruh anggota...");
  await db.transaction((tx) => availabilityService.recomputeAllForPeriod(activePeriod.id, tx));

  console.log(`\nSelesai. ${memberRows.length} anggota, periode aktif "${activePeriod.name}".`);
  console.log(`Login koordinator/admin lewat magic link dengan email: ${coordinatorEmail}`);
  console.log("(Link login akan dicetak di console server saat diminta — lihat konfigurasi Better Auth.)\n");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
