import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/list-hostel")({
  head: () => ({
    meta: [
      { title: "List your hostel on UniStay" },
      {
        name: "description",
        content: "Reach thousands of verified students looking for a place to stay near their campus.",
      },
    ],
  }),
  component: ListHostelPage,
});

const benefits = [
  "Reach verified students near your campus",
  "Manage bookings and availability in one dashboard",
  "Get paid securely, with no chasing tenants",
  "Build trust with verified reviews",
];

function ListHostelPage() {
  return (
    <div className="container-page py-12 md:py-16">
      <div className="grid gap-10 md:grid-cols-2 md:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-accent">Landlords</p>
          <h1 className="mt-3 text-4xl md:text-5xl font-bold tracking-tight text-balance">
            Fill your hostel with verified students.
          </h1>
          <p className="mt-4 text-lg text-muted-foreground text-pretty">
            Join landlords across Nairobi, Juja, Roysambu and beyond. Upload your hostel in minutes and start receiving bookings this term.
          </p>

          <ul className="mt-6 space-y-3">
            {benefits.map((b) => (
              <li key={b} className="flex items-start gap-3 text-sm">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-success shrink-0" />
                <span>{b}</span>
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/signup/landlord"
              className="inline-flex h-12 items-center rounded-full bg-accent px-6 text-sm font-semibold text-accent-foreground shadow-[var(--shadow-cta)]"
            >
              Get started — list your hostel
            </Link>
            <Link
              to="/"
              className="inline-flex h-12 items-center rounded-full border border-border px-6 text-sm font-semibold"
            >
              Browse hostels
            </Link>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-secondary p-6 md:p-8">
          <div className="grid grid-cols-3 gap-4 text-center">
            <Stat label="Avg. listings" value="500+" />
            <Stat label="Students served" value="12k" />
            <Stat label="Uni partners" value="20" />
          </div>
          <div className="mt-6 rounded-2xl bg-card p-5 text-sm">
            <p className="font-semibold">"We filled 38 rooms in two weeks."</p>
            <p className="mt-2 text-muted-foreground">
              UniStay sent us serious students who actually showed up. The verification process gave them confidence to book.
            </p>
            <p className="mt-3 text-xs text-muted-foreground">— Mary W., landlord, Juja</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-card p-4">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
