import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { buildFields, validateValue, type FormField } from "./field-schema";

export type FormSchema = {
  fields: FormField[];
  appName: string;
  error?: "config" | "sheet" | "unknown";
};

// --- simple in-memory rate limit (per server instance) ---
const hits = new Map<string, number[]>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_HITS = 8;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 500) hits.clear();
  return list.length > MAX_HITS;
}

function clientIp(): string {
  return (
    getRequestHeader("cf-connecting-ip") ||
    getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

function sanitize(value: string): string {
  const clean = value
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return /^[=+\-@]/.test(clean) ? `'${clean}` : clean;
}

function tz() {
  return process.env["APP_TIMEZONE"] || "Asia/Jakarta";
}

function autoValue(field: FormField): string {
  const now = new Date();
  const opts: Intl.DateTimeFormatOptions = { timeZone: tz() };
  if (field.kind === "date")
    return new Intl.DateTimeFormat("id-ID", {
      ...opts,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(now);
  if (field.kind === "time")
    return new Intl.DateTimeFormat("id-ID", {
      ...opts,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(now);
  return new Intl.DateTimeFormat("id-ID", {
    ...opts,
    dateStyle: "short",
    timeStyle: "medium",
  }).format(now);
}

export const getFormSchema = createServerFn({ method: "GET" }).handler(
  async (): Promise<FormSchema> => {
    const appName = process.env["APP_NAME"] || "Balai Labkesmas Magelang";
    try {
      const { readHeaders } = await import("./sheets.server");
      const headers = await readHeaders();
      if (headers.length === 0) return { fields: [], appName, error: "sheet" };
      return { fields: buildFields(headers), appName };
    } catch (e) {
      const code = e instanceof Error ? e.message : "";
      return {
        fields: [],
        appName,
        error: code === "CONFIG_MISSING" ? "config" : code === "SHEET_ACCESS" ? "sheet" : "unknown",
      };
    }
  },
);

export type SubmitResult =
  | { ok: true }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

export const submitEntry = createServerFn({ method: "POST" })
  .inputValidator((data: { values: Record<string, string> }) => {
    if (!data || typeof data !== "object" || typeof data.values !== "object")
      throw new Error("Permintaan tidak valid.");
    return data;
  })
  .handler(async ({ data }): Promise<SubmitResult> => {
    if (rateLimited(clientIp()))
      return { ok: false, message: "Terlalu banyak pengiriman. Mohon tunggu beberapa menit." };

    try {
      const { readHeaders, appendRow } = await import("./sheets.server");
      const headers = await readHeaders();
      const fields = buildFields(headers);

      const fieldErrors: Record<string, string> = {};
      for (const field of fields) {
        if (field.auto) continue;
        const err = validateValue(field, String(data.values[field.name] ?? ""));
        if (err) fieldErrors[field.name] = err;
      }
      if (Object.keys(fieldErrors).length > 0)
        return { ok: false, message: "Mohon periksa kembali isian Anda.", fieldErrors };

      const byIndex = new Map<number, string>();
      for (const field of fields) {
        const idx = Number(field.name.slice(1));
        const raw = field.auto
          ? autoValue(field)
          : sanitize(String(data.values[field.name] ?? "").slice(0, field.maxLength));
        byIndex.set(idx, raw);
      }
      const row = headers.map((_, i) => byIndex.get(i) ?? "");

      await appendRow(row);
      return { ok: true };
    } catch (e) {
      console.error("submitEntry failed", e);
      return {
        ok: false,
        message:
          "Data belum dapat disimpan saat ini. Isian Anda tetap tersimpan di layar, silakan coba lagi.",
      };
    }
  });
