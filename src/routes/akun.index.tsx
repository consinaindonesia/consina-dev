import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Package, MapPin, Heart, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCustomerAuth } from "@/hooks/use-customer-auth";

export const Route = createFileRoute("/akun/")({
  component: AkunIndex,
});

function AkunIndex() {
  const { user } = useCustomerAuth();
  const [counts, setCounts] = useState({ orders: 0, addresses: 0, wishlist: 0 });

  useEffect(() => {
    if (!user) return;
    void Promise.all([
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("customer_user_id", user.id),
      supabase.from("customer_addresses").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("wishlists").select("product_id", { count: "exact", head: true }).eq("user_id", user.id),
    ]).then(([o, a, w]) => {
      setCounts({ orders: o.count ?? 0, addresses: a.count ?? 0, wishlist: w.count ?? 0 });
    });
  }, [user]);

  const cards = [
    { to: "/akun/profile", label: "Profil", value: "Kelola data diri", icon: User },
    { to: "/akun/addresses", label: "Alamat tersimpan", value: counts.addresses, icon: MapPin },
    { to: "/akun/orders", label: "Pesanan", value: counts.orders, icon: Package },
    { to: "/wishlist", label: "Wishlist", value: counts.wishlist, icon: Heart },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <Link
            key={c.to}
            to={c.to as never}
            className="rounded-lg border border-border bg-card p-5 transition hover:border-primary/40 hover:shadow-sm"
          >
            <Icon className="h-5 w-5 text-primary" />
            <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {c.label}
            </p>
            <p className="mt-1 text-xl font-semibold">{c.value}</p>
          </Link>
        );
      })}
    </div>
  );
}