import { createFileRoute, Link } from "@tanstack/react-router";
import { FlaskConical, ShieldCheck, Clock3, ArrowRight } from "lucide-react";

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
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-molecular opacity-70" />
      <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-10 sm:px-10">
        <header className="flex items-center gap-3">
          <img src="/logo.svg" alt="Logo Balai Labkesmas Magelang" className="h-12 w-12 rounded-xl" />
          <div className="leading-tight">
            <p className="text-sm font-semibold text-foreground">Balai Labkesmas Magelang</p>
            <p className="text-xs text-muted-foreground">Kementerian Kesehatan Republik Indonesia</p>
          </div>
        </header>

        <section className="flex flex-1 flex-col justify-center py-14">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Buku Tamu Digital
          </span>

          <h1 className="mt-6 max-w-3xl text-3xl leading-tight font-semibold text-foreground sm:text-4xl lg:text-5xl">
            Balai Laboratorium Kesehatan Masyarakat Magelang
          </h1>

          <p className="mt-6 text-2xl font-medium text-primary sm:text-3xl">Selamat Datang</p>
          <p className="mt-2 max-w-xl text-base text-muted-foreground sm:text-lg">
            Silakan lengkapi data kunjungan Anda.
          </p>

          <div className="mt-10">
            <Link
              to="/buku-tamu"
              className="inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-primary px-8 py-5 text-lg font-semibold text-primary-foreground shadow-[var(--shadow-lift)] transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring sm:w-auto sm:px-12 sm:py-6 sm:text-xl"
            >
              Mulai Isi Buku Tamu
              <ArrowRight className="h-6 w-6" />
            </Link>
          </div>

          <dl className="mt-14 grid gap-4 sm:grid-cols-3">
            {[
              { icon: Clock3, title: "Cepat", desc: "Pengisian kurang dari satu menit." },
              { icon: ShieldCheck, title: "Aman", desc: "Data tersimpan langsung ke arsip resmi." },
              { icon: FlaskConical, title: "Terpadu", desc: "Formulir mengikuti kebutuhan layanan." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card-panel p-5">
                <Icon className="h-5 w-5 text-primary" />
                <dt className="mt-3 text-sm font-semibold text-foreground">{title}</dt>
                <dd className="mt-1 text-sm text-muted-foreground">{desc}</dd>
              </div>
            ))}
          </dl>
        </section>

        <footer className="border-t border-border pt-6 text-xs text-muted-foreground">
          © {new Date().getFullYear()} Balai Laboratorium Kesehatan Masyarakat Magelang
        </footer>
      </div>
    </main>
  );
}
