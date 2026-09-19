// Client-safe helpers: build and validate form fields from Google Sheets structure.
//
// Two sources, merged:
//  1. Header row of the data sheet  -> defines columns & order (always authoritative for appends)
//  2. Optional "Konfigurasi Formulir" sheet -> per-field overrides (label, tipe, wajib, opsi, ...)
// If no config sheet exists, types are inferred from the header names (backward compatible).

export type FieldKind =
  | "text"
  | "email"
  | "tel"
  | "number"
  | "date"
  | "datetime"
  | "time"
  | "textarea"
  | "select"
  | "radio"
  | "checkbox"
  | "nik";

export type FormField = {
  /** Original header text; key of the column in the sheet. */
  header: string;
  /** Displayed label (defaults to header). */
  label: string;
  /** Stable key for form state. */
  name: string;
  kind: FieldKind;
  required: boolean;
  /** Filled automatically by the server (date/time/timestamp columns). */
  auto: boolean;
  /** Hidden from the form (tampil = tidak); still written to the sheet. */
  hidden: boolean;
  placeholder?: string | undefined;
  helpText?: string | undefined;
  options?: string[] | undefined;
  maxLength: number;
};

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const has = (h: string, ...words: string[]) => words.some((w) => h.includes(w));

export const AUTO_HEADERS = (h: string) => {
  const n = norm(h);
  return has(n, "timestamp", "waktu input", "dibuat") || has(n, "tanggal", "date", "tgl") ||
    has(n, "jam", "time", "pukul");
};

export function inferKind(header: string): FieldKind {
  const h = norm(header);
  if (has(h, "timestamp", "waktu input", "dibuat")) return "datetime";
  if (has(h, "tanggal", "date", "tgl")) return "date";
  if (has(h, "jam", "time", "pukul", "waktu")) return "time";
  if (has(h, "email", "surel")) return "email";
  if (has(h, "hp", "telepon", "telpon", "phone", "wa", "whatsapp", "kontak")) return "tel";
  if (has(h, "nik", "ktp", "nip", "nomor induk")) return "nik";
  if (has(h, "keperluan", "keterangan", "pesan", "catatan", "alamat", "tujuan", "saran"))
    return "textarea";
  if (has(h, "jumlah", "usia", "umur")) return "number";
  return "text";
}

export function inferField(header: string, index: number): FormField {
  const kind = inferKind(header);
  const auto = kind === "date" || kind === "time" || kind === "datetime";
  return {
    header,
    label: header,
    name: `f${index}`,
    kind,
    required: kind !== "email",
    auto,
    hidden: false,
    placeholder:
      kind === "email"
        ? "nama@email.com"
        : kind === "tel"
          ? "08xxxxxxxxxx"
          : kind === "nik"
            ? "16 digit NIK"
            : undefined,
    maxLength: kind === "textarea" ? 500 : kind === "tel" || kind === "nik" ? 20 : 200,
  };
}

// --- Konfigurasi Formulir sheet ---
// Expected header row (case-insensitive, Indonesian):
//   kolom | label | tipe | wajib | opsi | placeholder | bantuan | tampil | otomatis
// - kolom       : nama kolom di sheet data (wajib cocok, abaikan huruf besar/kecil)
// - tipe        : text | textarea | date | datetime | time | number | phone | email |
//                 select | radio | checkbox | nik
// - wajib       : ya / tidak
// - opsi        : dipisah koma, untuk select/radio/checkbox
// - tampil      : ya / tidak (tidak = disembunyikan dari form)
// - otomatis    : ya = diisi server (tanggal/jam/timestamp)

export type FieldConfigRow = {
  kolom: string;
  label?: string;
  tipe?: string;
  wajib?: string;
  opsi?: string;
  placeholder?: string;
  bantuan?: string;
  tampil?: string;
  otomatis?: string;
};

const TYPE_MAP: Record<string, FieldKind> = {
  text: "text",
  teks: "text",
  textarea: "textarea",
  "long text": "textarea",
  date: "date",
  tanggal: "date",
  datetime: "datetime",
  time: "time",
  jam: "time",
  number: "number",
  angka: "number",
  phone: "tel",
  telp: "tel",
  telepon: "tel",
  hp: "tel",
  email: "email",
  select: "select",
  dropdown: "select",
  radio: "radio",
  checkbox: "checkbox",
  nik: "nik",
};

const truthy = (v?: string) => !!v && ["ya", "yes", "true", "1"].includes(v.trim().toLowerCase());
const falsy = (v?: string) => !!v && ["tidak", "no", "false", "0"].includes(v.trim().toLowerCase());

export function applyConfig(base: FormField, cfg: FieldConfigRow | undefined): FormField {
  if (!cfg) return base;
  const field = { ...base };
  if (cfg.label?.trim()) field.label = cfg.label.trim();
  if (cfg.placeholder?.trim()) field.placeholder = cfg.placeholder.trim();
  if (cfg.bantuan?.trim()) field.helpText = cfg.bantuan.trim();
  if (cfg.tipe?.trim()) {
    const k = TYPE_MAP[norm(cfg.tipe)];
    if (k) field.kind = k;
  }
  if (truthy(cfg.wajib)) field.required = true;
  if (falsy(cfg.wajib)) field.required = false;
  if (truthy(cfg.otomatis)) field.auto = true;
  if (falsy(cfg.tampil)) field.hidden = true;
  if (cfg.opsi?.trim()) {
    field.options = cfg.opsi
      .split(/[,;|]/)
      .map((o) => o.trim())
      .filter(Boolean);
  }
  if ((field.kind === "select" || field.kind === "radio" || field.kind === "checkbox") && field.auto)
    field.auto = false;
  return field;
}

export function buildFields(headers: string[], config?: FieldConfigRow[]): FormField[] {
  const byKolom = new Map((config ?? []).map((c) => [norm(c.kolom), c]));
  return headers
    .map((header, i) => ({ header: header.trim(), i }))
    .filter((x) => x.header.length > 0)
    .map((x) => applyConfig(inferField(x.header, x.i), byKolom.get(norm(x.header))));
}

export function validateValue(field: FormField, raw: string): string | null {
  const value = raw.trim();
  if (!value) return field.required ? `${field.label} wajib diisi.` : null;
  if (value.length > field.maxLength) return `${field.label} maksimal ${field.maxLength} karakter.`;
  switch (field.kind) {
    case "email":
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) ? null : `${field.label} tidak valid.`;
    case "tel":
      return /^[0-9+()\-\s]{8,20}$/.test(value) ? null : `${field.label} tidak valid.`;
    case "nik":
      return /^[0-9]{8,20}$/.test(value) ? null : `${field.label} harus berupa angka.`;
    case "number":
      return /^[0-9]+$/.test(value) ? null : `${field.label} harus berupa angka.`;
    case "select":
    case "radio":
      return !field.options || field.options.includes(value)
        ? null
        : `${field.label} tidak dikenal.`;
    case "checkbox": {
      const chosen = value.split(" | ").filter(Boolean);
      return !field.options || chosen.every((c) => field.options!.includes(c))
        ? null
        : `${field.label} tidak dikenal.`;
    }
    default:
      return null;
  }
}
