import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";

import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/shipping")({
  head: () => ({
    meta: [
      { title: "Shipping — Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ShippingAdmin,
});

type Zone = {
  id: string;
  region_name: string;
  cities: string[];
  is_default: boolean;
  base_cost_idr: number;
  per_kg_cost_idr: number;
  delivery_days_min: number;
  delivery_days_max: number;
  is_active: boolean;
  sort_order: number;
};

type Method = {
  id: string;
  name: string;
  code: string | null;
  multiplier: number;
  is_active: boolean;
  sort_order: number;
};

function ShippingAdmin() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [methods, setMethods] = useState<Method[]>([]);
  const [loading, setLoading] = useState(true);

  async function reload() {
    setLoading(true);
    const [{ data: z }, { data: m }] = await Promise.all([
      supabase.from("shipping_zones").select("*").order("sort_order"),
      supabase.from("shipping_methods").select("*").order("sort_order"),
    ]);
    setZones((z ?? []) as Zone[]);
    setMethods((m ?? []) as Method[]);
    setLoading(false);
  }

  useEffect(() => {
    void reload();
  }, []);

  async function addZone() {
    const { error } = await supabase.from("shipping_zones").insert({
      region_name: "New zone",
      cities: [],
      base_cost_idr: 0,
      per_kg_cost_idr: 0,
    });
    if (error) toast.error(error.message);
    else void reload();
  }

  async function addMethod() {
    const { error } = await supabase.from("shipping_methods").insert({
      name: "New method",
      multiplier: 1.0,
    });
    if (error) toast.error(error.message);
    else void reload();
  }

  async function saveZone(z: Zone) {
    const { error } = await supabase
      .from("shipping_zones")
      .update({
        region_name: z.region_name,
        cities: z.cities,
        is_default: z.is_default,
        base_cost_idr: z.base_cost_idr,
        per_kg_cost_idr: z.per_kg_cost_idr,
        delivery_days_min: z.delivery_days_min,
        delivery_days_max: z.delivery_days_max,
        is_active: z.is_active,
        sort_order: z.sort_order,
      })
      .eq("id", z.id);
    if (error) toast.error(error.message);
    else toast.success("Zone saved");
  }

  async function saveMethod(m: Method) {
    const { error } = await supabase
      .from("shipping_methods")
      .update({
        name: m.name,
        code: m.code,
        multiplier: m.multiplier,
        is_active: m.is_active,
        sort_order: m.sort_order,
      })
      .eq("id", m.id);
    if (error) toast.error(error.message);
    else toast.success("Method saved");
  }

  async function deleteZone(id: string) {
    if (!confirm("Delete this zone?")) return;
    const { error } = await supabase.from("shipping_zones").delete().eq("id", id);
    if (error) toast.error(error.message);
    else void reload();
  }

  async function deleteMethod(id: string) {
    if (!confirm("Delete this method?")) return;
    const { error } = await supabase.from("shipping_methods").delete().eq("id", id);
    if (error) toast.error(error.message);
    else void reload();
  }

  if (loading) {
    return (
      <AdminShell>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <div className="px-4 py-6 sm:px-8 space-y-10">
        <header>
          <h1 className="text-2xl font-bold">Shipping</h1>
          <p className="text-sm text-muted-foreground">
            Manage shipping zones (regional rates) and methods (carriers).
          </p>
        </header>

        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Zones</h2>
            <Button size="sm" onClick={addZone}>
              <Plus className="mr-1 h-4 w-4" /> Add zone
            </Button>
          </div>
          <div className="mt-3 space-y-3">
            {zones.map((z, idx) => (
              <div key={z.id} className="rounded-lg border border-border bg-card p-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <Label className="text-xs">Region name</Label>
                    <Input
                      value={z.region_name}
                      onChange={(e) => {
                        const next = [...zones];
                        next[idx] = { ...z, region_name: e.target.value };
                        setZones(next);
                      }}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">
                      Cities (comma-separated, case-insensitive)
                    </Label>
                    <Input
                      value={z.cities.join(", ")}
                      onChange={(e) => {
                        const next = [...zones];
                        next[idx] = {
                          ...z,
                          cities: e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        };
                        setZones(next);
                      }}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Base cost (IDR)</Label>
                    <Input
                      type="number"
                      value={z.base_cost_idr}
                      onChange={(e) => {
                        const next = [...zones];
                        next[idx] = { ...z, base_cost_idr: Number(e.target.value) };
                        setZones(next);
                      }}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Per kg cost (IDR)</Label>
                    <Input
                      type="number"
                      value={z.per_kg_cost_idr}
                      onChange={(e) => {
                        const next = [...zones];
                        next[idx] = { ...z, per_kg_cost_idr: Number(e.target.value) };
                        setZones(next);
                      }}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Delivery days (min)</Label>
                    <Input
                      type="number"
                      value={z.delivery_days_min}
                      onChange={(e) => {
                        const next = [...zones];
                        next[idx] = { ...z, delivery_days_min: Number(e.target.value) };
                        setZones(next);
                      }}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Delivery days (max)</Label>
                    <Input
                      type="number"
                      value={z.delivery_days_max}
                      onChange={(e) => {
                        const next = [...zones];
                        next[idx] = { ...z, delivery_days_max: Number(e.target.value) };
                        setZones(next);
                      }}
                    />
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-6">
                  <label className="flex items-center gap-2 text-xs">
                    <Switch
                      checked={z.is_default}
                      onCheckedChange={(v) => {
                        const next = zones.map((zz) => ({ ...zz, is_default: false }));
                        next[idx] = { ...z, is_default: v };
                        setZones(next);
                      }}
                    />
                    Default (fallback) zone
                  </label>
                  <label className="flex items-center gap-2 text-xs">
                    <Switch
                      checked={z.is_active}
                      onCheckedChange={(v) => {
                        const next = [...zones];
                        next[idx] = { ...z, is_active: v };
                        setZones(next);
                      }}
                    />
                    Active
                  </label>
                  <div className="ml-auto flex gap-2">
                    <Button size="sm" onClick={() => saveZone(z)}>Save</Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteZone(z.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Methods (carriers)</h2>
            <Button size="sm" onClick={addMethod}>
              <Plus className="mr-1 h-4 w-4" /> Add method
            </Button>
          </div>
          <div className="mt-3 space-y-3">
            {methods.map((m, idx) => (
              <div key={m.id} className="rounded-lg border border-border bg-card p-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <div>
                    <Label className="text-xs">Name</Label>
                    <Input
                      value={m.name}
                      onChange={(e) => {
                        const next = [...methods];
                        next[idx] = { ...m, name: e.target.value };
                        setMethods(next);
                      }}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Code</Label>
                    <Input
                      value={m.code ?? ""}
                      onChange={(e) => {
                        const next = [...methods];
                        next[idx] = { ...m, code: e.target.value };
                        setMethods(next);
                      }}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Price multiplier</Label>
                    <Input
                      type="number"
                      step="0.05"
                      value={m.multiplier}
                      onChange={(e) => {
                        const next = [...methods];
                        next[idx] = { ...m, multiplier: Number(e.target.value) };
                        setMethods(next);
                      }}
                    />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-6">
                  <label className="flex items-center gap-2 text-xs">
                    <Switch
                      checked={m.is_active}
                      onCheckedChange={(v) => {
                        const next = [...methods];
                        next[idx] = { ...m, is_active: v };
                        setMethods(next);
                      }}
                    />
                    Active
                  </label>
                  <div className="ml-auto flex gap-2">
                    <Button size="sm" onClick={() => saveMethod(m)}>Save</Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteMethod(m.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}