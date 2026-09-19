import { Outlet, createFileRoute, useLocation, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Download,
  Loader2,
  LogOut,
  Search,
  Users,
  TrendingUp,
  ClipboardList,
} from "lucide-react";
import { adminLogout, adminSession, exportEntriesCsv, getDashboard } from "@/lib/admin.functions";

const SESSION_TIMEOUT_MS = 8_000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("SESSION_TIMEOUT")), timeoutMs),
    ),
  ]);
}

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Dashboard Admin — Balai Labkesmas Magelang" },
      { name: "description", content: "Panel admin Buku Tamu Digital." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const location = useLocation();

  if (location.pathname === "/admin/login") return <Outlet />;
  return <AdminDashboardPage />;
}

function AdminDashboardPage() {
  const navigate = useNavigate();
  const logout = useServerFn(adminLogout);
  const exportCsv = useServerFn(exportEntriesCsv);

  const { data: session, isLoading: checking } = useQuery({
    queryKey: ["admin-session"],
    queryFn: () => withTimeout(adminSession(), SESSION_TIMEOUT_MS),
    staleTime: 0,
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => getDashboard(),
    enabled: session?.ok === true,
    retry: false,
    refetchInterval: 60_000,
  });

  const [query, setQuery] = useState("");
  const [field, setField] = useState("");
  const [fieldValue, setFieldValue] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (session && !session.ok) void navigate({ to: "/admin/login" });
  }, [session, navigate]);

  useEffect(() => {
    if (isError) setNotice("Data tidak dapat dimuat. Silakan muat ulang.");
  }, [isError]);

  const dateHeader = data?.dateHeader;

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    const selectedValue = fieldValue.trim().toLowerCase();
    return data.entries.filter((e) => {
      if (q && !Object.values(e.cells).some((v) => v.toLowerCase().includes(q))) return false;
      if (field && selectedValue && !(e.cells[field] ?? "").toLowerCase().includes(selectedValue)) return false;
      if ((from || to) && dateHeader) {
        const d = parseDate(e.cells[dateHeader] ?? "");
        if (!d) return false;
        if (from && d < new Date(from)) return false;
        if (to) {
          const end = new Date(to);
          end.setHours(23, 59, 59, 999);
          if (d > end) return false;
        }
      }
      return true;
    });
  }, [data, query, field, fieldValue, from, to, dateHeader]);

  async function handleLogout() {
    await logout();
    void navigate({ to: "/admin/login" });
  }

  async function handleExport() {
    setExporting(true);
    try {
      const res = await exportCsv({
        data: {
          from: from || undefined,
          to: to || undefined,
          field: field || undefined,
          value: fieldValue || undefined,
        },
      });
      const blob = new Blob(["﻿" + res.csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `buku-tamu-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setNotice(`${res.count} baris diekspor.`);
    } catch {
      setNotice("Ekspor gagal. Silakan coba lagi.");
    } finally {
      setExporting(false);
    }
  }

  if (checking)
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </main>
    );

  if (!session?.ok)
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-5">
        <div className="card-panel max-w-md p-8 text-center">
          <h1 className="text-xl font-semibold">Sesi admin tidak tersedia</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Server tidak merespons atau sesi Anda sudah berakhir. Silakan masuk kembali.
          </p>
          <button
            onClick={() => void navigate({ to: "/admin/login" })}
            className="mt-6 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
          >
            Ke halaman login
          </button>
        </div>
      </main>
    );

  return (
    <main className="min-h-screen bg-surface">
      <header className="sticky top-0 z-10 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="" className="h-9 w-9 rounded-xl" />
            <div className="leading-tight">
              <p className="text-sm font-semibold">Dashboard Buku Tamu</p>
              <p className="text-xs text-muted-foreground">Balai Labkesmas Magelang</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium transition-colors hover:bg-secondary"
          >
            <LogOut className="h-4 w-4" />
            Keluar
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-8">
        <section className="grid gap-4 sm:grid-cols-3">
          <Stat icon={CalendarDays} label="Kunjungan hari ini" value={data?.totalToday} />
          <Stat icon={TrendingUp} label="Bulan ini" value={data?.totalThisMonth} />
          <Stat icon={Users} label="Total kunjungan" value={data?.totalAll} />
        </section>

        <section className="card-panel mt-6 overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label htmlFor="search" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Cari di semua kolom
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Nama, instansi, keperluan…"
                  className="field-input focus:field-input-focus py-2.5 pl-9 text-sm"
                />
              </div>
            </div>
            {dateHeader && (
              <div className="flex gap-3">
                <div>
                  <label htmlFor="from" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Dari tanggal
                  </label>
                  <input
                    id="from"
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="field-input focus:field-input-focus px-3 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="to" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Sampai
                  </label>
                  <input
                    id="to"
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="field-input focus:field-input-focus px-3 py-2.5 text-sm"
                  />
                </div>
              </div>
            )}
            <div className="min-w-44">
              <label htmlFor="field-filter" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Filter kolom
              </label>
              <select
                id="field-filter"
                value={field}
                onChange={(e) => setField(e.target.value)}
                className="field-input focus:field-input-focus px-3 py-2.5 text-sm"
              >
                <option value="">Semua kolom</option>
                {data?.headers.map((header) => (
                  <option key={header} value={header}>
                    {header}
                  </option>
                ))}
              </select>
            </div>
            {field && (
              <div className="min-w-44">
                <label htmlFor="field-value" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Nilai kolom
                </label>
                <input
                  id="field-value"
                  value={fieldValue}
                  onChange={(e) => setFieldValue(e.target.value)}
                  placeholder="Cari nilai…"
                  className="field-input focus:field-input-focus px-3 py-2.5 text-sm"
                />
              </div>
            )}
            <button
              onClick={handleExport}
              disabled={exporting || !data}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-95 disabled:opacity-60"
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Ekspor CSV
            </button>
          </div>

          {notice && (
            <p className="border-b border-border bg-secondary px-4 py-2.5 text-sm text-secondary-foreground">
              {notice}
            </p>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center gap-3 p-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> Memuat data…
            </div>
          ) : !data || data.entries.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-16 text-muted-foreground">
              <ClipboardList className="h-8 w-8" />
              Belum ada data kunjungan.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/60">
                    {data.headers.map((h) => (
                      <th key={h} className="px-4 py-3 font-semibold whitespace-nowrap text-foreground">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 300).map((entry, i) => (
                    <tr key={i} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
                      {data.headers.map((h) => (
                        <td key={h} className="max-w-56 truncate px-4 py-3 text-muted-foreground" title={entry.cells[h]}>
                          {entry.cells[h] || "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="px-4 py-3 text-xs text-muted-foreground">
                Menampilkan {Math.min(filtered.length, 300)} dari {filtered.length} hasil
                {filtered.length !== data.entries.length && ` (${data.entries.length} total)`}.
                <button onClick={() => refetch()} className="ml-2 font-medium text-primary hover:underline">
                  Muat ulang
                </button>
              </p>
            </div>
          )}
        </section>

        <footer className="mt-8 border-t border-border pt-5 text-xs text-muted-foreground">
          Dikembangkan oleh Azhar Azziz untuk mendukung layanan kunjungan Balai Labkesmas Magelang.
        </footer>
      </div>
    </main>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: number | undefined;
}) {
  return (
    <div className="card-panel flex items-center gap-4 p-5">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-2xl font-semibold tabular-nums">{value ?? "…"}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function parseDate(raw: string): Date | null {
  const v = raw.trim();
  if (!v) return null;
  const m = v.match(/^(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})/);
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}
