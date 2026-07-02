import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentClinic } from "@/lib/trichocare";
import { ANAMNESIS_STEPS, isStepFilled, type AnamnesisData } from "@/lib/anamnesis-schema";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardList, Plus, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/anamneses/")({
  component: AnamnesesPage,
});

function AnamnesesPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<string>("");
  const [newName, setNewName] = useState("");

  const { data: rows = [] } = useQuery({
    queryKey: ["anamneses-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("anamneses")
        .select("*, patients(full_name)")
        .order("updated_at", { ascending: false });
      return dedupeAnamnesesByPatient(data ?? []);
    },
  });

  const { data: patients = [] } = useQuery({
    queryKey: ["patients-min"],
    queryFn: async () => {
      const { data } = await supabase.from("patients").select("id, full_name").order("full_name");
      return data ?? [];
    },
  });

  async function startForExisting() {
    if (!selectedPatient) return toast.error("Escolha um cliente");
    setOpen(false);
    navigate({ to: "/app/clientes/$id", params: { id: selectedPatient }, hash: "anamnese" });
  }

  async function startForNew() {
    if (!newName.trim()) return toast.error("Informe o nome do cliente");
    const clinic = await getCurrentClinic();
    if (!clinic) return toast.error("Clínica não encontrada");
    const { data, error } = await supabase
      .from("patients")
      .insert({ clinic_id: clinic.id, full_name: newName.trim() })
      .select().single();
    if (error || !data) return toast.error(error?.message ?? "Erro");
    setOpen(false); setNewName("");
    qc.invalidateQueries({ queryKey: ["patients-min"] });
    navigate({ to: "/app/clientes/$id", params: { id: data.id }, hash: "anamnese" });
  }

  return (
    <div>
      <PageHeader
        title="Anamneses"
        subtitle="Fichas em andamento e concluídas de toda a clínica."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Nova anamnese</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-display">Iniciar nova anamnese</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Cliente já cadastrado</Label>
                  <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                    <SelectTrigger><SelectValue placeholder="Selecionar…" /></SelectTrigger>
                    <SelectContent>
                      {patients.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button className="mt-2 w-full" variant="outline" onClick={startForExisting} disabled={!selectedPatient}>Abrir anamnese deste cliente</Button>
                </div>
                <div className="relative"><div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div><div className="relative flex justify-center text-xs"><span className="bg-background px-2 text-muted-foreground">ou cadastre um novo</span></div></div>
                <div>
                  <Label>Nome do novo cliente</Label>
                  <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nome completo" />
                </div>
              </div>
              <DialogFooter><Button onClick={startForNew}>Criar cliente e iniciar</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="p-6">
        {rows.length === 0 ? (
          <Card className="border-0 card-premium">
            <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary"><ClipboardList className="h-6 w-6" /></div>
              <p className="text-sm text-muted-foreground">Nenhuma anamnese registrada ainda.</p>
              <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Iniciar a primeira</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {rows.map((r: any) => {
              const d = (r.data ?? {}) as AnamnesisData;
              const filled = ANAMNESIS_STEPS.filter((s) => isStepFilled(s.id, d)).length;
              const pct = (filled / ANAMNESIS_STEPS.length) * 100;
              return (
                <Card key={r.id} className="border-0 card-premium">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-display text-base">{r.patients?.full_name ?? "Cliente"}</div>
                        <div className="text-xs text-muted-foreground">
                          Atualizada em {new Date(r.updated_at).toLocaleDateString("pt-BR")} · Etapa {r.current_step}/{ANAMNESIS_STEPS.length}
                        </div>
                      </div>
                      {r.completed
                        ? <Badge className="bg-primary/15 text-primary hover:bg-primary/20">Concluída</Badge>
                        : <Badge variant="secondary">Em andamento</Badge>}
                    </div>
                    <Progress value={pct} className="mt-3 h-1.5" />
                    <div className="mt-2 text-[11px] text-muted-foreground">{filled}/{ANAMNESIS_STEPS.length} etapas preenchidas</div>
                    <Button asChild size="sm" variant="outline" className="mt-4 w-full">
                      <Link to="/app/clientes/$id" params={{ id: r.patient_id }} hash="anamnese">
                        {r.completed ? "Abrir ficha" : "Continuar"} <ArrowRight className="ml-2 h-3.5 w-3.5" />
                      </Link>
                    </Button>
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

function dedupeAnamnesesByPatient(rows: any[]) {
  const byPatient = new Map<string, any>();
  for (const row of rows) {
    const current = byPatient.get(row.patient_id);
    if (!current || compareAnamnesis(row, current) < 0) byPatient.set(row.patient_id, row);
  }
  return Array.from(byPatient.values()).sort(compareAnamnesis);
}

function compareAnamnesis(a: any, b: any) {
  const aKeys = Object.keys((a?.data ?? {}) as Record<string, unknown>).length;
  const bKeys = Object.keys((b?.data ?? {}) as Record<string, unknown>).length;
  if (bKeys !== aKeys) return bKeys - aKeys;
  if (!!b?.completed !== !!a?.completed) return Number(!!b.completed) - Number(!!a.completed);
  return new Date(b?.updated_at ?? b?.created_at ?? 0).getTime() - new Date(a?.updated_at ?? a?.created_at ?? 0).getTime();
}
