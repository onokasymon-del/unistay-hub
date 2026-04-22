import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, XCircle, Clock, Heart, Home, Inbox } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth/auth-context";
import {
  listMyBookings,
  listIncomingBookings,
  listWishlistedHostels,
  updateBookingStatus,
  type BookingWithHostel,
  type IncomingBooking,
  type Hostel,
  type BookingStatus,
} from "@/lib/hostels-api";
import { HostelCard } from "@/components/hostel-card";
import { formatPrice } from "@/lib/format";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — UniStay" }] }),
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/login", search: { redirect: location.pathname } });
    }
  },
  component: DashboardPage,
});

const STATUS_STYLES: Record<BookingStatus, string> = {
  pending: "bg-accent/15 text-accent",
  approved: "bg-success/15 text-success",
  rejected: "bg-destructive/10 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
};

function DashboardPage() {
  const { profile, user, loading } = useAuth();

  if (loading || !profile || !user) {
    return (
      <div className="container-page py-12">
        <div className="h-32 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  return (
    <div className="container-page py-8">
      <header className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Hi, {profile.full_name?.split(" ")[0] ?? "there"} 👋
        </h1>
        <p className="text-sm text-muted-foreground">
          {profile.role === "landlord" ? "Manage your hostels and incoming bookings." : "Track your bookings and saved hostels."}
        </p>
      </header>

      {profile.role === "landlord" ? <LandlordDashboard userId={user.id} /> : <StudentDashboard userId={user.id} />}
    </div>
  );
}

function StudentDashboard({ userId }: { userId: string }) {
  const [tab, setTab] = useState<"bookings" | "wishlist">("bookings");
  const [bookings, setBookings] = useState<BookingWithHostel[]>([]);
  const [wishlist, setWishlist] = useState<Hostel[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const [b, w] = await Promise.all([listMyBookings(userId), listWishlistedHostels(userId)]);
      setBookings(b);
      setWishlist(w);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, [userId]);

  async function cancelBooking(id: string) {
    try {
      await updateBookingStatus(id, "cancelled");
      toast.success("Booking cancelled");
      refresh();
    } catch (err: any) {
      toast.error(err?.message ?? "Could not cancel");
    }
  }

  return (
    <div>
      <div className="flex gap-2 border-b border-border">
        <TabButton active={tab === "bookings"} onClick={() => setTab("bookings")} icon={<Inbox className="h-4 w-4" />}>
          My bookings ({bookings.length})
        </TabButton>
        <TabButton active={tab === "wishlist"} onClick={() => setTab("wishlist")} icon={<Heart className="h-4 w-4" />}>
          Wishlist ({wishlist.length})
        </TabButton>
      </div>

      <div className="mt-6">
        {loading ? (
          <Loading />
        ) : tab === "bookings" ? (
          bookings.length === 0 ? (
            <EmptyState
              title="No bookings yet"
              body="When you request a hostel, it will appear here for landlord review."
              cta={{ to: "/", label: "Browse hostels" }}
            />
          ) : (
            <div className="grid gap-4">
              {bookings.map((b) => (
                <article key={b.id} className="flex flex-col sm:flex-row gap-4 rounded-2xl border border-border bg-card p-4">
                  <img
                    src={b.hostel.images?.[0] ?? "/hostels/hostel-1.jpg"}
                    alt={b.hostel.name}
                    className="h-32 w-full sm:w-44 rounded-xl object-cover"
                  />
                  <div className="flex flex-1 flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Link
                          to="/hostel/$hostelId"
                          params={{ hostelId: b.hostel.slug ?? b.hostel.id }}
                          className="text-base font-semibold hover:underline"
                        >
                          {b.hostel.name}
                        </Link>
                        <p className="text-xs text-muted-foreground mt-0.5">{b.hostel.location}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${STATUS_STYLES[b.status]}`}>
                        {b.status}
                      </span>
                    </div>
                    <dl className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <Field label="Move-in" value={new Date(b.move_in_date).toLocaleDateString("en-KE")} />
                      <Field label="Months" value={String(b.months)} />
                      <Field label="Room" value={b.room_type} />
                      <Field label="Total" value={formatPrice(b.hostel.price_per_month * b.months, b.hostel.currency)} />
                    </dl>
                    {b.status === "pending" && (
                      <div className="mt-3">
                        <button
                          onClick={() => cancelBooking(b.id)}
                          className="text-xs font-semibold text-destructive hover:underline"
                        >
                          Cancel request
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )
        ) : wishlist.length === 0 ? (
          <EmptyState
            title="No saved hostels yet"
            body="Tap the heart on any hostel to save it for later."
            cta={{ to: "/", label: "Browse hostels" }}
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {wishlist.map((h) => (
              <HostelCard
                key={h.id}
                hostel={h}
                wishlisted
                onWishlistChange={(id, next) => {
                  if (!next) setWishlist((prev) => prev.filter((x) => x.id !== id));
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LandlordDashboard({ userId }: { userId: string }) {
  const [tab, setTab] = useState<"incoming" | "hostels">("incoming");
  const [incoming, setIncoming] = useState<IncomingBooking[]>([]);
  const [myHostels, setMyHostels] = useState<{ id: string; name: string; slug: string | null; location: string; slots_left: number; total_slots: number; is_published: boolean }[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const [b, h] = await Promise.all([
        listIncomingBookings(userId),
        supabase
          .from("hostels")
          .select("id, name, slug, location, slots_left, total_slots, is_published")
          .eq("owner_id", userId)
          .order("created_at", { ascending: false })
          .then(({ data }) => (data ?? []) as any),
      ]);
      setIncoming(b);
      setMyHostels(h);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, [userId]);

  async function decide(id: string, status: BookingStatus) {
    try {
      await updateBookingStatus(id, status);
      toast.success(status === "approved" ? "Booking approved" : "Booking rejected");
      refresh();
    } catch (err: any) {
      toast.error(err?.message ?? "Could not update booking");
    }
  }

  const pendingCount = incoming.filter((b) => b.status === "pending").length;

  return (
    <div>
      <div className="flex gap-2 border-b border-border">
        <TabButton active={tab === "incoming"} onClick={() => setTab("incoming")} icon={<Inbox className="h-4 w-4" />}>
          Incoming ({pendingCount} pending)
        </TabButton>
        <TabButton active={tab === "hostels"} onClick={() => setTab("hostels")} icon={<Home className="h-4 w-4" />}>
          My hostels ({myHostels.length})
        </TabButton>
      </div>

      <div className="mt-6">
        {loading ? (
          <Loading />
        ) : tab === "incoming" ? (
          incoming.length === 0 ? (
            <EmptyState
              title="No bookings yet"
              body="When students request a room, you'll see them here to approve or reject."
            />
          ) : (
            <div className="grid gap-4">
              {incoming.map((b) => (
                <article key={b.id} className="rounded-2xl border border-border bg-card p-4">
                  <header className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{b.student.full_name}</p>
                      <p className="text-xs text-muted-foreground">{b.student.phone ?? "No phone provided"}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase ${STATUS_STYLES[b.status]}`}>
                      {b.status}
                    </span>
                  </header>
                  <p className="mt-2 text-xs text-muted-foreground">
                    For <span className="font-medium text-foreground">{b.hostel.name}</span>
                  </p>
                  <dl className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <Field label="Move-in" value={new Date(b.move_in_date).toLocaleDateString("en-KE")} />
                    <Field label="Months" value={String(b.months)} />
                    <Field label="Room" value={b.room_type} />
                    <Field label="Sent" value={new Date(b.created_at).toLocaleDateString("en-KE")} />
                  </dl>
                  {b.message && (
                    <p className="mt-3 rounded-xl bg-muted p-3 text-xs italic text-muted-foreground">
                      "{b.message}"
                    </p>
                  )}
                  {b.status === "pending" && (
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => decide(b.id, "approved")}
                        className="inline-flex h-9 items-center gap-1.5 rounded-full bg-success px-4 text-xs font-semibold text-success-foreground"
                      >
                        <CheckCircle2 className="h-4 w-4" /> Approve
                      </button>
                      <button
                        onClick={() => decide(b.id, "rejected")}
                        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-4 text-xs font-semibold"
                      >
                        <XCircle className="h-4 w-4" /> Reject
                      </button>
                    </div>
                  )}
                  {b.status === "approved" && (
                    <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-success">
                      <Clock className="h-3.5 w-3.5" /> Slot reserved automatically
                    </p>
                  )}
                </article>
              ))}
            </div>
          )
        ) : myHostels.length === 0 ? (
          <EmptyState
            title="You haven't listed any hostels yet"
            body="Listing creation lands in Phase 4. For now, the demo hostels are placeholders."
          />
        ) : (
          <div className="grid gap-3">
            {myHostels.map((h) => (
              <article key={h.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
                <div>
                  <Link
                    to="/hostel/$hostelId"
                    params={{ hostelId: h.slug ?? h.id }}
                    className="text-sm font-semibold hover:underline"
                  >
                    {h.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">{h.location}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{h.slots_left}/{h.total_slots} slots</p>
                  <p className="text-xs text-muted-foreground">{h.is_published ? "Published" : "Hidden"}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TabButton({
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
      className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-4 py-3 text-sm font-semibold transition ${
        active ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon} {children}
    </button>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted px-3 py-2">
      <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold capitalize">{value}</dd>
    </div>
  );
}

function Loading() {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground py-10">
      <Loader2 className="h-4 w-4 animate-spin" /> Loading…
    </div>
  );
}

function EmptyState({
  title,
  body,
  cta,
}: {
  title: string;
  body: string;
  cta?: { to: "/"; label: string };
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      {cta && (
        <Link
          to={cta.to}
          className="mt-5 inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground"
        >
          {cta.label}
        </Link>
      )}
    </div>
  );
}
