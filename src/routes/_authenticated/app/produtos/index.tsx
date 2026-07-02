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
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Package, X } from "lucide-react";
import { toast } from "sonner";

type Active = { name: string; concentration: string };

const EMPTY = {
  name: "", brand: "", category: "", presentation: "", purpose: "",
  usage_instructions: "", contraindications: "", indications: "",
  used_in_cabin: true, used_at_home: false,
};

export const Route = createFileRoute("/_authenticated/app/produtos/")({
  component: ProductsPage,
});

function ProductsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [actives, setActives] = useState<Active[]>([{ name: "", concentration: "" }]);

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*").order("name");
      return data ?? [];
    },
  });

  function reset() {
    setForm({ ...EMPTY });
    setActives([{ name: "", concentration: "" }]);
  }

  async function create() {
    if (!form.name.trim()) return toast.error("Informe o nome do produto");
    const clinic = await getCurrentClinic();
    if (!clinic) return toast.error("Clínica não encontrada");
    const cleanActives = actives
      .map((a) => ({ name: a.name.trim(), concentration: a.concentration.trim() }))
      .filter((a) => a.name);
    const indications = form.indications.split(",").map((x) => x.trim()).filter(Boolean);
    const { error } = await supabase.from("products").insert({
      clinic_id: clinic.id,
      name: form.name.trim(),
      brand: form.brand || null,
      category: form.category || null,
      presentation: form.presentation || null,
      // main_active mantido para compatibilidade: primeiro ativo listado
      main_active: cleanActives[0]?.name || null,
      actives: cleanActives,
      indications,
      purpose: form.purpose || null,
      usage_instructions: form.usage_instructions || null,
      contraindications: form.contraindications || null,
      used_in_cabin: form.used_in_cabin,
      used_at_home: form.used_at_home,
    } as any);
    if (error) return toast.error(error.message);
    toast.success("Produto cadastrado");
    reset();
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["products"] });
  }

  async function remove(id: string) {
    if (!confirm("Excluir este produto?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["products"] });
  }

  function setActive(i: number, patch: Partial<Active>) {
    setActives((prev) => prev.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));
  }

  return (
    <div>
      <PageHeader
        title="Produtos e ativos"
        subtitle="Cosméticos, ativos e insumos usados em cabine e em casa — com concentração e indicações."
        actions={
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Novo produto</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle className="font-display">Novo produto</DialogTitle></DialogHeader>
              <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
                <div><Label>Nome *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Marca</Label><Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></div>
                  <div><Label>Categoria</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Shampoo, loção…" /></div>
                </div>
                <div><Label>Apresentação</Label><Input value={form.presentation} onChange={(e) => setForm({ ...form, presentation: e.target.value })} placeholder="Ampola 5ml, sérum 30ml, frasco 200ml…" /></div>

                <div className="rounded-lg border bg-muted/30 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <Label className="text-sm">Ativos e concentrações</Label>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setActives([...actives, { name: "", concentration: "" }])}>
                      <Plus className="mr-1 h-3.5 w-3.5" />Ativo
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {actives.map((a, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Input className="flex-1" placeholder="Ex.: Minoxidil, Cafeína, Peptídeos" value={a.name} onChange={(e) => setActive(i, { name: e.target.value })} />
                        <Input className="w-28" placeholder="5%, 2mg/ml" value={a.concentration} onChange={(e) => setActive(i, { concentration: e.target.value })} />
                        {actives.length > 1 && (
                          <Button type="button" size="icon" variant="ghost" onClick={() => setActives(actives.filter((_, idx) => idx !== i))}><X className="h-4 w-4" /></Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div><Label>Indicações (condições — vírgula)</Label><Input value={form.indications} onChange={(e) => setForm({ ...form, indications: e.target.value })} placeholder="Alopecia androgenética, eflúvio telógeno, oleosidade…" /></div>
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
                    <th className="px-4 py-3">Ativos</th>
                    <th className="px-4 py-3">Indicações</th>
                    <th className="px-4 py-3">Uso</th>
                    <th className="px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p: any) => {
                    const acts: Active[] = Array.isArray(p.actives) ? p.actives : [];
                    const inds: string[] = Array.isArray(p.indications) ? p.indications : [];
                    return (
                      <tr key={p.id} className="border-t align-top">
                        <td className="px-4 py-3">
                          <div className="font-medium">{p.name}</div>
                          {p.purpose && <div className="text-xs text-muted-foreground">{p.purpose}</div>}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{p.brand ?? "—"}</td>
                        <td className="px-4 py-3">
                          {acts.length ? (
                            <div className="flex flex-wrap gap-1">
                              {acts.map((a, i) => (
                                <Badge key={i} variant="secondary" className="font-normal">
                                  {a.name}{a.concentration ? ` ${a.concentration}` : ""}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">{p.main_active ?? "—"}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {inds.length ? (
                            <div className="flex flex-wrap gap-1">
                              {inds.slice(0, 3).map((t, i) => <Badge key={i} variant="outline" className="font-normal">{t}</Badge>)}
                              {inds.length > 3 && <span className="text-xs text-muted-foreground">+{inds.length - 3}</span>}
                            </div>
                          ) : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {[p.used_in_cabin && "Cabine", p.used_at_home && "Home care"].filter(Boolean).join(" · ") || "—"}
                        </td>
                        <td className="px-4 py-3"><Button size="icon" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4" /></Button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
