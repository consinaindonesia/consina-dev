import { useState } from "react";
import { Ruler } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";

export type SizeGuide = {
  id: string;
  name: string;
  description: string | null;
  headers: string[];
  rows: string[][];
};

export function SizeGuideDialog({
  guide,
  triggerLabel,
}: {
  guide: SizeGuide;
  triggerLabel: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-secondary underline-offset-4 hover:underline"
        >
          <Ruler className="h-3.5 w-3.5" />
          {triggerLabel}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{guide.name}</DialogTitle>
          {guide.description && <DialogDescription>{guide.description}</DialogDescription>}
        </DialogHeader>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {guide.headers.map((h, i) => (
                  <th key={i} className="px-3 py-2 text-left font-semibold text-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {guide.rows.map((row, i) => (
                <tr key={i} className="border-b border-border/60">
                  {guide.headers.map((_, ci) => (
                    <td key={ci} className="px-3 py-2 text-foreground/90">
                      {row[ci] ?? ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}