import { useEffect, useState, type FormEvent } from "react";
import { X, ArrowRight, Loader2, Check } from "lucide-react";
import { useBookDemo } from "@/lib/book-demo-context";
import { useLocale } from "@/lib/i18n";

type Status = "idle" | "submitting" | "success" | "error";

export function BookDemoDialog() {
  const { open, closeDialog } = useBookDemo();
  const { t, isAr } = useLocale();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  // Lock scroll + esc to close
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeDialog();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, closeDialog]);

  // Reset state when closed
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStatus("idle");
        setError(null);
      }, 250);
    }
  }, [open]);

  if (!open) return null;

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const payload = {
      name: String(data.get("name") || "").trim(),
      company: String(data.get("company") || "").trim(),
      email: String(data.get("email") || "").trim(),
      phone: String(data.get("phone") || "").trim(),
      preferredDate: String(data.get("preferredDate") || "").trim(),
      language: String(data.get("language") || "either"),
      message: String(data.get("message") || "").trim(),
    };

    // basic client validation
    if (!payload.name || !payload.email || !payload.phone || !payload.message) {
      setStatus("error");
      setError(t("book.err.required"));
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(payload.email)) {
      setStatus("error");
      setError(t("book.err.email"));
      return;
    }

    setStatus("submitting");
    setError(null);
    try {
      const res = await fetch("/api/public/book-demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || "Request failed");
      }
      setStatus("success");
      form.reset();
    } catch (err) {
      setStatus("error");
      setError(t("book.err.generic"));
      console.error(err);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="book-demo-title"
      dir={isAr ? "rtl" : "ltr"}
    >
      {/* backdrop */}
      <button
        type="button"
        aria-label="Close"
        onClick={closeDialog}
        className="absolute inset-0 bg-ink/60 backdrop-blur-sm animate-in fade-in duration-200"
      />

      {/* panel */}
      <div className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl border border-hairline bg-paper shadow-[0_20px_80px_-20px_rgba(0,0,0,0.4)] animate-in fade-in zoom-in-95 duration-200">
        <button
          type="button"
          onClick={closeDialog}
          aria-label="Close"
          className="absolute end-4 top-4 grid place-items-center size-9 rounded-full border border-hairline text-ink hover:bg-sand transition-colors"
        >
          <X size={16} />
        </button>

        <div className="p-6 md:p-8">
          {status === "success" ? (
            <div className="py-8 text-center">
              <div className="mx-auto grid place-items-center size-14 rounded-full bg-pop text-paper">
                <Check size={26} />
              </div>
              <h2 className="mt-6 font-display uppercase text-ink text-3xl leading-[0.95]">
                {t("book.success.title")}
              </h2>
              <p className="mt-3 text-sm text-ink/70 leading-relaxed">
                {t("book.success.subtitle")}
              </p>
              <button
                onClick={closeDialog}
                className="mt-8 inline-flex items-center rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper hover:bg-pop transition-colors"
              >
                {t("book.success.close")}
              </button>
            </div>
          ) : (
            <>
              <span className="inline-flex items-center gap-2 rounded-full border border-hairline px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-ink/60 font-mono">
                <span className="size-1.5 rounded-full bg-pop" />
                {t("book.eyebrow")}
              </span>
              <h2
                id="book-demo-title"
                className="mt-4 font-display uppercase text-ink text-3xl md:text-4xl leading-[0.95]"
              >
                {t("book.title.a")} <span className="text-pop">{t("book.title.b")}</span>
              </h2>
              <p className="mt-3 text-sm text-ink/65 leading-relaxed">
                {t("book.subtitle")}
              </p>

              <form onSubmit={onSubmit} className="mt-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field name="name" label={t("book.f.name")} required />
                  <Field name="company" label={t("book.f.company")} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field name="email" label={t("book.f.email")} type="email" required />
                  <Field name="phone" label={t("book.f.phone")} type="tel" required />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field name="preferredDate" label={t("book.f.date")} type="date" />
                  <SelectField
                    name="language"
                    label={t("book.f.lang")}
                    options={[
                      { value: "either", label: t("book.lang.either") },
                      { value: "en", label: "English" },
                      { value: "ar", label: "العربية" },
                    ]}
                  />
                </div>
                <TextareaField name="message" label={t("book.f.message")} required />

                {error && (
                  <p className="text-xs text-red-600 dark:text-red-400" role="alert">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={status === "submitting"}
                  className="group relative w-full sm:w-auto inline-flex items-center gap-3 rounded-full bg-ink py-2 ps-6 pe-2 text-sm font-medium text-paper hover:bg-pop transition-colors disabled:opacity-70"
                >
                  {status === "submitting" ? t("book.cta.sending") : t("book.cta.submit")}
                  <span className="grid place-items-center size-10 rounded-full bg-paper text-ink group-hover:rotate-[-12deg] transition-transform">
                    {status === "submitting" ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <ArrowRight size={16} className="rtl:-scale-x-100" />
                    )}
                  </span>
                </button>
                <p className="text-[11px] text-ink/50 font-mono">{t("book.privacy")}</p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  name,
  label,
  type = "text",
  required,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-[0.16em] text-ink/55 font-mono mb-1.5">
        {label}
        {required && <span className="text-pop"> *</span>}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        className="w-full rounded-xl border border-hairline bg-paper px-4 py-2.5 text-sm text-ink placeholder:text-ink/40 outline-none focus:border-ink transition-colors"
      />
    </label>
  );
}

function SelectField({
  name,
  label,
  options,
}: {
  name: string;
  label: string;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-[0.16em] text-ink/55 font-mono mb-1.5">
        {label}
      </span>
      <select
        name={name}
        defaultValue="either"
        className="w-full rounded-xl border border-hairline bg-paper px-4 py-2.5 text-sm text-ink outline-none focus:border-ink transition-colors"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextareaField({
  name,
  label,
  required,
}: {
  name: string;
  label: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-[0.16em] text-ink/55 font-mono mb-1.5">
        {label}
        {required && <span className="text-pop"> *</span>}
      </span>
      <textarea
        name={name}
        required={required}
        rows={4}
        className="w-full rounded-xl border border-hairline bg-paper px-4 py-2.5 text-sm text-ink placeholder:text-ink/40 outline-none focus:border-ink transition-colors resize-none"
      />
    </label>
  );
}
