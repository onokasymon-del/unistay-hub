import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Loader2,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Eye,
  Trash2,
  EyeOff,
  Home,
  Inbox,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth/auth-context";
import {
  adminListVerifications,
  adminDecideVerification,
  adminListAllHostels,
  adminSetHostelPublished,
  adminListAllReviews,
  adminDeleteReview,
  getVerificationDocSignedUrl,
  type VerificationWithLandlord,
  type Hostel,
  type Review,
} from "@/lib/hostels-api";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — UniStay" }] }),
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/login", search: { redirect: location.pathname } });
    }
  },
  component: AdminPage,
});

function AdminPage() {
  const { profile, loading } = useAuth();

  if (loading || !profile) {
    return (
      <div className="container-page py-12">
        <div className="h-32 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  if (profile.role !== "admin") {
    return (
      <div className="container-page py-12 text-center">
        <ShieldAlert className="mx-auto h-12 w-12 text-destructive" />
        <h1 className="mt-3 text-2xl font-bold">Access denied</h1>
        <p className="mt-1 text-sm text-muted-foreground">You need admin privileges to view this page.</p>
        <Link to="/" className="mt-5 inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground">
          Back home
        </Link>
      </div>
    );
  }

  return <AdminConsole />;
}

type Tab = "verifications" | "hostels" | "reviews";

function AdminConsole() {
  const [tab, setTab] = useState<Tab>("verifications");
  return (
    <div className="container-page py-8">
      <header className="mb-6 flex items-center gap-3">
        <ShieldCheck className="h-6 w-6 text-accent" />
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Admin panel</h1>
          <p className="text-sm text-muted-foreground">Moderate verifications, hostels, and reviews.</p>
        </div>
      </header>

      <div className="flex gap-2 border-b border-border overflow-x-auto">
        <Tab active={tab === "verifications"} onClick={() => setTab("verifications")} icon={<Inbox className="h-4 w-4" />}>
          Verifications
        </Tab>
        <Tab active={tab === "hostels"} onClick={() => setTab("hostels")} icon={<Home className="h-4 w-4" />}>
          Hostels
        </Tab>
        <Tab active={tab === "reviews"} onClick={() => setTab("reviews")} icon={<Star className="h-4 w-4" />}>
          Reviews
        </Tab>
      </div>

      <div className="mt-6">
        {tab === "verifications" && <VerificationsPanel />}
        {tab === "hostels" && <HostelsPanel />}
        {tab === "reviews" && <ReviewsPanel />}
      </div>
    </div>
  );
}

function VerificationsPanel() {
  const { user } = useAuth();
  const [items, setItems] = useState<VerificationWithLandlord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");

  async function refresh() {
    setLoading(true);
    try {
      setItems(await adminListVerifications());
    } catch (err: any) {
      toast.error(err?.message ?? "Could not load verifications");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function open(path: string) {
    try {
      const url = await getVerificationDocSignedUrl(path);
      window.open(url, "_blank", "noopener");
    } catch (err: any) {
      toast.error(err?.message ?? "Could not open document");
    }
  }

  async function decide(id: string, status: "approved" | "rejected") {
    if (!user) return;
    let notes: string | undefined;
    if (status === "rejected") {
      notes = window.prompt("Reason for rejection (visible to landlord):") ?? undefined;
      if (notes === undefined) return;
    }
    try {
      await adminDecideVerification(id, user.id, status, notes);
      toast.success(`Verification ${status}`);
      refresh();
    } catch (err: any) {
      toast.error(err?.message ?? "Could not update");
    }
  }

  const filtered = items.filter((i) => filter === "all" || i.status === filter);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {(["pending", "approved", "rejected", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`h-8 rounded-full px-3 text-xs font-semibold capitalize ${
              filter === f ? "bg-foreground text-background" : "bg-muted text-foreground hover:bg-muted/70"
            }`}
          >
            {f} ({items.filter((i) => f === "all" || i.status === f).length})
          </button>
        ))}
      </div>

      {loading ? (
        <Loading />
      ) : filtered.length === 0 ? (
        <Empty title="Nothing to review" body="No verification requests in this filter." />
      ) : (
        <div className="grid gap-3">
          {filtered.map((v) => (
            <article key={v.id} className="rounded-2xl border border-border bg-card p-4">
              <header className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{v.landlord.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {v.landlord.phone ?? "No phone"} • {v.landlord.institution_name ?? "—"}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase ${
                    v.status === "approved"
                      ? "bg-success/15 text-success"
                      : v.status === "rejected"
                      ? "bg-destructive/10 text-destructive"
                      : "bg-accent/15 text-accent"
                  }`}
                >
                  {v.status}
                </span>
              </header>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => open(v.id_document_path)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-semibold hover:bg-muted"
                >
                  <Eye className="h-3 w-3" /> National ID
                </button>
                <button
                  onClick={() => open(v.ownership_document_path)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-semibold hover:bg-muted"
                >
                  <Eye className="h-3 w-3" /> Ownership doc
                </button>
              </div>

              {v.admin_notes && (
                <p className="mt-3 rounded-lg bg-muted text-xs p-2">
                  <span className="font-semibold">Notes:</span> {v.admin_notes}
                </p>
              )}

              {v.status === "pending" && (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => decide(v.id, "approved")}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full bg-success px-4 text-xs font-semibold text-success-foreground"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Approve
                  </button>
                  <button
                    onClick={() => decide(v.id, "rejected")}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-4 text-xs font-semibold"
                  >
                    <XCircle className="h-4 w-4" /> Reject
                  </button>
                </div>
              )}

              <p className="mt-2 text-[11px] text-muted-foreground">
                Submitted {new Date(v.created_at).toLocaleString("en-KE")}
                {v.reviewed_at && ` • Reviewed ${new Date(v.reviewed_at).toLocaleString("en-KE")}`}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function HostelsPanel() {
  const [items, setItems] = useState<Hostel[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      setItems(await adminListAllHostels());
    } catch (err: any) {
      toast.error(err?.message ?? "Could not load hostels");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function togglePublish(h: Hostel) {
    try {
      await adminSetHostelPublished(h.id, !h.is_published);
      toast.success(h.is_published ? "Hostel unpublished" : "Hostel published");
      refresh();
    } catch (err: any) {
      toast.error(err?.message ?? "Could not update");
    }
  }

  if (loading) return <Loading />;
  if (items.length === 0) return <Empty title="No hostels yet" body="When landlords list, they'll appear here." />;

  return (
    <div className="grid gap-3">
      {items.map((h) => (
        <article key={h.id} className="flex flex-col sm:flex-row gap-4 rounded-2xl border border-border bg-card p-4">
          <img src={h.images[0]} alt={h.name} className="h-24 w-full sm:w-32 rounded-xl object-cover" />
          <div className="flex-1 min-w-0">
            <Link
              to="/hostel/$hostelId"
              params={{ hostelId: h.slug ?? h.id }}
              className="text-sm font-semibold hover:underline truncate block"
            >
              {h.name}
            </Link>
            <p className="text-xs text-muted-foreground truncate">{h.location} • {h.institution}</p>
            <p className="mt-1 text-xs">
              {h.slots_left}/{h.total_slots} slots • ⭐ {h.rating.toFixed(1)} ({h.reviews_count})
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase ${
                h.is_published ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
              }`}
            >
              {h.is_published ? "Live" : "Hidden"}
            </span>
            <button
              onClick={() => togglePublish(h)}
              className="inline-flex h-8 items-center gap-1 rounded-full border border-border px-3 text-xs font-semibold hover:bg-muted"
            >
              {h.is_published ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              {h.is_published ? "Unpublish" : "Publish"}
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

function ReviewsPanel() {
  const [items, setItems] = useState<(Review & { hostel_name: string })[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      setItems(await adminListAllReviews());
    } catch (err: any) {
      toast.error(err?.message ?? "Could not load reviews");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function remove(id: string) {
    if (!confirm("Delete this review?")) return;
    try {
      await adminDeleteReview(id);
      toast.success("Review removed");
      refresh();
    } catch (err: any) {
      toast.error(err?.message ?? "Could not delete");
    }
  }

  if (loading) return <Loading />;
  if (items.length === 0) return <Empty title="No reviews yet" body="Recent reviews show up here for moderation." />;

  return (
    <div className="grid gap-3">
      {items.map((r) => (
        <article key={r.id} className="rounded-2xl border border-border bg-card p-4">
          <header className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">{r.hostel_name}</p>
              <p className="text-xs text-muted-foreground">
                {"⭐".repeat(r.rating)} • {new Date(r.created_at).toLocaleDateString("en-KE")}
              </p>
            </div>
            <button
              onClick={() => remove(r.id)}
              className="inline-flex h-8 items-center gap-1 rounded-full border border-destructive/30 px-3 text-xs font-semibold text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3 w-3" /> Delete
            </button>
          </header>
          <p className="mt-2 text-sm">{r.comment || <em className="text-muted-foreground">No comment</em>}</p>
        </article>
      ))}
    </div>
  );
}

function Tab({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-4 py-3 text-sm font-semibold transition whitespace-nowrap ${
        active ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon} {children}
    </button>
  );
}

function Loading() {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground py-10">
      <Loader2 className="h-4 w-4 animate-spin" /> Loading…
    </div>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
