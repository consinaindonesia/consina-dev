import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X, Search, MapPin } from "lucide-react";

const links = [
  { to: "/", label: "Home" },
  { to: "/catalog", label: "Catalog" },
  { to: "/catalog", label: "Carriers" },
  { to: "/catalog", label: "Tents" },
  { to: "/catalog", label: "Apparel" },
  { to: "/catalog", label: "Footwear" },
  { to: "/", label: "Stores" },
  { to: "/", label: "Story" },
];

export function Nav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-4 md:px-8">
        <Link to="/" className="flex items-center gap-2">
          <span className="font-[Archivo] text-2xl font-black tracking-tight text-primary">
            CONSINA
          </span>
          <span className="hidden text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground md:inline">
            Since 1999
          </span>
        </Link>
        <nav className="hidden items-center gap-7 lg:flex">
          {links.slice(1).map((l) => (
            <Link
              key={l.label}
              to={l.to}
              className="text-sm font-medium text-foreground/80 transition-colors hover:text-primary"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <button className="hidden h-9 w-9 items-center justify-center rounded-full text-foreground/70 transition hover:bg-muted hover:text-primary md:flex" aria-label="Search">
            <Search className="h-4 w-4" />
          </button>
          <Link
            to="/"
            className="hidden items-center gap-1.5 rounded-full border border-primary/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary transition hover:bg-primary hover:text-primary-foreground md:inline-flex"
          >
            <MapPin className="h-3.5 w-3.5" />
            Find a store
          </Link>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full text-foreground lg:hidden"
            onClick={() => setOpen(!open)}
            aria-label="Menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-border bg-background lg:hidden">
          <nav className="mx-auto flex max-w-[1280px] flex-col gap-1 px-4 py-4">
            {links.map((l) => (
              <Link
                key={l.label}
                to={l.to}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}