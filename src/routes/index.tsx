import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BadgeCheck, Clock3, FlaskConical, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Buku Tamu Digital — Balai Labkesmas Magelang" },
      {
        name: "description",
        content:
          "Buku tamu digital Balai Laboratorium Kesehatan Masyarakat Magelang. Catat kunjungan Anda dengan cepat dan aman.",
      },
      { property: "og:title", content: "Buku Tamu Digital — Balai Labkesmas Magelang" },
      {
        property: "og:description",
        content: "Selamat datang. Silakan lengkapi data kunjungan Anda.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-atmosphere">
      <div className="pointer-events-none absolute inset-0 bg-molecular opacity-60" />

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-5 py-5 sm:px-8 sm:py-8 lg:px-12">
        <header className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <img src="/logo.svg" alt="Logo Balai Labkesmas Magelang" className="h-11 w-11 shrink-0 rounded-2xl sm:h-12 sm:w-12" />
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-bold text-foreground sm:text-base">Balai Labkesmas Magelang</p>
              <p className="truncate text-[11px] text-muted-foreground sm:text-xs">Kementerian Kesehatan Republik Indonesia</p>
            </div>
          </div>
          <span className="hidden items-center gap-2 rounded-full border border-primary/15 bg-card/70 px-3 py-2 text-xs font-medium text-primary shadow-sm sm:inline-flex">
            <span className="h-2 w-2 rounded-full bg-accent" /> Layanan kunjungan
          </span>
        </header>

        <section className="grid flex-1 items-center gap-10 py-12 sm:py-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:py-20">
          <div className="animate-rise">
            <p className="eyebrow"><span className="h-1.5 w-1.5 rounded-full bg-accent" /> Buku Tamu Digital</p>
            <h1 className="mt-5 max-w-2xl font-display text-4xl leading-[1.05] font-semibold text-foreground sm:text-5xl lg:text-6xl">
              Selamat datang di ruang layanan kami.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
              Catat kunjungan Anda dengan singkat, nyaman, dan aman. Data akan tersimpan langsung pada arsip resmi Balai Labkesmas Magelang.
            </p>
            <Link
              to="/buku-tamu"
              className="mt-8 inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-primary px-7 py-4 text-base font-bold text-primary-foreground shadow-(--shadow-lift) transition-transform duration-200 hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring sm:w-auto sm:px-9"
            >
              Mulai isi buku tamu
              <ArrowRight className="h-5 w-5" />
            </Link>
            <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><BadgeCheck className="h-4 w-4 text-success" /> Pengisian membutuhkan waktu kurang dari satu menit</p>
          </div>

          <div className="relative animate-rise-delayed">
            <div className="relative overflow-hidden rounded-[2rem] border border-primary/10 bg-card p-5 shadow-(--shadow-lift) sm:p-7">
              <div className="flex items-start justify-between border-b border-border pb-5">
                <div>
                  <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">Kunjungan hari ini</p>
                  <p className="mt-2 text-2xl font-bold text-foreground">Dimulai dari sini</p>
                </div>
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><FlaskConical className="h-5 w-5" /></span>
              </div>
              <div className="space-y-3 py-6">
                {["Data diri", "Informasi kunjungan", "Konfirmasi"].map((step, index) => (
                  <div key={step} className="flex items-center gap-3 rounded-xl bg-surface px-4 py-3">
                    <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${index === 0 ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}>{index + 1}</span>
                    <span className="text-sm font-semibold text-foreground">{step}</span>
                    {index === 0 && <span className="ml-auto text-xs text-primary">Mudah</span>}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent-foreground"><ShieldCheck className="h-5 w-5 shrink-0" /><span>Data dicatat untuk kebutuhan layanan resmi.</span></div>
            </div>
          </div>
        </section>

        <footer className="flex flex-col gap-2 border-t border-border pt-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p>© {new Date().getFullYear()} Balai Laboratorium Kesehatan Masyarakat Magelang</p>
            <p className="mt-1 text-[11px] text-muted-foreground/75">Dikembangkan oleh Azhar Azziz untuk mendukung layanan kunjungan.</p>
          </div>
          <span className="flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" /> Layanan cepat dan tertib</span>
        </footer>
      </div>
    </main>
  );
}
