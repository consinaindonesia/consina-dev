import { Star } from "lucide-react";

const SIZE_CLASSES: Record<"sm" | "md" | "lg", string> = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-5 w-5",
};

export function StarRating({
  rating,
  count,
  size = "sm",
  showCount = true,
  className = "",
}: {
  rating: number;
  count?: number;
  size?: "sm" | "md" | "lg";
  showCount?: boolean;
  className?: string;
}) {
  const starClass = SIZE_CLASSES[size];
  const clamped = Math.max(0, Math.min(5, rating));

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => {
          const fill = Math.max(0, Math.min(1, clamped - i)) * 100;
          return (
            <span key={i} className={`relative ${starClass}`}>
              <Star className={`absolute inset-0 ${starClass} text-muted-foreground/30`} />
              <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill}%` }}>
                <Star className={`${starClass} fill-amber-400 text-amber-400`} />
              </span>
            </span>
          );
        })}
      </div>
      {showCount && typeof count === "number" && (
        <span className="text-xs text-muted-foreground">
          {rating.toFixed(1)} {count > 0 && `(${count})`}
        </span>
      )}
    </div>
  );
}
