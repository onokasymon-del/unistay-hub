import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, SlidersHorizontal, X, Sparkles } from "lucide-react";
import { HostelCard, HostelCardSkeleton } from "@/components/hostel-card";
import {
  AMENITY_LABELS,
  ROOM_TYPE_LABELS,
  listHostels,
  listInstitutions,
  listWishlistIds,
  type Amenity,
  type Hostel,
  type RoomType,
} from "@/lib/hostels-api";
import { useAuth } from "@/auth/auth-context";
import heroImg from "@/assets/hero-hostel.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "UniStay — Find student hostels near your campus in Kenya" },
      {
        name: "description",
        content:
          "Browse and book affordable student hostels near Kenyan universities and colleges. Real reviews, verified landlords, mobile-first.",
      },
      { property: "og:title", content: "UniStay — Student hostels in Kenya" },
      {
        property: "og:description",
        content: "Find, compare and book hostels near your campus. Built for African students.",
      },
    ],
  }),
  component: BrowsePage,
});

type SortKey = "popular" | "price-asc" | "price-desc" | "available";

const ALL_AMENITIES: Amenity[] = ["wifi", "water", "security", "electricity", "laundry", "parking", "study"];
const ALL_ROOMS: RoomType[] = ["single", "shared", "ensuite"];

function BrowsePage() {
  const { user, profile } = useAuth();
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [institutions, setInstitutions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());

  const [query, setQuery] = useState("");
  const [institution, setInstitution] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<number>(12000);
  const [maxDistance, setMaxDistance] = useState<number>(5);
  const [rooms, setRooms] = useState<Set<RoomType>>(new Set());
  const [amenities, setAmenities] = useState<Set<Amenity>>(new Set());
  const [sort, setSort] = useState<SortKey>("popular");
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([listHostels(), listInstitutions()])
      .then(([h, ins]) => {
        if (!active) return;
        setHostels(h);
        setInstitutions(ins);
      })
      .catch(() => {
        if (!active) return;
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!user || profile?.role !== "student") {
      setWishlist(new Set());
      return;
    }
    listWishlistIds(user.id).then(setWishlist).catch(() => undefined);
  }, [user, profile?.role]);

  const filtered = useMemo(() => {
    let list = hostels.filter((h) => {
      if (query) {
        const q = query.toLowerCase();
        if (
          !h.name.toLowerCase().includes(q) &&
          !h.location.toLowerCase().includes(q) &&
          !h.institution.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      if (institution && h.institution !== institution) return false;
      if (h.price_per_month > maxPrice) return false;
      if (h.distance_km > maxDistance) return false;
      if (rooms.size > 0 && !h.room_types.some((r) => rooms.has(r))) return false;
      if (amenities.size > 0 && !Array.from(amenities).every((a) => h.amenities.includes(a))) return false;
      return true;
    });

    list = [...list].sort((a, b) => {
      switch (sort) {
        case "price-asc": return a.price_per_month - b.price_per_month;
        case "price-desc": return b.price_per_month - a.price_per_month;
        case "available": return b.slots_left - a.slots_left;
        case "popular":
        default:
          return b.reviews_count * b.rating - a.reviews_count * a.rating;
      }
    });

    return list;
  }, [hostels, query, institution, maxPrice, maxDistance, rooms, amenities, sort]);

  const activeFilterCount =
    (institution ? 1 : 0) +
    (maxPrice < 12000 ? 1 : 0) +
    (maxDistance < 5 ? 1 : 0) +
    rooms.size +
    amenities.size;

  function toggleRoom(r: RoomType) {
    setRooms((prev) => {
      const next = new Set(prev);
      if (next.has(r)) next.delete(r);
      else next.add(r);
      return next;
    });
  }
  function toggleAmenity(a: Amenity) {
    setAmenities((prev) => {
      const next = new Set(prev);
      if (next.has(a)) next.delete(a);
      else next.add(a);
      return next;
    });
  }
  function resetFilters() {
    setInstitution("");
    setMaxPrice(12000);
    setMaxDistance(5);
    setRooms(new Set());
    setAmenities(new Set());
  }

  function handleWishlistChange(hostelId: string, next: boolean) {
    setWishlist((prev) => {
      const n = new Set(prev);
      if (next) n.add(hostelId);
      else n.delete(hostelId);
      return n;
    });
  }

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-primary text-primary-foreground">
        <img
          src={heroImg}
          alt=""
          width={1600}
          height={1024}
          fetchPriority="high"
          className="absolute inset-0 h-full w-full object-cover opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/85 to-primary/70" />
        <div className="container-page relative py-12 md:py-20">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 border border-accent/30 px-3 py-1 text-xs font-semibold text-accent-soft">
              <Sparkles className="h-3.5 w-3.5" /> Verified hostels • Real reviews
            </span>
            <h1 className="mt-4 text-4xl md:text-6xl font-bold tracking-tight text-balance">
              Find your <span className="text-accent">campus home</span>, in minutes.
            </h1>
            <p className="mt-4 text-base md:text-lg text-primary-foreground/85 text-pretty max-w-xl">
              Compare prices, amenities and real reviews from students at universities and colleges across Kenya.
            </p>
          </div>

          <div id="search" className="mt-8 max-w-3xl rounded-2xl bg-background p-2 shadow-[var(--shadow-elevated)]">
            <div className="grid gap-2 md:grid-cols-[1fr_220px_auto]">
              <label className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Hostel name or location"
                  className="w-full h-12 rounded-xl bg-muted pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </label>
              <select
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                className="h-12 rounded-xl bg-muted px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">All institutions</option>
                {institutions.map((i) => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
              <button
                className="h-12 rounded-xl bg-accent px-6 text-sm font-semibold text-accent-foreground hover:opacity-95"
                onClick={() => document.getElementById("results")?.scrollIntoView({ behavior: "smooth" })}
              >
                Search
              </button>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-primary-foreground/80">
            <span><strong className="text-primary-foreground">{hostels.length}+</strong> hostels</span>
            <span><strong className="text-primary-foreground">{institutions.length}</strong> campuses</span>
            <span><strong className="text-primary-foreground">12k</strong> students helped</span>
          </div>
        </div>
      </section>

      {/* Results */}
      <section id="results" className="container-page py-10">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Hostels for you</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {loading
                ? "Loading hostels…"
                : `${filtered.length} ${filtered.length === 1 ? "place" : "places"} match your search`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setFiltersOpen(true)}
              className="lg:hidden inline-flex items-center gap-2 h-10 rounded-full border border-border px-4 text-sm font-medium"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="grid h-5 w-5 place-items-center rounded-full bg-accent text-[11px] font-bold text-accent-foreground">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="h-10 rounded-full border border-border bg-background px-3 text-sm font-medium"
            >
              <option value="popular">Most popular</option>
              <option value="price-asc">Price: low → high</option>
              <option value="price-desc">Price: high → low</option>
              <option value="available">Most available</option>
            </select>
          </div>
        </div>

        <div className="mt-6 grid gap-8 lg:grid-cols-[280px_1fr]">
          <aside className="hidden lg:block">
            <FilterPanel
              institutions={institutions}
              institution={institution}
              setInstitution={setInstitution}
              maxPrice={maxPrice}
              setMaxPrice={setMaxPrice}
              maxDistance={maxDistance}
              setMaxDistance={setMaxDistance}
              rooms={rooms}
              toggleRoom={toggleRoom}
              amenities={amenities}
              toggleAmenity={toggleAmenity}
              onReset={resetFilters}
            />
          </aside>

          <div>
            {loading ? (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <HostelCardSkeleton key={i} />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyResults onReset={resetFilters} />
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((h, i) => (
                  <HostelCard
                    key={h.id}
                    hostel={h}
                    priority={i < 2}
                    wishlisted={wishlist.has(h.id)}
                    onWishlistChange={handleWishlistChange}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {filtersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setFiltersOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[88vh] rounded-t-3xl bg-background flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-lg font-bold">Filters</h3>
              <button
                onClick={() => setFiltersOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-full bg-muted"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-y-auto p-4">
              <FilterPanel
                institutions={institutions}
                institution={institution}
                setInstitution={setInstitution}
                maxPrice={maxPrice}
                setMaxPrice={setMaxPrice}
                maxDistance={maxDistance}
                setMaxDistance={setMaxDistance}
                rooms={rooms}
                toggleRoom={toggleRoom}
                amenities={amenities}
                toggleAmenity={toggleAmenity}
                onReset={resetFilters}
              />
            </div>
            <div className="border-t border-border p-4 grid grid-cols-2 gap-3">
              <button
                onClick={resetFilters}
                className="h-12 rounded-full border border-border text-sm font-semibold"
              >
                Reset
              </button>
              <button
                onClick={() => setFiltersOpen(false)}
                className="h-12 rounded-full bg-accent text-sm font-semibold text-accent-foreground"
              >
                Show {filtered.length} {filtered.length === 1 ? "result" : "results"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface FilterProps {
  institutions: string[];
  institution: string;
  setInstitution: (v: string) => void;
  maxPrice: number;
  setMaxPrice: (v: number) => void;
  maxDistance: number;
  setMaxDistance: (v: number) => void;
  rooms: Set<RoomType>;
  toggleRoom: (r: RoomType) => void;
  amenities: Set<Amenity>;
  toggleAmenity: (a: Amenity) => void;
  onReset: () => void;
}

function FilterPanel(p: FilterProps) {
  return (
    <div className="space-y-6 lg:rounded-2xl lg:border lg:border-border lg:bg-card lg:p-5">
      <div className="hidden lg:flex items-center justify-between">
        <h3 className="text-base font-bold">Filters</h3>
        <button onClick={p.onReset} className="text-xs font-semibold text-accent hover:underline">
          Reset all
        </button>
      </div>

      <div>
        <label className="text-sm font-semibold">Institution</label>
        <select
          value={p.institution}
          onChange={(e) => p.setInstitution(e.target.value)}
          className="mt-2 w-full h-11 rounded-xl border border-border bg-background px-3 text-sm"
        >
          <option value="">All institutions</option>
          {p.institutions.map((i) => (
            <option key={i} value={i}>{i}</option>
          ))}
        </select>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold">Max price</label>
          <span className="text-xs font-semibold text-foreground">KES {p.maxPrice.toLocaleString()}</span>
        </div>
        <input
          type="range"
          min={3000}
          max={12000}
          step={500}
          value={p.maxPrice}
          onChange={(e) => p.setMaxPrice(Number(e.target.value))}
          className="mt-2 w-full accent-[oklch(0.7_0.18_45)]"
        />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold">Max distance from campus</label>
          <span className="text-xs font-semibold text-foreground">{p.maxDistance} km</span>
        </div>
        <input
          type="range"
          min={0.5}
          max={5}
          step={0.5}
          value={p.maxDistance}
          onChange={(e) => p.setMaxDistance(Number(e.target.value))}
          className="mt-2 w-full accent-[oklch(0.7_0.18_45)]"
        />
      </div>

      <div>
        <label className="text-sm font-semibold">Room type</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {ALL_ROOMS.map((r) => {
            const active = p.rooms.has(r);
            return (
              <button
                key={r}
                onClick={() => p.toggleRoom(r)}
                className={`h-9 rounded-full px-3 text-xs font-medium border transition ${
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border bg-background hover:border-foreground/30"
                }`}
              >
                {ROOM_TYPE_LABELS[r]}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="text-sm font-semibold">Amenities</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {ALL_AMENITIES.map((a) => {
            const active = p.amenities.has(a);
            return (
              <button
                key={a}
                onClick={() => p.toggleAmenity(a)}
                className={`h-9 rounded-full px-3 text-xs font-medium border transition ${
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border bg-background hover:border-foreground/30"
                }`}
              >
                {AMENITY_LABELS[a]}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function EmptyResults({ onReset }: { onReset: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground">
        <Search className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-lg font-bold">No hostels match your filters</h3>
      <p className="mt-1 text-sm text-muted-foreground">Try widening your price range or distance.</p>
      <button
        onClick={onReset}
        className="mt-5 inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground"
      >
        Reset filters
      </button>
    </div>
  );
}
