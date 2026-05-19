import { Link } from "@tanstack/react-router";
import { Instagram, Facebook, Youtube } from "lucide-react";

const cols = [
  {
    title: "Shop",
    items: ["Carriers", "Tents & Shelter", "Apparel", "Footwear", "Accessories"],
  },
  {
    title: "Company",
    items: ["Our Story", "Responsible Trekker", "Sustainability", "Careers", "Press"],
  },
  {
    title: "Support",
    items: ["Store Locator", "Warranty", "Care Guides", "Contact", "FAQ"],
  },
];

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border bg-primary text-primary-foreground">
      <div className="mx-auto max-w-[1280px] px-4 py-16 md:px-8">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <div className="font-[Archivo] text-3xl font-black tracking-tight">CONSINA</div>
            <p className="mt-1 text-xs font-medium uppercase tracking-[0.25em] text-accent">
              Inspired by Experience
            </p>
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-primary-foreground/70">
              An Indonesian outdoor lifestyle brand since 1999. Built in Jakarta,
              tested across the archipelago — from Rinjani's ridgelines to the
              rainforests of Kalimantan.
            </p>
            <div className="mt-6 flex gap-3">
              {[Instagram, Facebook, Youtube].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-primary-foreground/20 text-primary-foreground transition hover:border-accent hover:text-accent"
                  aria-label="Social link"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
          {cols.map((c) => (
            <div key={c.title}>
              <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                {c.title}
              </h4>
              <ul className="mt-5 space-y-3">
                {c.items.map((i) => (
                  <li key={i}>
                    <Link to="/" className="text-sm text-primary-foreground/75 transition hover:text-primary-foreground">
                      {i}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-14 flex flex-col gap-3 border-t border-primary-foreground/10 pt-6 text-xs text-primary-foreground/55 md:flex-row md:items-center md:justify-between">
          <span>© {new Date().getFullYear()} Consina. Jakarta, Indonesia.</span>
          <div className="flex gap-5">
            <Link to="/">Privacy</Link>
            <Link to="/">Terms</Link>
            <Link to="/">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}