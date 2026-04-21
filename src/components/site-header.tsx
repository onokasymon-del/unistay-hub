import { Link } from "@tanstack/react-router";
import { Search, Heart, Menu, X } from "lucide-react";
import { useState } from "react";

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <div className="container-page flex h-16 items-center gap-3">
        <Link to="/" className="flex items-center gap-2 shrink-0" aria-label="UniStay home">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground font-bold">
            U
          </div>
          <span className="text-lg font-bold tracking-tight">
            Uni<span className="text-accent">Stay</span>
          </span>
        </Link>

        <nav className="ml-auto hidden md:flex items-center gap-1">
          <Link
            to="/"
            className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            activeProps={{ className: "px-3 py-2 text-sm font-medium text-foreground" }}
            activeOptions={{ exact: true }}
          >
            Browse
          </Link>
          <Link
            to="/about"
            className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            activeProps={{ className: "px-3 py-2 text-sm font-medium text-foreground" }}
          >
            How it works
          </Link>
          <Link
            to="/list-hostel"
            className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            activeProps={{ className: "px-3 py-2 text-sm font-medium text-foreground" }}
          >
            List your hostel
          </Link>
        </nav>

        <div className="ml-auto md:ml-2 flex items-center gap-2">
          <button
            aria-label="Wishlist"
            className="hidden sm:inline-flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Heart className="h-5 w-5" />
          </button>
          <Link
            to="/"
            hash="search"
            className="inline-flex h-10 w-10 md:hidden items-center justify-center rounded-full bg-muted text-foreground"
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </Link>
          <button
            disabled
            className="hidden sm:inline-flex h-10 items-center rounded-full border border-border px-4 text-sm font-medium text-muted-foreground"
            title="Sign in (coming soon)"
          >
            Sign in
          </button>
          <button
            disabled
            className="hidden sm:inline-flex h-10 items-center rounded-full bg-accent px-4 text-sm font-semibold text-accent-foreground shadow-[var(--shadow-cta)] hover:opacity-95"
            title="Sign up (coming soon)"
          >
            Sign up
          </button>
          <button
            className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground"
            onClick={() => setOpen((v) => !v)}
            aria-label="Open menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-border bg-background">
          <nav className="container-page flex flex-col py-2">
            <Link to="/" onClick={() => setOpen(false)} className="py-3 text-base font-medium">
              Browse
            </Link>
            <Link to="/about" onClick={() => setOpen(false)} className="py-3 text-base font-medium">
              How it works
            </Link>
            <Link to="/list-hostel" onClick={() => setOpen(false)} className="py-3 text-base font-medium">
              List your hostel
            </Link>
            <div className="grid grid-cols-2 gap-2 py-3">
              <button
                disabled
                className="h-11 rounded-full border border-border text-sm font-medium text-muted-foreground"
              >
                Sign in
              </button>
              <button
                disabled
                className="h-11 rounded-full bg-accent text-sm font-semibold text-accent-foreground"
              >
                Sign up
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
