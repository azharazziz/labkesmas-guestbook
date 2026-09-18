import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, FlaskConical, Loader2, AlertTriangle } from "lucide-react";
import { getFormSchema, submitEntry } from "@/lib/guestbook.functions";
import { validateValue, type FormField } from "@/lib/field-schema";

const schemaQuery = queryOptions({
  queryKey: ["guestbook-schema"],
  queryFn: () => getFormSchema(),
  staleTime: 60_000,
});

export const Route = createFileRoute("/buku-tamu")({
  head: () => ({
    meta: [
      { title: "Isi Buku Tamu — Balai Labkesmas Magelang" },
      {
        name: "description",
        content:
          "Formulir kunjungan Balai Laboratorium Kesehatan Masyarakat Magelang. Lengkapi data Anda untuk tercatat dalam buku tamu digital.",
      },
      { property: "og:title", content: "Isi Buku Tamu — Balai Labkesmas Magelang" },
      { property: "og:description", content: "Lengkapi data kunjungan Anda." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GuestbookPage,
});

const IDLE_RESET_MS = 3 * 60 * 1000;
const THANKS_RESET_MS = 10_000;

const inputClass =
  "field-input focus:field-input-focus placeholder:text-muted-foreground/60 disabled:opacity-60";

function GuestbookPage() {
  const { data, isLoading, refetch } = useQuery(schemaQuery);
  const submit = useServerFn(submitEntry);

  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fields = (data?.fields ?? []).filter((f) => !f.auto);
  const autoFields = data?.fields.filter((f) => f.auto) ?? [];

  const reset = useCallback(() => {
    setValues({});
    setErrors({});
    setFormError(null);
    setDone(false);
  }, []);

  // Kiosk: auto-reset setelah tidak ada aktivitas.
  useEffect(() => {
    const bump = () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(reset, IDLE_RESET_MS);
    };
    bump();
    const events = ["pointerdown", "keydown", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, bump));
    return () => {
      events.forEach((e) => window.removeEventListener(e, bump));
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [reset]);

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(reset, THANKS_RESET_MS);
    return () => clearTimeout(t);
  }, [done, reset]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    const localErrors: Record<string, string> = {};
    for (const field of fields) {
      const err = validateValue(field, values[field.name] ?? "");
      if (err) localErrors[field.name] = err;
    }
    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors);
      setFormError("Mohon periksa kembali isian Anda.");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const result = await submit({ data: { values } });
      if (result.ok) {
        setDone(true);
      } else {
        setErrors(result.fieldErrors ?? {});
        setFormError(result.message);
      }
    } catch {
      setFormError("Koneksi terputus. Isian Anda masih tersimpan, silakan coba kirim lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="relative min-h-screen bg-background">
      <div className="pointer-events-none absolute inset-0 bg-molecular opacity-50" />
      <div className="relative mx-auto flex min-h-screen max-w-2xl flex-col px-5 py-8 sm:px-8 sm:py-12">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <FlaskConical className="h-5 w-5" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold">Buku Tamu Digital</p>
              <p className="text-xs text-muted-foreground">Balai Labkesmas Magelang</p>
            </div>
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Beranda
          </Link>
        </header>

        <div className="mt-8 flex-1">
          {done ? (
            <ThankYou onReset={reset} />
          ) : isLoading ? (
            <div className="card-panel flex items-center justify-center gap-3 p-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Menyiapkan formulir…
            </div>
          ) : data?.error || fields.length === 0 ? (
            <SchemaError kind={data?.error} onRetry={() => refetch()} />
          ) : (
            <form onSubmit={handleSubmit} className="card-panel p-6 sm:p-8" noValidate>
              <h1 className="text-xl font-semibold sm:text-2xl">Data Kunjungan</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Isi kolom berikut dengan lengkap.
                {autoFields.length > 0 && (
                  <>
                    {" "}
                    {autoFields.map((f) => f.header).join(" dan ")} terisi otomatis.
                  </>
                )}
              </p>

              <div className="mt-7 space-y-5">
                {fields.map((field) => (
                  <Field
                    key={field.name}
                    field={field}
                    value={values[field.name] ?? ""}
                    error={errors[field.name]}
                    disabled={submitting}
                    onChange={(v) => {
                      setValues((prev) => ({ ...prev, [field.name]: v }));
                      if (errors[field.name])
                        setErrors((prev) => {
                          const next = { ...prev };
                          delete next[field.name];
                          return next;
                        });
                    }}
                  />
                ))}
              </div>

              {formError && (
                <p className="mt-6 flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/8 p-3 text-sm text-destructive">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  {formError}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow-[var(--shadow-soft)] transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting && <Loader2 className="h-5 w-5 animate-spin" />}
                {submitting ? "Menyimpan…" : "Kirim Data Kunjungan"}
              </button>
            </form>
          )}
        </div>

        <footer className="mt-10 border-t border-border pt-5 text-center text-xs text-muted-foreground">
          Data Anda digunakan hanya untuk pencatatan kunjungan resmi.
        </footer>
      </div>
    </main>
  );
}

function Field({
  field,
  value,
  error,
  disabled,
  onChange,
}: {
  field: FormField;
  value: string;
  error?: string | undefined;
  disabled: boolean;
  onChange: (v: string) => void;
}) {
  const id = `field-${field.name}`;
  const common = {
    id,
    value,
    disabled,
    maxLength: field.maxLength,
    placeholder: field.placeholder,
    "aria-invalid": Boolean(error),
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(e.target.value),
    className: `${inputClass}${error ? " border-destructive" : ""}`,
  };

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-foreground">
        {field.header}
        {field.required && <span className="ml-1 text-destructive">*</span>}
      </label>
      {field.kind === "textarea" ? (
        <textarea {...common} rows={3} />
      ) : (
        <input
          {...common}
          type={
            field.kind === "email"
              ? "email"
              : field.kind === "tel"
                ? "tel"
                : field.kind === "date"
                  ? "date"
                  : field.kind === "time"
                    ? "time"
                    : "text"
          }
          inputMode={
            field.kind === "nik" || field.kind === "number"
              ? "numeric"
              : field.kind === "tel"
                ? "tel"
                : undefined
          }
        />
      )}
      {error && <p className="mt-1.5 text-sm text-destructive">{error}</p>}
    </div>
  );
}

function ThankYou({ onReset }: { onReset: () => void }) {
  return (
    <div className="card-panel flex flex-col items-center p-10 text-center sm:p-14">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-success/12 text-success">
        <CheckCircle2 className="h-9 w-9" />
      </span>
      <h1 className="mt-6 text-2xl font-semibold sm:text-3xl">Terima Kasih</h1>
      <p className="mt-3 max-w-sm text-muted-foreground">
        Data kunjungan Anda sudah tercatat. Semoga urusan Anda di Balai Labkesmas Magelang berjalan
        lancar.
      </p>
      <button
        onClick={onReset}
        className="mt-8 rounded-xl border border-border bg-card px-6 py-3 text-sm font-semibold transition-colors hover:bg-secondary"
      >
        Isi untuk tamu berikutnya
      </button>
      <p className="mt-4 text-xs text-muted-foreground">
        Layar kembali otomatis dalam beberapa detik.
      </p>
    </div>
  );
}

function SchemaError({ kind, onRetry }: { kind?: string | undefined; onRetry: () => void }) {
  const message =
    kind === "config"
      ? "Konfigurasi Google Sheets belum lengkap. Mohon hubungi petugas."
      : kind === "sheet"
        ? "Lembar buku tamu belum dapat dibaca. Mohon hubungi petugas."
        : "Formulir belum dapat dimuat saat ini.";
  return (
    <div className="card-panel flex flex-col items-center p-10 text-center">
      <AlertTriangle className="h-8 w-8 text-destructive" />
      <p className="mt-4 max-w-sm text-muted-foreground">{message}</p>
      <button
        onClick={onRetry}
        className="mt-6 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
      >
        Coba lagi
      </button>
    </div>
  );
}
