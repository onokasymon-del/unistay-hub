import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "How UniStay works" },
      {
        name: "description",
        content: "Learn how UniStay helps students book hostels and how landlords list their properties.",
      },
    ],
  }),
  component: AboutPage,
});

const studentSteps = [
  { n: "1", title: "Search near your campus", body: "Filter by price, distance, room type and amenities." },
  { n: "2", title: "Compare and shortlist", body: "Save favourites, read genuine reviews from real bookers." },
  { n: "3", title: "Book your slot", body: "Reserve in seconds. Get confirmation by email and SMS." },
];

const landlordSteps = [
  { n: "1", title: "Create a verified profile", body: "Upload your ID and proof of ownership for trust." },
  { n: "2", title: "List your hostel", body: "Add photos, prices, room types and amenities." },
  { n: "3", title: "Manage bookings", body: "Track availability and earnings from one dashboard." },
];

function AboutPage() {
  return (
    <div className="container-page py-12 md:py-16">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-accent">How it works</p>
        <h1 className="mt-3 text-4xl md:text-5xl font-bold tracking-tight text-balance">
          Built for students. Trusted by landlords.
        </h1>
        <p className="mt-4 text-lg text-muted-foreground text-pretty">
          UniStay is a marketplace for verified student housing — fast on slow networks, friendly on small screens, and designed around how Kenyan students actually find a place to stay.
        </p>
      </div>

      <div className="mt-14 grid gap-8 md:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-6 md:p-8">
          <h2 className="text-2xl font-bold">For students</h2>
          <ol className="mt-6 space-y-5">
            {studentSteps.map((s) => (
              <li key={s.n} className="flex gap-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground font-semibold">
                  {s.n}
                </span>
                <div>
                  <h3 className="text-base font-semibold">{s.title}</h3>
                  <p className="text-sm text-muted-foreground">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-2xl border border-border bg-primary text-primary-foreground p-6 md:p-8">
          <h2 className="text-2xl font-bold">For landlords</h2>
          <ol className="mt-6 space-y-5">
            {landlordSteps.map((s) => (
              <li key={s.n} className="flex gap-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground font-semibold">
                  {s.n}
                </span>
                <div>
                  <h3 className="text-base font-semibold">{s.title}</h3>
                  <p className="text-sm opacity-85">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
