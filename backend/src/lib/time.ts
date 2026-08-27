export type PeriodTimeConfig = {
  operationalStart: string; // "HH:mm" atau "HH:mm:ss"
  operationalEnd: string;
  slotMinutes: number;
};

// Postgres mengembalikan kolom `time` sebagai "HH:mm:ss" — API selalu mengirim "HH:mm"
// (Backend Plan §4.1: "Waktu dikirim sebagai HH:mm"). Pakai ini di batas serialisasi.
export function toHHmm(t: string): string {
  return t.slice(0, 5);
}

export function parseMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function formatMinutes(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function offset(t: string, period: PeriodTimeConfig): number {
  return parseMinutes(t) - parseMinutes(period.operationalStart);
}

export function toSlotIndex(t: string, period: PeriodTimeConfig): number {
  return Math.floor(offset(t, period) / period.slotMinutes);
}

// BR-1: aktivitas dibulatkan KE LUAR agar tidak ada waktu tersembunyi.
// Rentang setengah terbuka [from, to).
export function slotRange(start: string, end: string, period: PeriodTimeConfig) {
  const from = Math.floor(offset(start, period) / period.slotMinutes);
  const to = Math.ceil(offset(end, period) / period.slotMinutes);
  return { from, to };
}

export function slotsPerDay(period: PeriodTimeConfig): number {
  const totalMinutes = parseMinutes(period.operationalEnd) - parseMinutes(period.operationalStart);
  return Math.ceil(totalMinutes / period.slotMinutes);
}

export function slotIndexToTime(slotIndex: number, period: PeriodTimeConfig): string {
  return formatMinutes(parseMinutes(period.operationalStart) + slotIndex * period.slotMinutes);
}

export function isoWeekday(dateStr: string): number {
  // 1 = Senin ... 7 = Ahad (ISO), sejalan dengan kolom `weekday` di skema.
  const d = new Date(`${dateStr}T00:00:00Z`);
  const jsDay = d.getUTCDay(); // 0 = Ahad ... 6 = Sabtu
  return jsDay === 0 ? 7 : jsDay;
}

function startOfWeek(dateStr: string): Date {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const weekday = isoWeekday(dateStr);
  d.setUTCDate(d.getUTCDate() - (weekday - 1));
  return d;
}

// Pekan pertama periode (pekan berisi startDate) dianggap "odd". Anchor ini
// arbitrer tapi konsisten selama periode berjalan — cukup untuk BR bi-mingguan.
export function weekParity(dateStr: string, periodStartDate: string): "odd" | "even" {
  const weeksSince = Math.round(
    (startOfWeek(dateStr).getTime() - startOfWeek(periodStartDate).getTime()) / (7 * 24 * 60 * 60 * 1000),
  );
  return weeksSince % 2 === 0 ? "odd" : "even";
}
