import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Heart, MapPin, Share2, Star, Users, Wifi, Droplets, Shield, Zap, ShirtIcon, Car, BookOpen } from "lucide-react";
import { useState } from "react";
import { AMENITY_LABELS, HOSTELS, ROOM_TYPE_LABELS, type Amenity, type Hostel } from "@/data/hostels";
import { formatPrice } from "@/lib/format";

export const Route = createFileRoute("/hostel/$hostelId")({
  loader: ({ params }): { hostel: Hostel } => {
    const hostel = HOSTELS.find((h) => h.id === params.hostelId);
    if (!hostel) throw notFound();
    return { hostel };
  },
  head: ({ loaderData }) => {
    const h = loaderData?.hostel;
    if (!h) return { meta: [{ title: "Hostel not found" }] };
    return {
      meta: [
        { title: `${h.name} — UniStay` },
        { name: "description", content: `${h.name} near ${h.institution}. ${h.description}` },
        { property: "og:title", content: `${h.name} — UniStay` },
        { property: "og:description", content: h.description },
        { property: "og:image", content: h.images[0] },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="container-page py-20 text-center">
      <h1 className="text-3xl font-bold">Hostel not found</h1>
      <p className="mt-2 text-muted-foreground">It may have been removed or the link is wrong.</p>
      <Link to="/" className="mt-6 inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground">
        Back to browse
      </Link>
    </div>
  ),
  component: HostelDetail,
});

const amenityIcons: Record<Amenity, typeof Wifi> = {
  wifi: Wifi,
  water: Droplets,
  security: Shield,
  electricity: Zap,
  laundry: ShirtIcon,
  parking: Car,
  study: BookOpen,
};

const mockReviews = [
  { name: "Brian K.", rating: 5, body: "Quiet, clean, and the Wi-Fi actually works. Worth every shilling.", when: "2 weeks ago" },
  { name: "Aisha M.", rating: 4, body: "Good location, water is reliable. Walls a bit thin but overall great.", when: "1 month ago" },
  { name: "Peter O.", rating: 5, body: "Caretaker is responsive and the security is solid. Would recommend.", when: "2 months ago" },
];

function HostelDetail() {
  const { hostel } = Route.useLoaderData();
  const [active, setActive] = useState(0);
  const soldOut = hostel.slotsLeft === 0;

  return (
    <div>
      <div className="container-page pt-4">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to browse
        </Link>
      </div>

      {/* Gallery */}
      <section className="container-page mt-4">
        <div className="grid gap-2 md:grid-cols-4 md:grid-rows-2 md:h-[420px]">
          <div className="relative md:col-span-2 md:row-span-2 aspect-[4/3] md:aspect-auto overflow-hidden rounded-2xl bg-muted">
            <img
              src={hostel.images[active]}
              alt={hostel.name}
              width={1200}
              height={900}
              className="h-full w-full object-cover"
            />
          </div>
          {hostel.images.slice(0, 4).map((img, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`relative hidden md:block overflow-hidden rounded-2xl bg-muted transition ${
                active === i ? "ring-2 ring-accent ring-offset-2 ring-offset-background" : ""
              }`}
            >
              <img
                src={img}
                alt={`${hostel.name} photo ${i + 1}`}
                width={600}
                height={400}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
        <div className="mt-2 flex gap-2 overflow-x-auto md:hidden -mx-4 px-4 pb-1">
          {hostel.images.map((img, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-muted ${
                active === i ? "ring-2 ring-accent" : ""
              }`}
            >
              <img src={img} alt="" width={120} height={90} loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      </section>

      <div className="container-page mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
        {/* Left */}
        <div className="space-y-10">
          <header>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-balance">{hostel.name}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Star className="h-4 w-4 fill-accent text-accent" />
                    <span className="font-semibold text-foreground">{hostel.rating.toFixed(1)}</span>
                    <span>({hostel.reviewsCount} reviews)</span>
                  </span>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-4 w-4" /> {hostel.location}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="grid h-10 w-10 place-items-center rounded-full border border-border" aria-label="Share">
                  <Share2 className="h-4 w-4" />
                </button>
                <button className="grid h-10 w-10 place-items-center rounded-full border border-border" aria-label="Save">
                  <Heart className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary">
                {hostel.distanceKm} km from {hostel.institution}
              </span>
              {hostel.roomTypes.map((rt) => (
                <span key={rt} className="rounded-full bg-secondary px-3 py-1 text-xs font-medium">
                  {ROOM_TYPE_LABELS[rt]} room
                </span>
              ))}
            </div>
          </header>

          <section>
            <h2 className="text-xl font-bold">About this hostel</h2>
            <p className="mt-3 text-muted-foreground leading-relaxed">{hostel.description}</p>
          </section>

          <section>
            <h2 className="text-xl font-bold">Amenities</h2>
            <ul className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {hostel.amenities.map((a) => {
                const Icon = amenityIcons[a];
                return (
                  <li key={a} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary-soft text-primary">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-medium">{AMENITY_LABELS[a]}</span>
                  </li>
                );
              })}
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold">House rules</h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {hostel.rules.map((r) => (
                <li key={r} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <div className="flex items-end justify-between">
              <h2 className="text-xl font-bold">Reviews</h2>
              <span className="text-sm text-muted-foreground">{hostel.reviewsCount} verified</span>
            </div>
            <div className="mt-4 space-y-4">
              {mockReviews.map((r) => (
                <article key={r.name} className="rounded-2xl border border-border bg-card p-4">
                  <header className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                        {r.name[0]}
                      </span>
                      <div>
                        <div className="text-sm font-semibold">{r.name}</div>
                        <div className="text-xs text-muted-foreground">{r.when}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${i < r.rating ? "fill-accent text-accent" : "text-muted"}`}
                        />
                      ))}
                    </div>
                  </header>
                  <p className="mt-3 text-sm text-muted-foreground">{r.body}</p>
                </article>
              ))}
            </div>
          </section>
        </div>

        {/* Booking sidebar */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <div className="flex items-baseline justify-between">
              <div>
                <div className="text-2xl font-bold">{formatPrice(hostel.pricePerMonth, hostel.currency)}</div>
                <div className="text-xs text-muted-foreground">per month</div>
              </div>
              {soldOut ? (
                <span className="rounded-full bg-foreground px-3 py-1 text-xs font-semibold text-background">
                  Fully booked
                </span>
              ) : (
                <span className="rounded-full bg-success/15 px-3 py-1 text-xs font-semibold text-success">
                  {hostel.slotsLeft} of {hostel.totalSlots} left
                </span>
              )}
            </div>

            <div className="mt-4 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-accent"
                style={{
                  width: `${Math.max(4, ((hostel.totalSlots - hostel.slotsLeft) / hostel.totalSlots) * 100)}%`,
                }}
              />
            </div>

            <button
              disabled={soldOut}
              className="mt-5 w-full rounded-full bg-accent py-3 text-sm font-semibold text-accent-foreground shadow-[var(--shadow-cta)] transition hover:opacity-95 disabled:opacity-50 disabled:shadow-none"
            >
              {soldOut ? "Notify me when available" : "Book now"}
            </button>
            <button className="mt-2 w-full rounded-full border border-border py-3 text-sm font-semibold inline-flex items-center justify-center gap-2">
              <Users className="h-4 w-4" /> Find a roommate
            </button>

            <p className="mt-4 text-center text-xs text-muted-foreground">
              You won't be charged yet. Sign in required to confirm booking.
            </p>
          </div>

          <div className="mt-4 rounded-2xl border border-border bg-secondary p-4 text-xs text-muted-foreground">
            Concerned about a listing?{" "}
            <button className="font-semibold text-foreground underline-offset-2 hover:underline">
              Report this hostel
            </button>
          </div>
        </aside>
      </div>

      {/* Mobile sticky bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur lg:hidden">
        <div className="container-page flex items-center justify-between gap-3 py-3">
          <div>
            <div className="text-base font-bold leading-none">{formatPrice(hostel.pricePerMonth, hostel.currency)}</div>
            <div className="text-[11px] text-muted-foreground">per month • {hostel.slotsLeft} left</div>
          </div>
          <button
            disabled={soldOut}
            className="h-11 flex-1 max-w-[200px] rounded-full bg-accent text-sm font-semibold text-accent-foreground shadow-[var(--shadow-cta)] disabled:opacity-50"
          >
            {soldOut ? "Sold out" : "Book now"}
          </button>
        </div>
      </div>
      <div className="h-20 lg:hidden" />
    </div>
  );
}
