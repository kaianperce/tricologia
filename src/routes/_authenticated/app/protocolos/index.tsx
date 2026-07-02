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
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ListChecks, X, GripVertical } from "lucide-react";
import { toast } from "sonner";

type Step = { title: string; description: string; product_ids: string[] };

const EMPTY = {
  name: "", description: "", indications: "", contraindications: "",
  sessions_planned: "" as number | "", interval_days: 7 as number | "", home_care: "",
};

export const Route = createFileRoute("/_authenticated/app/protocolos/")({
  component: ProtocolsPage,
});

function ProtocolsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [steps, setSteps] = useState<Step[]>([{ title: "", description: "", product_ids: [] }]);

  const { data: protocols = [] } = useQuery({
    queryKey: ["protocols"],
    queryFn: async () => {
      const { data } = await supabase.from("treatment_protocols").select("*").order("name");
      return data ?? [];
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id,name,main_active").order("name");
      return data ?? [];
    },
  });

  const productName = (id: string) => (products as any[]).find((p) => p.id === id)?.name ?? "Produto";

  function reset() {
    setForm({ ...EMPTY });
    setSteps([{ title: "", description: "", product_ids: [] }]);
  }

  function setStep(i: number, patch: Partial<Step>) {
    setSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }

  async function create() {
    if (!form.name.trim()) return toast.error("Informe o nome do protocolo");
    const clinic = await getCurrentClinic();
    if (!clinic) return toast.error("Clínica não encontrada");
    const cleanSteps = steps
      .map((s, idx) => ({
        order: idx + 1,
        title: s.title.trim(),
        description: s.description.trim(),
        product_ids: s.product_ids,
      }))
      .filter((s) => s.title || s.description || s.product_ids.length);
    const indications = form.indications.split(",").map((x) => x.trim()).filter(Boolean);
    const { error } = await supabase.from("treatment_protocols").insert({
      clinic_id: clinic.id,
      name: form.name.trim(),
      description: form.description || null,
      indications,
      contraindications: form.contraindications || null,
      sessions_planned: form.sessions_planned === "" ? 0 : Number(form.sessions_planned),
      interval_days: form.interval_days === "" ? 7 : Number(form.interval_days),
      steps: cleanSteps,
      home_care: form.home_care || null,
    } as any);
    if (error) return toast.error(error.message);
    toast.success("Protocolo cadastrado");
    reset();
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["protocols"] });
  }

  async function remove(id: string) {
    if (!confirm("Excluir este protocolo?")) return;
    const { error } = await supabase.from("treatment_protocols").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["protocols"] });
  }

  return (
    <div>
      <PageHeader
        title="Protocolos de tratamento"
        subtitle="Protocolos reutilizáveis com etapas, produtos e indicações — base para a sugestão da IA."
        actions={
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Novo protocolo</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle className="font-display">Novo protocolo</DialogTitle></DialogHeader>
              <div className="space-y-3 max-h-[68vh] overflow-y-auto pr-1">
                <div><Label>Nome *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex.: Protocolo antiqueda intensivo" /></div>
                <div><Label>Descrição</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                <div><Label>Indicações (condições — vírgula)</Label><Input value={form.indications} onChange={(e) => setForm({ ...form, indications: e.target.value })} placeholder="Alopecia androgenética, eflúvio telógeno…" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Sessões planejadas</Label><Input type="number" value={form.sessions_planned} onChange={(e) => setForm({ ...form, sessions_planned: e.target.value === "" ? "" : Number(e.target.value) })} /></div>
                  <div><Label>Intervalo (dias)</Label><Input type="number" value={form.interval_days} onChange={(e) => setForm({ ...form, interval_days: e.target.value === "" ? "" : Number(e.target.value) })} /></div>
                </div>

                <div className="rounded-lg border bg-muted/30 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <Label className="text-sm">Etapas do protocolo</Label>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setSteps([...steps, { title: "", description: "", product_ids: [] }])}>
                      <Plus className="mr-1 h-3.5 w-3.5" />Etapa
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {steps.map((s, i) => (
                      <div key={i} className="rounded-lg border bg-card p-3">
                        <div className="mb-2 flex items-center gap-2">
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs font-medium text-muted-foreground">Etapa {i + 1}</span>
                          {steps.length > 1 && (
                            <Button type="button" size="icon" variant="ghost" className="ml-auto h-7 w-7" onClick={() => setSteps(steps.filter((_, idx) => idx !== i))}><X className="h-4 w-4" /></Button>
                          )}
                        </div>
                        <Input className="mb-2" placeholder="Título da etapa (ex.: Higienização / esfoliação)" value={s.title} onChange={(e) => setStep(i, { title: e.target.value })} />
                        <Textarea className="mb-2" rows={2} placeholder="Como executar, tempo de pausa, cuidados…" value={s.description} onChange={(e) => setStep(i, { description: e.target.value })} />
                        <div className="flex flex-wrap items-center gap-1">
                          {s.product_ids.map((pid) => (
                            <Badge key={pid} variant="secondary" className="font-normal">
                              {productName(pid)}
                              <button className="ml-1" onClick={() => setStep(i, { product_ids: s.product_ids.filter((x) => x !== pid) })}><X className="h-3 w-3" /></button>
                            </Badge>
                          ))}
                          <Select value="" onValueChange={(pid) => { if (pid && !s.product_ids.includes(pid)) setStep(i, { product_ids: [...s.product_ids, pid] }); }}>
                            <SelectTrigger className="h-7 w-40 text-xs"><SelectValue placeholder="+ Produto" /></SelectTrigger>
                            <SelectContent>
                              {(products as any[]).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div><Label>Home care</Label><Textarea rows={2} value={form.home_care} onChange={(e) => setForm({ ...form, home_care: e.target.value })} /></div>
                <div><Label>Contraindicações</Label><Textarea rows={2} value={form.contraindications} onChange={(e) => setForm({ ...form, contraindications: e.target.value })} /></div>
              </div>
              <DialogFooter><Button onClick={create}>Cadastrar</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="p-6">
        {protocols.length === 0 ? (
          <Card className="border-0 card-premium">
            <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary"><ListChecks className="h-6 w-6" /></div>
              <p className="text-sm text-muted-foreground">Nenhum protocolo cadastrado ainda.</p>
              <p className="max-w-md text-xs text-muted-foreground">Cadastre os protocolos da clínica com etapas e produtos. A IA usa este catálogo para sugerir tratamentos a partir dos dados do cliente.</p>
              <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Cadastrar o primeiro</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {protocols.map((p: any) => {
              const inds: string[] = Array.isArray(p.indications) ? p.indications : [];
              const steps: any[] = Array.isArray(p.steps) ? p.steps : [];
              return (
                <Card key={p.id} className="border-0 card-premium">
                  <CardContent className="space-y-3 p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-display text-lg">{p.name}</h3>
                        {p.description && <p className="text-sm text-muted-foreground">{p.description}</p>}
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                    {inds.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {inds.map((t, i) => <Badge key={i} variant="outline" className="font-normal">{t}</Badge>)}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {p.sessions_planned ? `${p.sessions_planned} sessões` : "Sessões a definir"} · intervalo {p.interval_days ?? 7}d · {steps.length} etapa(s)
                    </div>
                    {steps.length > 0 && (
                      <ol className="space-y-1 text-sm">
                        {steps.map((s, i) => (
                          <li key={i} className="rounded-md bg-muted/40 px-3 py-2">
                            <span className="font-medium">{s.order ?? i + 1}. {s.title || "Etapa"}</span>
                            {s.description && <div className="text-xs text-muted-foreground">{s.description}</div>}
                          </li>
                        ))}
                      </ol>
                    )}
                    {p.contraindications && (
                      <p className="text-xs text-destructive/80"><span className="font-medium">Contraindicações:</span> {p.contraindications}</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
