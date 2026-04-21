import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";
import { z } from "zod";
import { ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import {
  INSTITUTIONS_BY_TYPE,
  INSTITUTION_TYPE_LABELS,
  type InstitutionType,
} from "@/data/institutions";
import { toast } from "sonner";

export const Route = createFileRoute("/signup/student")({
  head: () => ({
    meta: [
      { title: "Student signup — UniStay" },
      { name: "description", content: "Create your free UniStay student account in seconds." },
    ],
  }),
  component: StudentSignup,
});

const schema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name").max(100),
  email: z.string().trim().email("Enter a valid email").max(255),
  phone: z
    .string()
    .trim()
    .regex(/^(\+?254|0)?[17]\d{8}$/, "Enter a valid Kenyan phone number")
    .max(20),
  institution_type: z.enum(["university", "college", "tti"]),
  institution_name: z.string().trim().min(2, "Pick your institution").max(120),
  password: z.string().min(6, "At least 6 characters").max(128),
});

function StudentSignup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    institution_type: "university" as InstitutionType,
    institution_name: "",
    password: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const institutions = useMemo(() => INSTITUTIONS_BY_TYPE[form.institution_type], [form.institution_type]);

  const update = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          full_name: parsed.data.full_name,
          phone: parsed.data.phone,
          role: "student",
          institution_type: parsed.data.institution_type,
          institution_name: parsed.data.institution_name,
        },
      },
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Account created! Check your email to confirm.");
    navigate({ to: "/" });
  };

  const handleGoogle = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/",
      extraParams: { role: "student" },
    });
    if (result.error) toast.error(result.error.message ?? "Google sign-in failed");
  };

  return (
    <div className="container-page max-w-xl py-10">
      <Link to="/signup" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <div className="mt-4 rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight">Create student account</h1>
        <p className="mt-1 text-sm text-muted-foreground">Find and book hostels near your campus.</p>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={submitting}
          className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-border bg-background text-sm font-medium hover:bg-muted disabled:opacity-60"
        >
          Continue with Google
        </button>

        <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          OR
          <span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Full name">
            <input
              required
              value={form.full_name}
              onChange={(e) => update("full_name", e.target.value)}
              className={inputCls}
              autoComplete="name"
            />
          </Field>
          <Field label="Email">
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              className={inputCls}
              autoComplete="email"
            />
          </Field>
          <Field label="Phone number">
            <input
              required
              type="tel"
              placeholder="07XX XXX XXX"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              className={inputCls}
              autoComplete="tel"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Institution type">
              <select
                value={form.institution_type}
                onChange={(e) => {
                  update("institution_type", e.target.value as InstitutionType);
                  update("institution_name", "");
                }}
                className={inputCls}
              >
                {(Object.keys(INSTITUTION_TYPE_LABELS) as InstitutionType[]).map((t) => (
                  <option key={t} value={t}>
                    {INSTITUTION_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Institution name">
              <select
                required
                value={form.institution_name}
                onChange={(e) => update("institution_name", e.target.value)}
                className={inputCls}
              >
                <option value="">Select…</option>
                {institutions.map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Password">
            <input
              required
              type="password"
              minLength={6}
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              className={inputCls}
              autoComplete="new-password"
            />
          </Field>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-11 w-full items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground shadow-[var(--shadow-cta)] hover:opacity-95 disabled:opacity-60"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Have an account?{" "}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

const inputCls =
  "h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <span className="mt-1 block">{children}</span>
    </label>
  );
}
