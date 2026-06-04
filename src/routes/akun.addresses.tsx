import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Trash2, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useCustomerAuth } from "@/hooks/use-customer-auth";

type Addr = {
  id: string;
  label: string | null;
  recipient_name: string;
  phone: string;
  address: string;
  city: string;
  postal_code: string | null;
  is_default: boolean;
};

export const Route = createFileRoute("/akun/addresses")({
  component: AddressesPage,
});

function AddressesPage() {
  const { user } = useCustomerAuth();
  const [rows, setRows] = useState<Addr[]>([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    label: "",
    recipient_name: "",
    phone: "",
    address: "",
    city: "",
    postal_code: "",
    is_default: false,
  });

  async function load() {
    if (!user) return;
    const { data } = await supabase
      .from("customer_addresses")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });
    setRows((data ?? []) as Addr[]);
  }

  useEffect(() => {
    void load();
  }, [user]);

  if (!user) return null;

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (form.is_default) {
      await supabase.from("customer_addresses").update({ is_default: false }).eq("user_id", user!.id);
    }
    const { error } = await supabase.from("customer_addresses").insert({ ...form, user_id: user!.id });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Alamat ditambahkan");
    setAdding(false);
    setForm({ label: "", recipient_name: "", phone: "", address: "", city: "", postal_code: "", is_default: false });
    void load();
  }

  async function remove(id: string) {
    await supabase.from("customer_addresses").delete().eq("id", id);
    void load();
  }

  async function setDefault(id: string) {
    await supabase.from("customer_addresses").update({ is_default: false }).eq("user_id", user!.id);
    await supabase.from("customer_addresses").update({ is_default: true }).eq("id", id);
    void load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Alamat tersimpan</h2>
        <Button size="sm" onClick={() => setAdding((s) => !s)}>
          <Plus className="h-4 w-4" /> Tambah
        </Button>
      </div>

      {adding && (
        <form onSubmit={add} className="space-y-3 rounded-lg border border-border bg-card p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Label (opsional)</Label>
              <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Rumah / Kantor" className="mt-1" />
            </div>
            <div>
              <Label>Nama penerima</Label>
              <Input required value={form.recipient_name} onChange={(e) => setForm({ ...form, recipient_name: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>No HP</Label>
              <Input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>Kota</Label>
              <Input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="mt-1" />
            </div>
            <div className="sm:col-span-2">
              <Label>Alamat lengkap</Label>
              <Textarea required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>Kode pos</Label>
              <Input value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} className="mt-1" />
            </div>
            <label className="flex items-center gap-2 self-end text-sm">
              <input type="checkbox" checked={form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })} />
              Jadikan default
            </label>
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm">Simpan</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setAdding(false)}>Batal</Button>
          </div>
        </form>
      )}

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Belum ada alamat tersimpan.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((a) => (
            <li key={a.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {a.label ?? a.recipient_name}
                    {a.is_default && (
                      <span className="ml-2 inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                        <Star className="h-3 w-3" /> Default
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">{a.recipient_name} · {a.phone}</p>
                  <p className="mt-1 text-sm">{a.address}</p>
                  <p className="text-xs text-muted-foreground">{a.city}{a.postal_code ? ` · ${a.postal_code}` : ""}</p>
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  {!a.is_default && (
                    <Button variant="ghost" size="sm" onClick={() => setDefault(a.id)}>
                      <Star className="h-3.5 w-3.5" /> Default
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => remove(a.id)}>
                    <Trash2 className="h-3.5 w-3.5" /> Hapus
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}