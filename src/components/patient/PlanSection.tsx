import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const PLAN_STATUS = [
  { v: "rascunho", l: "Rascunho" },
  { v: "em_andamento", l: "Em andamento" },
  { v: "pausado", l: "Pausado" },
  { v: "concluido", l: "Concluído" },
];

export function PlanSection({ patient }: { patient: any }) {
  const [plan, setPlan] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("treatment_plans").select("*").eq("patient_id", patient.id).order("created_at", { ascending: false }).limit(1);
      if (data && data[0]) setPlan(data[0]);
    })();
  }, [patient.id]);

  async function createPlan() {
    const { data } = await supabase.from("treatment_plans").insert({
      patient_id: patient.id, clinic_id: patient.clinic_id, status: "rascunho",
    }).select().single();
    setPlan(data);
  }

  async function update(patch: any) {
    if (!plan) return;
    const { data } = await supabase.from("treatment_plans").update(patch as any).eq("id", plan.id).select().single();
    if (data) setPlan(data);
  }

  if (!plan) {
    return (
      <Card className="border-0 card-premium">
        <CardContent className="space-y-3 p-10 text-center">
          <p className="text-sm text-muted-foreground">Nenhum plano de tratamento criado.</p>
          <Button onClick={createPlan}>Criar plano de tratamento</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 card-premium">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display text-lg">Plano de tratamento</h3>
          <Select value={plan.status} onValueChange={(v) => update({ status: v })}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>{PLAN_STATUS.map((s) => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Objetivo principal</Label><Input defaultValue={plan.objective ?? ""} onBlur={(e) => update({ objective: e.target.value })} /></div>
        <div><Label>Hipótese profissional</Label><Textarea rows={2} defaultValue={plan.hypothesis ?? ""} onBlur={(e) => update({ hypothesis: e.target.value })} /></div>
        <div><Label>Protocolo sugerido</Label><Textarea rows={3} defaultValue={plan.protocol ?? ""} onBlur={(e) => update({ protocol: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Sessões planejadas</Label><Input type="number" defaultValue={plan.sessions_planned ?? 0} onBlur={(e) => update({ sessions_planned: Number(e.target.value) })} /></div>
          <div><Label>Intervalo (dias)</Label><Input type="number" defaultValue={plan.interval_days ?? 7} onBlur={(e) => update({ interval_days: Number(e.target.value) })} /></div>
        </div>
        <div><Label>Procedimentos (vírgula)</Label><Input defaultValue={plan.procedures?.join(", ") ?? ""} onBlur={(e) => update({ procedures: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} /></div>
        <div><Label>Produtos (vírgula)</Label><Input defaultValue={plan.products?.join(", ") ?? ""} onBlur={(e) => update({ products: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} /></div>
        <div><Label>Orientações pré-sessão</Label><Textarea rows={2} defaultValue={plan.pre_session_instructions ?? ""} onBlur={(e) => update({ pre_session_instructions: e.target.value })} /></div>
        <div><Label>Orientações pós-sessão</Label><Textarea rows={2} defaultValue={plan.post_session_instructions ?? ""} onBlur={(e) => update({ post_session_instructions: e.target.value })} /></div>
        <div><Label>Home care</Label><Textarea rows={2} defaultValue={plan.home_care ?? ""} onBlur={(e) => update({ home_care: e.target.value })} /></div>
        <div><Label>Contraindicações</Label><Textarea rows={2} defaultValue={plan.contraindications ?? ""} onBlur={(e) => update({ contraindications: e.target.value })} /></div>
        <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2">
          <div>
            <Label>Liberar plano no portal do cliente</Label>
            <p className="text-xs text-muted-foreground">O cliente verá objetivo, sessões e orientações.</p>
          </div>
          <Switch checked={!!plan.visible_to_client} onCheckedChange={(v) => update({ visible_to_client: v })} />
        </div>
      </CardContent>
    </Card>
  );
}
