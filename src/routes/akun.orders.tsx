import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCustomerAuth } from "@/hooks/use-customer-auth";
import { useLang } from "@/i18n/LangProvider";
import { formatPrice } from "@/i18n/format";

type OrderRow = {
  id: string;
  created_at: string;
  total_idr: number;
  status: string;
  payment_status: string;
};

export const Route = createFileRoute("/akun/orders")({
  component: OrdersPage,
});

function OrdersPage() {
  const { user } = useCustomerAuth();
  const lang = useLang();
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    void supabase
      .from("orders")
      .select("id,created_at,total_idr,status,payment_status")
      .eq("customer_user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setRows((data ?? []) as OrderRow[]);
        setLoading(false);
      });
  }, [user]);

  if (!user) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Pesanan Saya</h2>
      {loading ? (
        <p className="text-sm text-muted-foreground">Memuat…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Belum ada pesanan.</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {rows.map((o) => (
            <li key={o.id} className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <Link
                  to={"/$lang/order/$id" as never}
                  params={{ lang, id: o.id } as never}
                  className="text-sm font-semibold hover:underline"
                >
                  #{o.id.slice(0, 8).toUpperCase()}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {new Date(o.created_at).toLocaleString("id-ID")}
                </p>
                <div className="mt-1 flex gap-1.5">
                  <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase">
                    {o.status}
                  </span>
                  <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase">
                    {o.payment_status}
                  </span>
                </div>
              </div>
              <p className="text-sm font-semibold">{formatPrice(o.total_idr, lang)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}