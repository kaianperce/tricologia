import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentClinic } from "@/lib/trichocare";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Package } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/produtos/")({
  component: ProductsPage,
});

function ProductsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", brand: "", category: "", main_active: "", purpose: "",
    usage_instructions: "", contraindications: "", used_in_cabin: true, used_at_home: false,
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*").order("name");
      return data ?? [];
    },
  });

  async function create() {
    if (!form.name.trim()) return toast.error("Informe o nome do produto");
    const clinic = await getCurrentClinic();
    if (!clinic) return toast.error("Clínica não encontrada");
    const { error } = await supabase.from("products").insert({
      clinic_id: clinic.id,
      name: form.name.trim(),
      brand: form.brand || null,
      category: form.category || null,
      main_active: form.main_active || null,
      purpose: form.purpose || null,
      usage_instructions: form.usage_instructions || null,
      contraindications: form.contraindications || null,
      used_in_cabin: form.used_in_cabin,
      used_at_home: form.used_at_home,
    });
    if (error) return toast.error(error.message);
    toast.success("Produto cadastrado");
    setForm({ name: "", brand: "", category: "", main_active: "", purpose: "", usage_instructions: "", contraindications: "", used_in_cabin: true, used_at_home: false });
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["products"] });
  }

  async function remove(id: string) {
    if (!confirm("Excluir este produto?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["products"] });
  }

  return (
    <div>
      <PageHeader
        title="Produtos"
        subtitle="Cosméticos, ativos e insumos usados em cabine e em casa."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Novo produto</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle className="font-display">Novo produto</DialogTitle></DialogHeader>
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                <div><Label>Nome *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Marca</Label><Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></div>
                  <div><Label>Categoria</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Shampoo, loção…" /></div>
                </div>
                <div><Label>Ativo principal</Label><Input value={form.main_active} onChange={(e) => setForm({ ...form, main_active: e.target.value })} /></div>
                <div><Label>Finalidade</Label><Input value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} /></div>
                <div><Label>Modo de uso</Label><Textarea rows={2} value={form.usage_instructions} onChange={(e) => setForm({ ...form, usage_instructions: e.target.value })} /></div>
                <div><Label>Contraindicações</Label><Textarea rows={2} value={form.contraindications} onChange={(e) => setForm({ ...form, contraindications: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center justify-between rounded-lg border bg-card px-3 py-2 text-sm">
                    <span>Uso em cabine</span><Switch checked={form.used_in_cabin} onCheckedChange={(v) => setForm({ ...form, used_in_cabin: v })} />
                  </label>
                  <label className="flex items-center justify-between rounded-lg border bg-card px-3 py-2 text-sm">
                    <span>Uso em casa</span><Switch checked={form.used_at_home} onCheckedChange={(v) => setForm({ ...form, used_at_home: v })} />
                  </label>
                </div>
              </div>
              <DialogFooter><Button onClick={create}>Cadastrar</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="p-6">
        {products.length === 0 ? (
          <Card className="border-0 card-premium">
            <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary"><Package className="h-6 w-6" /></div>
              <p className="text-sm text-muted-foreground">Nenhum produto cadastrado ainda.</p>
              <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Cadastrar o primeiro</Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-0 card-premium">
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Produto</th>
                    <th className="px-4 py-3">Marca</th>
                    <th className="px-4 py-3">Ativo</th>
                    <th className="px-4 py-3">Uso</th>
                    <th className="px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p: any) => (
                    <tr key={p.id} className="border-t">
                      <td className="px-4 py-3">
                        <div className="font-medium">{p.name}</div>
                        {p.purpose && <div className="text-xs text-muted-foreground">{p.purpose}</div>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{p.brand ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.main_active ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {[p.used_in_cabin && "Cabine", p.used_at_home && "Home care"].filter(Boolean).join(" · ") || "—"}
                      </td>
                      <td className="px-4 py-3"><Button size="icon" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4" /></Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
