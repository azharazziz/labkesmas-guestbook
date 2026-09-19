import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, LockKeyhole } from "lucide-react";
import { adminLogin, adminSession } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/login")({
  head: () => ({
    meta: [
      { title: "Masuk Admin — Balai Labkesmas Magelang" },
      { name: "description", content: "Halaman masuk admin Buku Tamu Digital." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLoginPage,
});

const LOGIN_TIMEOUT_MS = 12_000;
const SESSION_TIMEOUT_MS = 8_000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("LOGIN_TIMEOUT")), timeoutMs),
    ),
  ]);
}

function AdminLoginPage() {
  const navigate = useNavigate();
  const login = useServerFn(adminLogin);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: session } = useQuery({
    queryKey: ["admin-session"],
    queryFn: () => withTimeout(adminSession(), SESSION_TIMEOUT_MS),
    staleTime: 0,
  });

  useEffect(() => {
    if (session?.ok) void navigate({ to: "/admin" });
  }, [session, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await withTimeout(login({ data: { username, password } }), LOGIN_TIMEOUT_MS);
      if (res.ok) {
        void navigate({ to: "/admin" });
      } else {
        setError(res.message);
      }
    } catch (error) {
      setError(
        error instanceof Error && error.message === "LOGIN_TIMEOUT"
          ? "Server tidak merespons. Periksa konfigurasi deployment lalu coba lagi."
          : "Koneksi terputus. Silakan coba lagi.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-background px-5">
      <div className="pointer-events-none absolute inset-0 bg-molecular opacity-40" />
      <div className="card-panel relative w-full max-w-sm p-8">
        <div className="flex flex-col items-center text-center">
          <img src="/logo.svg" alt="" className="h-14 w-14 rounded-2xl" />
          <h1 className="mt-5 text-xl font-semibold">Masuk Admin</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Buku Tamu Digital — Balai Labkesmas Magelang
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-7 space-y-4" noValidate>
          <div>
            <label htmlFor="username" className="mb-2 block text-sm font-medium">
              Username
            </label>
            <input
              id="username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={busy}
              maxLength={100}
              className="field-input focus:field-input-focus"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
              maxLength={200}
              className="field-input focus:field-input-focus"
              required
            />
          </div>

          {error && <p className="rounded-xl bg-destructive/8 p-3 text-sm text-destructive">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 font-semibold text-primary-foreground transition-opacity hover:opacity-95 disabled:opacity-70"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
            {busy ? "Memeriksa…" : "Masuk"}
          </button>
        </form>

        <Link
          to="/"
          className="mt-6 block text-center text-sm text-muted-foreground hover:text-foreground"
        >
          ← Kembali ke buku tamu
        </Link>
      </div>
    </main>
  );
}
