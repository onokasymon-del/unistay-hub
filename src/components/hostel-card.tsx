import { Link } from "@tanstack/react-router";
import { Star, MapPin, Heart } from "lucide-react";
import { toast } from "sonner";
import type { Hostel } from "@/lib/hostels-api";
import { addToWishlist, removeFromWishlist } from "@/lib/hostels-api";
import { formatPrice } from "@/lib/format";
import { useAuth } from "@/auth/auth-context";

interface Props {
  hostel: Hostel;
  priority?: boolean;
  wishlisted?: boolean;
  onWishlistChange?: (hostelId: string, next: boolean) => void;
}

export function HostelCard({ hostel, priority, wishlisted = false, onWishlistChange }: Props) {
  const { user, profile } = useAuth();
  const soldOut = hostel.slots_left === 0;
  const fewLeft = !soldOut && hostel.slots_left <= 3;
  const detailParam = hostel.slug ?? hostel.id;

  async function toggleWishlist(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!user || profile?.role !== "student") {
      toast.info("Sign in as a student to save hostels");
      return;
    }
    try {
      if (wishlisted) {
        await removeFromWishlist(user.id, hostel.id);
        onWishlistChange?.(hostel.id, false);
      } else {
        await addToWishlist(user.id, hostel.id);
        onWishlistChange?.(hostel.id, true);
        toast.success("Saved to your wishlist");
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Could not update wishlist");
    }
  }

  return (
    <Link
      to="/hostel/$hostelId"
      params={{ hostelId: detailParam }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]"
    >
      <div className="relative aspect-[16/10] sm:aspect-[3/2] overflow-hidden bg-muted">
        <img
          src={hostel.images[0]}
          alt={hostel.name}
          width={800}
          height={600}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
        />
        <div className="absolute left-3 top-3 flex gap-2">
          {soldOut ? (
            <span className="rounded-full bg-foreground/90 px-2.5 py-1 text-[11px] font-semibold text-background">
              Fully booked
            </span>
          ) : fewLeft ? (
            <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-foreground">
              Only {hostel.slots_left} left
            </span>
          ) : (
            <span className="rounded-full bg-success/95 px-2.5 py-1 text-[11px] font-semibold text-success-foreground">
              {hostel.slots_left} slots
            </span>
          )}
        </div>
        <button
          type="button"
          aria-label={wishlisted ? "Remove from wishlist" : "Save to wishlist"}
          onClick={toggleWishlist}
          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-background/90 text-foreground shadow-sm hover:bg-background"
        >
          <Heart className={`h-4 w-4 ${wishlisted ? "fill-accent text-accent" : ""}`} />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold leading-tight text-balance">{hostel.name}</h3>
          <div className="flex items-center gap-1 text-sm font-medium">
            <Star className="h-4 w-4 fill-accent text-accent" />
            <span>{hostel.rating.toFixed(1)}</span>
            <span className="text-muted-foreground">({hostel.reviews_count})</span>
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{hostel.location}</span>
          <span className="mx-1">•</span>
          <span className="shrink-0">{hostel.distance_km} km from {hostel.institution.split(" ")[0]}</span>
        </div>

        <div className="mt-auto flex items-end justify-between pt-2">
          <div>
            <div className="text-lg font-bold leading-none">{formatPrice(hostel.price_per_month, hostel.currency)}</div>
            <div className="text-xs text-muted-foreground">per month</div>
          </div>
          <span className="inline-flex h-9 items-center rounded-full bg-primary px-3 text-xs font-semibold text-primary-foreground transition group-hover:bg-primary/90">
            View details
          </span>
        </div>
      </div>
    </Link>
  );
}

export function HostelCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <div className="aspect-[16/10] sm:aspect-[3/2] skeleton" />
      <div className="space-y-3 p-4">
        <div className="h-4 w-3/4 rounded skeleton" />
        <div className="h-3 w-1/2 rounded skeleton" />
        <div className="flex items-end justify-between pt-3">
          <div className="h-5 w-20 rounded skeleton" />
          <div className="h-9 w-24 rounded-full skeleton" />
        </div>
      </div>
    </div>
  );
}
