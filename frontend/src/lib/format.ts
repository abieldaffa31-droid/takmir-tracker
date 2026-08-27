export const DAY_LABELS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Ahd']
export const DAY_LABELS_FULL = ['Senin', 'Selasa', 'Rabu', 'Kamis', "Jum'at", 'Sabtu', 'Ahad']

export const CATEGORY_LABELS: Record<string, string> = {
  kuliah: 'Kuliah',
  kerja: 'Kerja',
  amanah_masjid: 'Amanah',
  organisasi: 'Organisasi',
  pribadi: 'Pribadi',
  luang_preferred: 'Luang (preferred)',
}

export const CATEGORY_SWATCH: Record<string, string> = {
  kuliah: '#2438FF',
  kerja: '#B14CFF',
  amanah_masjid: '#FFF04A',
  organisasi: '#4759FF',
  pribadi: '#8E9BFF',
  luang_preferred: '#DDE2FF',
}

export function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

export function isoWeekday(dateStr: string): number {
  const d = new Date(`${dateStr}T00:00:00Z`)
  const day = d.getUTCDay()
  return day === 0 ? 7 : day
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

// Geser ke Senin pada pekan yang sama dengan dateStr.
export function startOfWeek(dateStr: string): string {
  const weekday = isoWeekday(dateStr)
  return addDays(dateStr, -(weekday - 1))
}

export const CRITICAL_THRESHOLD = 2

// Ramp sekuensial satu rona untuk KUANTITAS (mode Tim) — Frontend Plan §2.2:
// makin pekat, makin banyak personel bebas. Bukan lampu lalu lintas.
export function cellColorFor(free: number): { bg: string; fg: string } {
  if (free === 0) return { bg: 'repeating-linear-gradient(45deg,#FFF04A,#FFF04A 5px,#fff 5px,#fff 10px)', fg: '#0B0F2B' }
  if (free < 2) return { bg: '#FFF04A', fg: '#0B0F2B' }
  if (free < 4) return { bg: '#DDE2FF', fg: '#0B0F2B' }
  if (free < 8) return { bg: '#8E9BFF', fg: '#0B0F2B' }
  if (free < 12) return { bg: '#4759FF', fg: '#fff' }
  return { bg: '#2438FF', fg: '#fff' }
}

// Grid Tim bekerja atas pola mingguan (weekday), tapi detail slot (L05) butuh
// tanggal konkret. Ambil tanggal pada pekan berjalan untuk weekday itu, dan
// kalau ternyata di luar rentang periode, geser ke pekan pertama periode.
export function resolveDateForWeekday(
  period: { startDate: string; endDate: string },
  weekday: number,
): string {
  const thisWeekMonday = startOfWeek(todayIso())
  const candidate = addDays(thisWeekMonday, weekday - 1)
  if (candidate >= period.startDate && candidate <= period.endDate) return candidate
  return addDays(startOfWeek(period.startDate), weekday - 1)
}

export function formatDateLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`)
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}
