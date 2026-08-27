import "dotenv/config";
import { db, pool } from "../db/index.js";
import { availabilityService } from "../services/availability.service.js";

// Alat pemulihan manual (Backend Plan §1 prinsip #4): availability_slots harus
// selalu bisa dibangun ulang dari activities + schedule_exceptions. Jalankan
// ini kalau tabel turunan dicurigai tidak sinkron dengan tabel sumber.
async function main() {
  const periods = await db.query.periods.findMany();
  for (const period of periods) {
    console.log(`Membangun ulang ketersediaan untuk periode "${period.name}"...`);
    await db.transaction((tx) => availabilityService.recomputeAllForPeriod(period.id, tx));
  }
  console.log(`Selesai. ${periods.length} periode dibangun ulang.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
