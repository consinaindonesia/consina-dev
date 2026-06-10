import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ShoppingCart, Trash2, Minus, Plus } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCart, removeFromCart, updateCartQuantity } from "@/lib/cart-store";
import { useLang } from "@/i18n/LangProvider";
import { formatPrice } from "@/i18n/format";

export function CartDrawer() {
  const [open, setOpen] = useState(false);
  const lang = useLang();
  const { items, count, subtotal } = useCart();

  const checkoutPath = lang === "id" ? "/id/checkout?cart=1" : "/en/checkout?cart=1";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          aria-label="Cart"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-foreground/70 transition hover:bg-muted hover:text-primary"
        >
          <ShoppingCart className="h-4 w-4" />
          {count > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {count}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col border-l border-stone-200 bg-stone-50 text-stone-950 shadow-2xl sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Keranjang ({count})</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto py-4">
          {items.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Keranjang kosong.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((it) => {
                const name = lang === "id" ? it.name_id : it.name_en;
                return (
                  <li key={it.key} className="flex gap-3 py-3">
                    {it.thumbnail ? (
                      <img
                        src={it.thumbnail}
                        alt={name}
                        className="h-16 w-16 rounded object-cover"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded bg-muted" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium">{name}</p>
                      {Object.keys(it.attributes).length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {Object.entries(it.attributes)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(" · ")}
                        </p>
                      )}
                      <p className="mt-1 text-sm font-semibold">
                        {formatPrice(it.price_idr * it.quantity, lang)}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="inline-flex items-center rounded border border-border">
                          <button
                            onClick={() => updateCartQuantity(it.key, it.quantity - 1)}
                            className="px-2 py-1 hover:bg-muted disabled:opacity-40"
                            disabled={it.quantity <= 1}
                            aria-label="-"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="min-w-[28px] px-2 text-center text-xs">
                            {it.quantity}
                          </span>
                          <button
                            onClick={() => updateCartQuantity(it.key, it.quantity + 1)}
                            className="px-2 py-1 hover:bg-muted disabled:opacity-40"
                            disabled={it.quantity >= 99}
                            aria-label="+"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <button
                          onClick={() => removeFromCart(it.key)}
                          className="text-muted-foreground hover:text-destructive"
                          aria-label="Remove"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <SheetFooter className="border-t border-border pt-4">
          <div className="w-full space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-semibold">{formatPrice(subtotal, lang)}</span>
            </div>
            <Button
              asChild
              disabled={items.length === 0}
              className="w-full"
              onClick={() => setOpen(false)}
            >
              <Link to={checkoutPath as never}>Checkout</Link>
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
