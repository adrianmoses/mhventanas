/** Parse "mm:ss" (minutes may exceed 59) into seconds; null if blank or malformed. */
export function parseTime(value: string | null | undefined): number | null {
  const m = /^(\d{1,3}):([0-5]\d)$/.exec((value ?? "").trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/** Seconds → "m:ss"; "—" when there is no time. */
export function formatTime(seconds: number | null | undefined): string {
  if (seconds == null || Number.isNaN(seconds)) return "—";
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/** ISO date "2026-09-20" → "20/9/2026". */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${Number(d)}/${Number(m)}/${y}`;
}

/** Decimal with a Spanish comma: 1.5 → "1,5". */
export function formatDecimal(value: number): string {
  return value.toFixed(1).replace(".", ",");
}

/** "Rey Dau" → "rey-dau", "Nu Udra Arquetemplado" → "nu-udra-arquetemplado". */
export function slugifyMonster(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Today's date as "YYYY-MM-DD" in local time. */
export function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
