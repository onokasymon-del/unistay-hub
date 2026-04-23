import { useEffect, useState, type FormEvent } from "react";
import { Loader2, ShieldCheck, ShieldAlert, Clock, Upload } from "lucide-react";
import { toast } from "sonner";
import { getMyVerification, submitVerification, type LandlordVerification } from "@/lib/hostels-api";

const MAX_BYTES = 10 * 1024 * 1024;

interface Props {
  landlordId: string;
  onChanged?: () => void;
}

export function VerificationCard({ landlordId, onChanged }: Props) {
  const [verification, setVerification] = useState<LandlordVerification | null>(null);
  const [loading, setLoading] = useState(true);
  const [idDoc, setIdDoc] = useState<File | null>(null);
  const [ownDoc, setOwnDoc] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      setVerification(await getMyVerification(landlordId));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, [landlordId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!idDoc || !ownDoc) {
      toast.error("Both documents are required");
      return;
    }
    if (idDoc.size > MAX_BYTES || ownDoc.size > MAX_BYTES) {
      toast.error("Each document must be under 10MB");
      return;
    }
    setSubmitting(true);
    try {
      await submitVerification(landlordId, idDoc, ownDoc);
      toast.success("Submitted! An admin will review shortly.");
      setIdDoc(null);
      setOwnDoc(null);
      await refresh();
      onChanged?.();
    } catch (err: any) {
      toast.error(err?.message ?? "Could not submit");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading verification…
      </div>
    );
  }

  const status = verification?.status;

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-start gap-3">
        {status === "approved" ? (
          <ShieldCheck className="h-6 w-6 text-success shrink-0" />
        ) : status === "rejected" ? (
          <ShieldAlert className="h-6 w-6 text-destructive shrink-0" />
        ) : status === "pending" ? (
          <Clock className="h-6 w-6 text-accent shrink-0" />
        ) : (
          <ShieldAlert className="h-6 w-6 text-muted-foreground shrink-0" />
        )}
        <div className="flex-1">
          <h3 className="text-base font-semibold">
            {status === "approved"
              ? "Verified landlord"
              : status === "pending"
              ? "Verification pending"
              : status === "rejected"
              ? "Verification rejected"
              : "Get verified to publish hostels"}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {status === "approved"
              ? "Students see a verified badge on your listings."
              : status === "pending"
              ? "Our team is reviewing your documents (usually within 24 hours)."
              : status === "rejected"
              ? "Please re-upload corrected documents below."
              : "Upload your National ID and a proof of ownership document. Reviewed in ~24 hours."}
          </p>
          {status === "rejected" && verification?.admin_notes && (
            <p className="mt-2 rounded-lg bg-destructive/10 text-destructive text-xs p-2">
              <span className="font-semibold">Reason:</span> {verification.admin_notes}
            </p>
          )}
        </div>
      </div>

      {(status !== "approved" && status !== "pending") && (
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <FileField
            label="National ID (front and back combined as one file)"
            value={idDoc}
            onChange={setIdDoc}
            hint="JPG, PNG, or PDF up to 10MB"
          />
          <FileField
            label="Proof of ownership (title deed, lease, or utility bill)"
            value={ownDoc}
            onChange={setOwnDoc}
            hint="JPG, PNG, or PDF up to 10MB"
          />
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-accent text-sm font-semibold text-accent-foreground shadow-[var(--shadow-cta)] disabled:opacity-60"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Submit for verification
          </button>
        </form>
      )}
    </div>
  );
}

function FileField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: File | null;
  onChange: (f: File | null) => void;
  hint: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <div className="mt-1 flex items-center gap-3 rounded-lg border border-input bg-background p-3">
        <input
          type="file"
          accept="image/*,application/pdf"
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
          className="text-xs file:mr-3 file:rounded-full file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-secondary-foreground"
        />
      </div>
      <span className="mt-1 block text-[11px] text-muted-foreground">
        {value ? `${value.name} (${(value.size / 1024 / 1024).toFixed(2)} MB)` : hint}
      </span>
    </label>
  );
}
