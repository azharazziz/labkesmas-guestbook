import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, CheckCircle2, CircleHelp, FlaskConical, Loader2 } from "lucide-react";
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

  const fields = (data?.fields ?? []).filter((f) => !f.auto && !f.hidden);
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
    <main className="relative min-h-screen bg-atmosphere">
      <div className="pointer-events-none absolute inset-0 bg-molecular opacity-55" />
      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col px-5 py-5 sm:px-8 sm:py-8 lg:px-10">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <FlaskConical className="h-5 w-5" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-bold">Buku Tamu Digital</p>
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
            <form onSubmit={handleSubmit} className="card-panel overflow-hidden" noValidate>
              <div className="border-b border-border bg-card px-6 py-6 sm:px-9 sm:py-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="eyebrow">Langkah 1 dari 1</p>
                    <h1 className="mt-3 font-display text-2xl font-semibold sm:text-3xl">Data kunjungan</h1>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                      Isi informasi berikut agar kunjungan Anda dapat kami catat dengan tepat.
                    </p>
                  </div>
                  <span className="flex w-fit items-center gap-2 rounded-full bg-success/10 px-3 py-2 text-xs font-semibold text-success"><CircleHelp className="h-4 w-4" /> Formulir aman
                  </span>
                </div>
                {autoFields.length > 0 && (
                  <p className="mt-5 flex items-start gap-2 rounded-xl bg-surface px-4 py-3 text-xs leading-5 text-muted-foreground">
                    <CircleHelp className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {autoFields.map((f) => f.header).join(" dan ")} akan diisi otomatis oleh sistem.
                  </p>
                )}
              </div>

              <div className="px-6 py-6 sm:px-9 sm:py-8">
                <div className="grid gap-x-5 gap-y-6 sm:grid-cols-2">
                  {fields.map((field) => (
                    <div key={field.name} className={field.kind === "textarea" || field.kind === "radio" || field.kind === "checkbox" ? "sm:col-span-2" : ""}>
                      <Field
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
                    </div>
                  ))}
                </div>

                {formError && (
                  <p className="mt-7 flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/8 p-4 text-sm text-destructive">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    {formError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-7 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 text-base font-bold text-primary-foreground shadow-(--shadow-soft) transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
                >
                  {submitting && <Loader2 className="h-5 w-5 animate-spin" />}
                  {submitting ? "Menyimpan…" : "Kirim data kunjungan"}
                </button>
                <p className="mt-3 text-center text-xs text-muted-foreground">Pastikan data yang diisi sudah benar sebelum dikirim.</p>
              </div>
            </form>
          )}
        </div>

        <footer className="mt-10 border-t border-border pt-5 text-center text-xs text-muted-foreground">
          <p>Data Anda digunakan hanya untuk pencatatan kunjungan resmi.</p>
          <p className="mt-1 text-[11px] text-muted-foreground/75">Dikembangkan oleh Azhar Azziz untuk mendukung layanan kunjungan Balai Labkesmas Magelang.</p>
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

  const choiceClass =
    "flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5 text-sm transition-colors hover:border-primary/40 has-checked:border-primary has-checked:bg-primary/5 has-checked:text-primary has-checked:font-medium";

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-foreground">
        {field.label}
        {field.required && <span className="ml-1 text-destructive">*</span>}
      </label>
      {field.kind === "textarea" ? (
        <textarea {...common} rows={3} />
      ) : field.kind === "select" ? (
        <select
          id={id}
          value={value}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputClass}${error ? " border-destructive" : ""} ${value ? "" : "text-muted-foreground"}`}
        >
          <option value="">{field.placeholder || "Pilih salah satu…"}</option>
          {(field.options ?? []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : field.kind === "radio" || field.kind === "checkbox" ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {(field.options ?? []).map((opt) => {
            const checked =
              field.kind === "checkbox" ? value.split(" | ").includes(opt) : value === opt;
            return (
              <label key={opt} className={choiceClass}>
                <input
                  type={field.kind === "checkbox" ? "checkbox" : "radio"}
                  name={id}
                  checked={checked}
                  disabled={disabled}
                  onChange={() => {
                    if (field.kind === "radio") onChange(opt);
                    else {
                      const set = new Set(value ? value.split(" | ").filter(Boolean) : []);
                      if (checked) set.delete(opt);
                      else set.add(opt);
                      onChange(Array.from(set).join(" | "));
                    }
                  }}
                  className="h-4 w-4 accent-(--color-primary)"
                />
                {opt}
              </label>
            );
          })}
        </div>
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
                    : field.kind === "datetime"
                      ? "datetime-local"
                          : field.kind === "number"
                            ? "number"
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
      {field.helpText && !error && (
        <p className="mt-1.5 text-xs text-muted-foreground">{field.helpText}</p>
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
