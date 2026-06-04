import { Heart } from "lucide-react";
import { useCustomerAuth } from "@/hooks/use-customer-auth";
import { useWishlist } from "@/lib/wishlist-store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = {
  productId: string;
  className?: string;
  size?: "sm" | "md";
  variant?: "icon" | "button";
  label?: string;
};

export function WishlistButton({ productId, className, size = "sm", variant = "icon", label }: Props) {
  const { user } = useCustomerAuth();
  const { has, toggle } = useWishlist(user?.id ?? null);
  const active = has(productId);
  const iconSize = size === "md" ? "h-5 w-5" : "h-4 w-4";

  async function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const wasActive = active;
    await toggle(productId);
    toast.success(wasActive ? "Dihapus dari wishlist" : "Disimpan ke wishlist");
  }

  if (variant === "button") {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        aria-label={active ? "Hapus dari wishlist" : "Tambahkan ke wishlist"}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition",
          active
            ? "border-primary/40 bg-primary/5 text-primary"
            : "border-input bg-background hover:bg-accent",
          className,
        )}
      >
        <Heart className={cn(iconSize, active && "fill-primary")} />
        {label ?? (active ? "Tersimpan" : "Wishlist")}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={active ? "Hapus dari wishlist" : "Tambahkan ke wishlist"}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm backdrop-blur transition hover:bg-background",
        className,
      )}
    >
      <Heart className={cn(iconSize, active ? "fill-primary text-primary" : "text-foreground/70")} />
    </button>
  );
}