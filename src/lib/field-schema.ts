// Client-safe helpers: infer form field behaviour from a Google Sheets header name.

export type FieldKind = "text" | "email" | "tel" | "number" | "date" | "time" | "textarea" | "nik";

export type FormField = {
  /** Original header text, used as the column key. */
  header: string;
  /** Stable key for form state. */
  name: string;
  kind: FieldKind;
  required: boolean;
  /** Filled automatically by the server (date/time/timestamp columns). */
  auto: boolean;
  placeholder?: string;
  maxLength: number;
};

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const has = (h: string, ...words: string[]) => words.some((w) => h.includes(w));

export function inferField(header: string, index: number): FormField {
  const h = norm(header);
  const base = { header, name: `f${index}`, required: true, auto: false, maxLength: 200 };

  if (has(h, "timestamp", "waktu input", "dibuat"))
    return { ...base, kind: "text", auto: true, required: false };
  if (has(h, "tanggal", "date", "tgl")) return { ...base, kind: "date", auto: true };
  if (has(h, "jam", "time", "pukul", "waktu")) return { ...base, kind: "time", auto: true };
  if (has(h, "email", "surel"))
    return { ...base, kind: "email", required: false, placeholder: "nama@email.com", maxLength: 120 };
  if (has(h, "hp", "telepon", "telpon", "phone", "wa", "whatsapp", "kontak"))
    return { ...base, kind: "tel", placeholder: "08xxxxxxxxxx", maxLength: 20 };
  if (has(h, "nik", "ktp", "nip", "nomor induk"))
    return { ...base, kind: "nik", placeholder: "16 digit NIK", maxLength: 20 };
  if (has(h, "keperluan", "keterangan", "pesan", "catatan", "alamat", "tujuan", "saran"))
    return { ...base, kind: "textarea", maxLength: 500 };
  if (has(h, "jumlah", "usia", "umur")) return { ...base, kind: "number", maxLength: 6 };

  return { ...base, kind: "text" };
}

export function buildFields(headers: string[]): FormField[] {
  return headers
    .map((header, i) => ({ header: header.trim(), i }))
    .filter((x) => x.header.length > 0)
    .map((x) => inferField(x.header, x.i));
}

export function validateValue(field: FormField, raw: string): string | null {
  const value = raw.trim();
  if (!value) return field.required ? `${field.header} wajib diisi.` : null;
  if (value.length > field.maxLength)
    return `${field.header} maksimal ${field.maxLength} karakter.`;
  switch (field.kind) {
    case "email":
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) ? null : `${field.header} tidak valid.`;
    case "tel":
      return /^[0-9+()\-\s]{8,20}$/.test(value) ? null : `${field.header} tidak valid.`;
    case "nik":
      return /^[0-9]{8,20}$/.test(value) ? null : `${field.header} harus berupa angka.`;
    case "number":
      return /^[0-9]+$/.test(value) ? null : `${field.header} harus berupa angka.`;
    default:
      return null;
  }
}
