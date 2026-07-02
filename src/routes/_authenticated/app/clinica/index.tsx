import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentClinic, type Clinic } from "@/lib/trichocare";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Building2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/clinica/")({
  component: ClinicPage,
});

function ClinicPage() {
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Clinic>>({});

  useEffect(() => {
    (async () => {
      const c = await getCurrentClinic();
      setClinic(c);
      setForm(c ?? {});
      setLoading(false);
    })();
  }, []);

  async function save() {
    if (!clinic) return;
    setSaving(true);
    const { error } = await supabase.from("clinics").update({
      name: form.name ?? clinic.name,
      legal_id: form.legal_id ?? null,
      responsible_name: form.responsible_name ?? null,
      email: form.email ?? null,
      phone: form.phone ?? null,
      whatsapp: form.whatsapp ?? null,
      instagram: form.instagram ?? null,
      address: form.address ?? null,
      logo_url: form.logo_url ?? null,
      brand_color: form.brand_color ?? null,
    } as any).eq("id", clinic.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Dados da clínica atualizados");
    setClinic({ ...clinic, ...form } as Clinic);
  }

  if (loading) return <div className="p-10 text-sm text-muted-foreground">Carregando…</div>;
  if (!clinic) {
    return (
      <div>
        <PageHeader title="Clínica" />
        <div className="p-6">
          <Card className="border-0 card-premium">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              Sua conta ainda não está vinculada a uma clínica.
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Clínica"
        subtitle="Identificação que aparece em fichas, relatórios e portal do cliente."
        actions={<Button onClick={save} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar alterações</Button>}
      />
      <div className="grid gap-4 p-6 lg:grid-cols-3">
        <Card className="border-0 card-premium lg:col-span-2">
          <CardContent className="space-y-4 p-6">
            <h3 className="font-display text-lg">Dados gerais</h3>
            <div><Label>Nome da clínica *</Label><Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>CNPJ / Documento</Label><Input value={form.legal_id ?? ""} onChange={(e) => setForm({ ...form, legal_id: e.target.value })} /></div>
              <div><Label>Responsável técnico</Label><Input value={form.responsible_name ?? ""} onChange={(e) => setForm({ ...form, responsible_name: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>E-mail</Label><Input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Telefone</Label><Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>WhatsApp</Label><Input value={form.whatsapp ?? ""} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} /></div>
              <div><Label>Instagram</Label><Input value={form.instagram ?? ""} onChange={(e) => setForm({ ...form, instagram: e.target.value })} placeholder="@minhaclinica" /></div>
            </div>
            <div><Label>Endereço</Label><Textarea rows={2} value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          </CardContent>
        </Card>

        <Card className="border-0 card-premium">
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <h3 className="font-display text-lg">Identidade visual</h3>
            </div>
            <div className="grid place-items-center rounded-lg border bg-muted/40 p-6">
              {form.logo_url ? (
                <img src={form.logo_url} alt="Logo" className="max-h-24 max-w-full object-contain" />
              ) : (
                <div className="text-xs text-muted-foreground">Sem logo</div>
              )}
            </div>
            <div><Label>URL do logo</Label><Input value={form.logo_url ?? ""} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} placeholder="https://…" /></div>
            <div><Label>Cor de destaque</Label><Input type="color" value={form.brand_color ?? "#8a9d83"} onChange={(e) => setForm({ ...form, brand_color: e.target.value })} className="h-10" /></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
