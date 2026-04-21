import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { GraduationCap, Building2, LogOut, Mail, Phone, MapPin } from "lucide-react";
import { useAuth } from "@/auth/auth-context";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [{ title: "My account — UniStay" }],
  }),
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({
        to: "/login",
        search: { redirect: location.pathname },
      });
    }
  },
  component: AccountPage,
});

function AccountPage() {
  const { profile, user, signOut, loading } = useAuth();
  const navigate = useNavigate();

  if (loading || !profile) {
    return (
      <div className="container-page py-12">
        <div className="h-32 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  const RoleIcon = profile.role === "landlord" ? Building2 : GraduationCap;

  return (
    <div className="container-page max-w-2xl py-10">
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground text-xl font-bold">
              {profile.full_name?.[0]?.toUpperCase() ?? "U"}
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{profile.full_name}</h1>
              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-semibold text-primary">
                <RoleIcon className="h-3.5 w-3.5" />
                {profile.role === "landlord" ? "Landlord" : profile.role === "admin" ? "Admin" : "Student"}
              </span>
            </div>
          </div>
          <button
            onClick={async () => {
              await signOut();
              navigate({ to: "/" });
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-medium hover:bg-muted"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>

        <dl className="mt-6 space-y-3 text-sm">
          <Row icon={<Mail className="h-4 w-4" />} label="Email" value={user?.email ?? "—"} />
          <Row icon={<Phone className="h-4 w-4" />} label="Phone" value={profile.phone ?? "—"} />
          <Row
            icon={<MapPin className="h-4 w-4" />}
            label="Institution"
            value={profile.institution_name ?? "—"}
          />
        </dl>

        <div className="mt-8 border-t border-border pt-6">
          <h2 className="text-sm font-semibold">Coming next</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {profile.role === "landlord"
              ? "Verification, hostel management and bookings dashboard land in Phase 4."
              : "Bookings, wishlists and roommate matching arrive in Phase 3."}
          </p>
          <Link
            to="/"
            className="mt-4 inline-flex h-10 items-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground"
          >
            Browse hostels
          </Link>
        </div>
      </div>
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background px-4 py-3">
      <span className="inline-flex items-center gap-2 text-muted-foreground">
        {icon} {label}
      </span>
      <span className="font-medium text-right truncate">{value}</span>
    </div>
  );
}
