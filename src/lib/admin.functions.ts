import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";

const loginSchema = z.object({
  username: z.string().trim().min(1).max(100),
  password: z.string().min(1).max(200),
});

// Login rate limit (per IP)
const attempts = new Map<string, number[]>();
function tooManyAttempts(ip: string) {
  const now = Date.now();
  const list = (attempts.get(ip) ?? []).filter((t) => now - t < 10 * 60 * 1000);
  list.push(now);
  attempts.set(ip, list);
  return list.length > 10;
}

async function requireSession(): Promise<void> {
  const { verifySession, readSessionCookie } = await import("./admin-auth.server");
  const ok = await verifySession(readSessionCookie(getRequestHeader("cookie")));
  if (!ok) throw new Response("Unauthorized", { status: 401 });
}

function clientIp() {
  return (
    getRequestHeader("cf-connecting-ip") ||
    getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => loginSchema.parse(data))
  .handler(async ({ data }) => {
    if (tooManyAttempts(clientIp()))
      return { ok: false as const, message: "Terlalu banyak percobaan. Coba lagi nanti." };
    try {
      const { checkCredentials, sessionCookie } = await import("./admin-auth.server");
      if (!(await checkCredentials(data.username, data.password))) {
        await new Promise((r) => setTimeout(r, 600));
        return { ok: false as const, message: "Username atau password salah." };
      }
      setResponseHeader("set-cookie", await sessionCookie());
      return { ok: true as const };
    } catch (e) {
      console.error("adminLogin failed", e);
      return { ok: false as const, message: "Login belum tersedia. Mohon hubungi pengelola." };
    }
  });

export const adminLogout = createServerFn({ method: "POST" }).handler(async () => {
  const { clearCookie } = await import("./admin-auth.server");
  setResponseHeader("set-cookie", clearCookie());
  return { ok: true };
});

export const adminSession = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { verifySession, readSessionCookie } = await import("./admin-auth.server");
    return { ok: await verifySession(readSessionCookie(getRequestHeader("cookie"))) };
  } catch {
    return { ok: false };
  }
});

export type GuestEntry = { cells: Record<string, string> };
export type DashboardData = {
  headers: string[];
  entries: GuestEntry[];
  totalToday: number;
  totalThisMonth: number;
  totalAll: number;
  dateHeader?: string;
};

function parseDateLoose(raw: string): Date | null {
  const v = raw.trim();
  if (!v) return null;
  const m = v.match(/^(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})/); // dd/mm/yyyy
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export const getDashboard = createServerFn({ method: "GET" }).handler(
  async (): Promise<DashboardData> => {
    await requireSession();
    const { readAllRows } = await import("./sheets.server");
    const { headers, rows } = await readAllRows();

    const dateHeader = headers.find((h) => /tanggal|date|tgl|timestamp|waktu/i.test(h));
    const dateIdx = dateHeader ? headers.indexOf(dateHeader) : -1;

    const entries: GuestEntry[] = rows.map((row) => ({
      cells: Object.fromEntries(headers.map((h, i) => [h, row[i] ?? ""])),
    }));

    const now = new Date();
    let totalToday = 0;
    let totalThisMonth = 0;
    for (const e of entries) {
      const raw = dateIdx >= 0 ? e.cells[dateHeader!] : "";
      const d = raw ? parseDateLoose(raw) : null;
      if (!d) continue;
      if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) {
        totalThisMonth++;
        if (d.getDate() === now.getDate()) totalToday++;
      }
    }

    return {
      headers,
      entries: entries.reverse(),
      totalToday,
      totalThisMonth,
      totalAll: entries.length,
      ...(dateHeader ? { dateHeader } : {}),
    };
  },
);

export const exportEntriesCsv = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        from: z.string().max(30).optional(),
        to: z.string().max(30).optional(),
        field: z.string().max(200).optional(),
        value: z.string().max(500).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    await requireSession();
    const { readAllRows } = await import("./sheets.server");
    const { headers, rows } = await readAllRows();

    const dateHeader = headers.find((h) => /tanggal|date|tgl|timestamp|waktu/i.test(h));
    const dateIdx = dateHeader ? headers.indexOf(dateHeader) : -1;
    const from = data.from ? new Date(data.from) : null;
    const to = data.to ? new Date(data.to) : null;
    const fieldIndex = data.field ? headers.indexOf(data.field) : -1;
    const fieldValue = data.value?.trim().toLowerCase() ?? "";
    if (to) to.setHours(23, 59, 59, 999);

    const filtered = rows.filter((row) => {
      if (fieldIndex >= 0 && fieldValue && !(row[fieldIndex] ?? "").toLowerCase().includes(fieldValue))
        return false;
      if (!from && !to) return true;
      if (dateIdx < 0) return true;
      const d = parseDateLoose(row[dateIdx] ?? "");
      if (!d) return false;
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });

    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const csv = [headers.map(esc).join(","), ...filtered.map((r) => headers.map((_, i) => esc(r[i] ?? "")).join(","))].join("\r\n");
    return { ok: true as const, csv, count: filtered.length };
  });
