import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Sparkles, Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { AI_DISCLAIMER } from "@/lib/ai-disclaimer";

const PLAN_STATUS = [
  { v: "rascunho", l: "Rascunho" },
  { v: "em_andamento", l: "Em andamento" },
  { v: "pausado", l: "Pausado" },
  { v: "concluido", l: "Concluído" },
];

export function PlanSection({ patient }: { patient: any }) {
  const [plan, setPlan] = useState<any>(null);
  const [protocols, setProtocols] = useState<any[]>([]);
  const [exams, setExams] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("treatment_plans").select("*").eq("patient_id", patient.id).order("created_at", { ascending: false }).limit(1);
      if (data && data[0]) setPlan(data[0]);
      const { data: prot } = await supabase.from("treatment_protocols").select("*").order("name");
      setProtocols(prot ?? []);
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

  // Preenche o plano a partir de um protocolo cadastrado.
  async function applyProtocol(protocolId: string) {
    const p = protocols.find((x) => x.id === protocolId);
    if (!p) return;
    const steps: any[] = Array.isArray(p.steps) ? p.steps : [];
    const protocolText = [
      p.description,
      ...steps.map((s, i) => `${s.order ?? i + 1}. ${s.title}${s.description ? ` — ${s.description}` : ""}`),
    ].filter(Boolean).join("\n");
    await update({
      protocol_id: p.id,
      protocol: protocolText || plan.protocol,
      sessions_planned: p.sessions_planned || plan.sessions_planned,
      interval_days: p.interval_days || plan.interval_days,
      home_care: p.home_care || plan.home_care,
      contraindications: p.contraindications || plan.contraindications,
    });
    toast.success(`Protocolo "${p.name}" aplicado ao plano`);
  }

  async function suggestWithAI() {
    setLoadingAI(true);
    try {
      const [{ data: anam }, { data: tricho }, { data: products }] = await Promise.all([
        supabase.from("anamneses").select("data").eq("patient_id", patient.id).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("trichoscopy_records").select("scalp_findings,hair_shaft_findings,conclusion,notes").eq("patient_id", patient.id).order("record_date", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("products").select("*").order("name"),
      ]);
      const r = await fetch("/api/protocol-suggestion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientName: patient.full_name,
          anamnesis: (anam as any)?.data ?? null,
          trichoscopy: tricho ?? null,
          exams,
          products: products ?? [],
          protocols,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      const suggestion = { markdown: j.markdown, generated_at: j.generated_at };
      if (plan) await update({ ai_suggestion: suggestion });
      else setPlan({ ...(plan ?? {}), ai_suggestion: suggestion });
      toast.success("Sugestão gerada");
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao gerar sugestão");
    } finally {
      setLoadingAI(false);
    }
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

  const suggestion = plan.ai_suggestion;

  return (
    <div className="space-y-4">
      {/* Sugestão de protocolo por IA */}
      <Card className="border-0 card-premium">
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-primary" />
            <h3 className="font-display text-lg">Sugestão de protocolo (IA assistiva)</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            A IA lê a anamnese, a tricoscopia e os exames informados e sugere, a partir dos protocolos e produtos cadastrados,
            o tratamento mais indicado. A decisão final é sempre sua.
          </p>
          <div>
            <Label>Exames / observações complementares (opcional)</Label>
            <Textarea rows={2} value={exams} onChange={(e) => setExams(e.target.value)} placeholder="Ex.: ferritina 18, TSH normal, tração recente, uso de finasterida…" />
          </div>
          <Button onClick={suggestWithAI} disabled={loadingAI}>
            {loadingAI ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Sugerir protocolo e ativos
          </Button>
          {suggestion?.markdown && (
            <div className="rounded-lg border bg-muted/40 p-3">
              <div className="prose prose-sm max-w-none text-sm"><ReactMarkdown>{suggestion.markdown}</ReactMarkdown></div>
              <p className="mt-2 text-[11px] text-muted-foreground">{AI_DISCLAIMER}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-0 card-premium">
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display text-lg">Plano de tratamento</h3>
            <Select value={plan.status} onValueChange={(v) => update({ status: v })}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>{PLAN_STATUS.map((s) => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          {protocols.length > 0 && (
            <div className="rounded-lg border bg-muted/30 p-3">
              <Label>Aplicar protocolo cadastrado</Label>
              <div className="mt-1 flex items-center gap-2">
                <Select value={plan.protocol_id ?? ""} onValueChange={applyProtocol}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Escolher protocolo do catálogo…" /></SelectTrigger>
                  <SelectContent>{protocols.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Preenche protocolo, sessões, intervalo, home care e contraindicações a partir do modelo.</p>
            </div>
          )}

          <div><Label>Objetivo principal</Label><Input defaultValue={plan.objective ?? ""} onBlur={(e) => update({ objective: e.target.value })} /></div>
          <div><Label>Hipótese profissional</Label><Textarea rows={2} defaultValue={plan.hypothesis ?? ""} onBlur={(e) => update({ hypothesis: e.target.value })} /></div>
          <div><Label>Protocolo</Label><Textarea rows={4} key={plan.protocol} defaultValue={plan.protocol ?? ""} onBlur={(e) => update({ protocol: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Sessões planejadas</Label><Input type="number" key={`s-${plan.sessions_planned}`} defaultValue={plan.sessions_planned ?? 0} onBlur={(e) => update({ sessions_planned: Number(e.target.value) })} /></div>
            <div><Label>Intervalo (dias)</Label><Input type="number" key={`i-${plan.interval_days}`} defaultValue={plan.interval_days ?? 7} onBlur={(e) => update({ interval_days: Number(e.target.value) })} /></div>
          </div>
          <div><Label>Procedimentos (vírgula)</Label><Input defaultValue={plan.procedures?.join(", ") ?? ""} onBlur={(e) => update({ procedures: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} /></div>
          <div><Label>Produtos (vírgula)</Label><Input defaultValue={plan.products?.join(", ") ?? ""} onBlur={(e) => update({ products: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} /></div>
          <div><Label>Orientações pré-sessão</Label><Textarea rows={2} defaultValue={plan.pre_session_instructions ?? ""} onBlur={(e) => update({ pre_session_instructions: e.target.value })} /></div>
          <div><Label>Orientações pós-sessão</Label><Textarea rows={2} defaultValue={plan.post_session_instructions ?? ""} onBlur={(e) => update({ post_session_instructions: e.target.value })} /></div>
          <div><Label>Home care</Label><Textarea rows={2} key={`h-${plan.home_care}`} defaultValue={plan.home_care ?? ""} onBlur={(e) => update({ home_care: e.target.value })} /></div>
          <div><Label>Contraindicações</Label><Textarea rows={2} key={`c-${plan.contraindications}`} defaultValue={plan.contraindications ?? ""} onBlur={(e) => update({ contraindications: e.target.value })} /></div>
          <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2">
            <div>
              <Label>Liberar plano no portal do cliente</Label>
              <p className="text-xs text-muted-foreground">O cliente verá objetivo, sessões e orientações.</p>
            </div>
            <Switch checked={!!plan.visible_to_client} onCheckedChange={(v) => update({ visible_to_client: v })} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
