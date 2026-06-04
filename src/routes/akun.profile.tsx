import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useCustomerAuth } from "@/hooks/use-customer-auth";

export const Route = createFileRoute("/akun/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user, profile } = useCustomerAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setPhone(profile.phone ?? "");
    }
  }, [profile]);

  if (!user) return null;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase
        .from("customer_profiles")
        .upsert({
          id: user!.id,
          email: user!.email ?? "",
          full_name: fullName.trim() || null,
          phone: phone.trim() || null,
        });
      if (error) throw error;
      toast.success("Profil tersimpan");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="max-w-md space-y-4 rounded-lg border border-border bg-card p-6">
      <h2 className="text-lg font-semibold">Profil</h2>
      <div>
        <Label>Email</Label>
        <Input value={user.email ?? ""} disabled className="mt-1" />
      </div>
      <div>
        <Label htmlFor="fn">Nama lengkap</Label>
        <Input id="fn" value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1" />
      </div>
      <div>
        <Label htmlFor="ph">No HP</Label>
        <Input id="ph" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1" />
      </div>
      <Button type="submit" disabled={busy}>Simpan</Button>
    </form>
  );
}