import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  ANAMNESIS_STEPS, QUEIXAS_OPTIONS, COURO_SINTOMAS, FIOS_SINTOMAS, DOENCAS_OPTIONS,
  isStepFilled, type AnamnesisData,
} from "@/lib/anamnesis-schema";
import { Sparkles, Loader2, Printer, CheckCircle2, Circle } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { AI_DISCLAIMER } from "@/lib/ai-disclaimer";
import { getCurrentClinic, type Clinic } from "@/lib/trichocare";
import { AnamnesisPrintView } from "./AnamnesisPrintView";
import { AnamnesisAttachments } from "./AnamnesisAttachments";

export function AnamnesisWizard({ patient }: { patient: any }) {
  const [record, setRecord] = useState<any>(null);
  const [step, setStep] = useState(1);
  const [data, setData] = useState<AnamnesisData>({});
  const [analyzing, setAnalyzing] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { getCurrentClinic().then(setClinic); }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: rows, error } = await supabase
        .from("anamneses")
        .select("*")
        .eq("patient_id", patient.id)
        .order("updated_at", { ascending: false })
        .limit(20);

      if (cancelled) return;
      if (error) {
        toast.error(`Não consegui carregar a anamnese: ${error.message}`);
        return;
      }

      const existing = pickMostCompleteAnamnesis(rows ?? []);
      if (existing) {
        setRecord(existing); setData((existing.data as AnamnesisData) ?? {}); setStep(existing.current_step ?? 1);
      } else {
        const { data: created, error: createError } = await supabase
          .from("anamneses").insert({ patient_id: patient.id, clinic_id: patient.clinic_id, data: {} }).select().single();
        if (cancelled) return;
        if (createError) {
          toast.error(`Não consegui criar a anamnese: ${createError.message}`);
          return;
        }
        setRecord(created);
      }
    })();

    return () => { cancelled = true; };
  }, [patient.id, patient.clinic_id]);

  const save = useCallback((next: AnamnesisData, nextStep?: number) => {
    if (!record) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const { error } = await supabase.from("anamneses").update({ data: next, current_step: nextStep ?? step } as any).eq("id", record.id);
      if (error) toast.error(`Não consegui salvar a anamnese: ${error.message}`);
    }, 400);
  }, [record, step]);

  function update(patch: Partial<AnamnesisData>) {
    const next = { ...data, ...patch };
    setData(next);
    save(next);
  }

  function toggle(field: keyof AnamnesisData, value: string) {
    const arr = (data[field] as string[] | undefined) ?? [];
    const next = arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value];
    update({ [field]: next } as Partial<AnamnesisData>);
  }

  async function runAI() {
    if (!record) return;
    setAnalyzing(true);
    try {
      const res = await fetch("/api/anamnesis-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientName: patient.full_name, data }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erro");
      await supabase.from("anamneses").update({ data, current_step: step, ai_analysis: json } as any).eq("id", record.id);
      setRecord({ ...record, ai_analysis: json });
      toast.success("Análise gerada com IA");
    } catch (e: any) {
      toast.error(e.message);
    } finally { setAnalyzing(false); }
  }

  async function completeAndReport() {
    if (!record) return;
    setAnalyzing(true);
    try {
      // 1) Marca como concluída
      await supabase.from("anamneses").update({ data, completed: true, current_step: step } as any).eq("id", record.id);

      // 2) Dispara IA para gerar o relatório final
      const res = await fetch("/api/anamnesis-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientName: patient.full_name, data }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Falha ao gerar relatório");

      await supabase.from("anamneses").update({ ai_analysis: json } as any).eq("id", record.id);

      // 3) Salva no histórico de relatórios
      const { data: u } = await supabase.auth.getUser();
      await supabase.from("ai_reports").insert({
        clinic_id: patient.clinic_id,
        patient_id: patient.id,
        created_by: u.user?.id ?? null,
        report_type: "profissional",
        title: `Relatório final da anamnese — ${new Date().toLocaleDateString("pt-BR")}`,
        content: { markdown: json.markdown, source: "anamnesis" },
      });

      setRecord({ ...record, completed: true, ai_analysis: json });
      toast.success("Anamnese concluída e relatório final gerado");
    } catch (e: any) {
      toast.error(e.message);
    } finally { setAnalyzing(false); }
  }

  function goTo(n: number) {
    setStep(n);
    save(data, n);
  }

  if (!record) return <div className="p-10 text-sm text-muted-foreground">Carregando anamnese…</div>;

  const meta = ANAMNESIS_STEPS.find((s) => s.id === step)!;
  const filledCount = ANAMNESIS_STEPS.filter((s) => isStepFilled(s.id, data)).length;
  const progress = (filledCount / ANAMNESIS_STEPS.length) * 100;

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_1fr_340px]">
      {/* Sidebar de etapas */}
      <Card className="border-0 card-premium h-fit">
        <CardContent className="p-3">
          <div className="mb-3 px-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Progresso</div>
            <div className="font-display text-lg">{filledCount}/{ANAMNESIS_STEPS.length}</div>
            <Progress value={progress} className="mt-2 h-1.5" />
          </div>
          <ul className="space-y-0.5">
            {ANAMNESIS_STEPS.map((s) => {
              const active = s.id === step;
              const filled = isStepFilled(s.id, data);
              return (
                <li key={s.id}>
                  <button
                    onClick={() => goTo(s.id)}
                    className={`flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-xs transition-colors ${
                      active ? "bg-primary/10 text-foreground" : "hover:bg-muted/60 text-muted-foreground"
                    }`}
                  >
                    {filled ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /> : <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
                    <div>
                      <div className={`font-medium ${active ? "text-foreground" : ""}`}>{s.id}. {s.title}</div>
                      <div className="text-[10px] opacity-70">{s.description}</div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 border-t pt-3">
            <Button variant="outline" size="sm" className="w-full" onClick={() => setPrinting(true)}>
              <Printer className="mr-2 h-3.5 w-3.5" /> Imprimir ficha
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Conteúdo da etapa */}
      <Card className="border-0 card-premium">
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Etapa {step} de {ANAMNESIS_STEPS.length}</div>
              <h3 className="font-display text-xl">{meta.title}</h3>
              <p className="text-sm text-muted-foreground">{meta.description}</p>
            </div>
            {record.completed && (
              <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">Concluída</span>
            )}
          </div>

          <div className="mt-2 space-y-5">
            {step === 1 && (
              <>
                <div>
                  <Label>Queixa principal (marque tudo o que se aplica)</Label>
                  <ChipGrid options={QUEIXAS_OPTIONS} selected={data.queixa_principal ?? []} onToggle={(v) => toggle("queixa_principal", v)} />
                </div>
                <div>
                  <Label>Descreva com detalhes</Label>
                  <Textarea rows={4} value={data.queixa_descricao ?? ""} onChange={(e) => update({ queixa_descricao: e.target.value })} />
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <SwitchRow label="Percebeu queda" v={!!data.percebeu_queda} on={(v) => update({ percebeu_queda: v })} />
                  <div><Label>Há quanto tempo?</Label><Input value={data.queda_tempo ?? ""} onChange={(e) => update({ queda_tempo: e.target.value })} /></div>
                </div>
                <SwitchRow label="Houve períodos em que a queda parou e voltou (intermitente)" v={!!data.queda_intermitente} on={(v) => update({ queda_intermitente: v })} />
                <div className="grid grid-cols-2 gap-3">
                  <SwitchRow label="Perda de pelos em outras partes do corpo" v={!!data.perda_outras_partes} on={(v) => update({ perda_outras_partes: v })} />
                  {data.perda_outras_partes && (
                    <div><Label>Onde?</Label><Input value={data.perda_outras_partes_onde ?? ""} onChange={(e) => update({ perda_outras_partes_onde: e.target.value })} /></div>
                  )}
                </div>
                <SwitchRow label="Acontecimento marcante há ~3 meses" v={!!data.eventos_marcantes_3m} on={(v) => update({ eventos_marcantes_3m: v })} />
                <div>
                  <Label>Descreva o evento (cirurgia, COVID, estresse intenso, parto, emagrecimento, etc.)</Label>
                  <Textarea rows={3} value={data.eventos_descricao ?? ""} onChange={(e) => update({ eventos_descricao: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <SwitchRow label="Queda aumentada no banho" v={!!data.queda_no_banho} on={(v) => update({ queda_no_banho: v })} />
                  <SwitchRow label="Queda ao pentear" v={!!data.queda_ao_pentear} on={(v) => update({ queda_ao_pentear: v })} />
                  <SwitchRow label="Queda com bulbo (raiz)" v={!!data.queda_com_bulbo} on={(v) => update({ queda_com_bulbo: v })} />
                  <SwitchRow label="Queda por quebra" v={!!data.queda_por_quebra} on={(v) => update({ queda_por_quebra: v })} />
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <Label>Sintomas no couro cabeludo</Label>
                <ChipGrid options={COURO_SINTOMAS} selected={data.couro_sintomas ?? []} onToggle={(v) => toggle("couro_sintomas", v)} />
                <div><Label>Observações</Label><Textarea rows={3} value={data.couro_observacoes ?? ""} onChange={(e) => update({ couro_observacoes: e.target.value })} /></div>
              </>
            )}

            {step === 4 && (
              <>
                <Label>Características dos fios</Label>
                <ChipGrid options={FIOS_SINTOMAS} selected={data.fios_sintomas ?? []} onToggle={(v) => toggle("fios_sintomas", v)} />
              </>
            )}

            {step === 5 && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Tipo de cabelo</Label><Input placeholder="seco · oleoso · normal · misto" value={data.tipo_cabelo ?? ""} onChange={(e) => update({ tipo_cabelo: e.target.value })} /></div>
                  <div><Label>Frequência de lavagem</Label><Input placeholder="ex.: 3x/semana" value={data.freq_lavagem ?? ""} onChange={(e) => update({ freq_lavagem: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <SwitchRow label="Usa secador" v={!!data.usa_secador} on={(v) => update({ usa_secador: v })} />
                  <SwitchRow label="Usa chapinha" v={!!data.usa_chapinha} on={(v) => update({ usa_chapinha: v })} />
                </div>
                {(data.usa_secador || data.usa_chapinha) && (
                  <div><Label>Frequência de uso de calor</Label><Input placeholder="ex.: diariamente" value={data.freq_calor ?? ""} onChange={(e) => update({ freq_calor: e.target.value })} /></div>
                )}
                <SwitchRow label="Usa química (alisamento, coloração, descoloração…)" v={!!data.usa_quimica} on={(v) => update({ usa_quimica: v })} />
                {data.usa_quimica && (
                  <div><Label>Qual química e frequência?</Label><Input value={data.qual_quimica ?? ""} onChange={(e) => update({ qual_quimica: e.target.value })} /></div>
                )}
                <SwitchRow label="Usa penteados que causam tração" v={!!data.penteados_tracao} on={(v) => update({ penteados_tracao: v })} />
                {data.penteados_tracao && (
                  <div><Label>Quais penteados?</Label><Input value={data.penteados_tracao_desc ?? ""} onChange={(e) => update({ penteados_tracao_desc: e.target.value })} /></div>
                )}
                <SwitchRow label="Fez transplante capilar" v={!!data.fez_transplante} on={(v) => update({ fez_transplante: v })} />
                {data.fez_transplante && (
                  <div><Label>Detalhes (quando, técnica, profissional)</Label><Input value={data.transplante_desc ?? ""} onChange={(e) => update({ transplante_desc: e.target.value })} /></div>
                )}
                <div><Label>Produtos / cosméticos atualmente em uso</Label><Textarea rows={3} value={data.produtos_usados ?? ""} onChange={(e) => update({ produtos_usados: e.target.value })} /></div>
              </>
            )}

            {step === 6 && (
              <>
                <Label>Doenças relevantes</Label>
                <ChipGrid options={DOENCAS_OPTIONS} selected={data.doencas ?? []} onToggle={(v) => toggle("doencas", v)} />
                <SwitchRow label="Portador(a) de marcapasso" v={!!data.marcapasso} on={(v) => update({ marcapasso: v })} />
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Medicamentos atuais</Label><Textarea rows={2} value={data.medicamentos_atuais ?? ""} onChange={(e) => update({ medicamentos_atuais: e.target.value })} /></div>
                  <div><Label>Suplementos</Label><Textarea rows={2} value={data.suplementos ?? ""} onChange={(e) => update({ suplementos: e.target.value })} /></div>
                </div>
                <SwitchRow label="Algum é de uso contínuo" v={!!data.medicamento_continuo} on={(v) => update({ medicamento_continuo: v })} />
                {data.medicamento_continuo && (
                  <div><Label>Quais e há quanto tempo?</Label><Input value={data.medicamento_continuo_desc ?? ""} onChange={(e) => update({ medicamento_continuo_desc: e.target.value })} /></div>
                )}
                <div><Label>Alergias</Label><Input value={data.alergias ?? ""} onChange={(e) => update({ alergias: e.target.value })} /></div>
                <SwitchRow label="Histórico familiar de calvície (pais ou avós)" v={!!data.historico_familiar} on={(v) => update({ historico_familiar: v })} />
              </>
            )}

            {step === 7 && (
              <>
                <div><Label>Hábitos alimentares</Label><Textarea rows={3} value={data.alimentacao ?? ""} onChange={(e) => update({ alimentacao: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <SwitchRow label="Intestino regular" v={!!data.intestino_regular} on={(v) => update({ intestino_regular: v })} />
                  <SwitchRow label="Desregulação hormonal" v={!!data.desregulacao_hormonal} on={(v) => update({ desregulacao_hormonal: v })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <SwitchRow label="Anticoncepcional / DIU" v={!!data.anticoncepcional_diu} on={(v) => update({ anticoncepcional_diu: v })} />
                  {data.anticoncepcional_diu && (
                    <div><Label>Qual e há quanto tempo?</Label><Input value={data.anticoncepcional_desc ?? ""} onChange={(e) => update({ anticoncepcional_desc: e.target.value })} /></div>
                  )}
                </div>
                <SwitchRow label="Gestante ou lactante" v={!!data.gestante_lactante} on={(v) => update({ gestante_lactante: v })} />
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Horas de sono/noite</Label><Input type="number" value={data.horas_sono ?? ""} onChange={(e) => update({ horas_sono: Number(e.target.value) })} /></div>
                  <div><Label>Qualidade do sono</Label><Input placeholder="boa · regular · ruim" value={data.qualidade_sono ?? ""} onChange={(e) => update({ qualidade_sono: e.target.value })} /></div>
                  <div><Label>Atividade física</Label><Input value={data.atividade_fisica ?? ""} onChange={(e) => update({ atividade_fisica: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <SwitchRow label="Fuma" v={!!data.fuma} on={(v) => update({ fuma: v })} />
                  <SwitchRow label="Consome álcool" v={!!data.alcool} on={(v) => update({ alcool: v })} />
                </div>
                <SwitchRow label="Tratamento psicológico / psiquiátrico" v={!!data.tratamento_psicologico} on={(v) => update({ tratamento_psicologico: v })} />
                <div className="grid grid-cols-2 gap-3">
                  <SwitchRow label="Se considera ansiosa/estressada" v={!!data.ansiosa_estressada} on={(v) => update({ ansiosa_estressada: v })} />
                  <SwitchRow label="Se considera depressiva" v={!!data.depressiva} on={(v) => update({ depressiva: v })} />
                </div>
                <div>
                  <Label>Nível de estresse atual: {data.estresse_nivel ?? 0}/10</Label>
                  <Slider value={[data.estresse_nivel ?? 0]} max={10} step={1} onValueChange={(v) => update({ estresse_nivel: v[0] })} />
                </div>
              </>
            )}

            {step === 8 && (
              <>
                <div><Label>Tratamentos capilares anteriores</Label><Textarea rows={3} value={data.tratamentos_anteriores ?? ""} onChange={(e) => update({ tratamentos_anteriores: e.target.value })} /></div>
                <div><Label>Diagnóstico prévio (e quem realizou)</Label><Textarea rows={2} value={data.diagnostico_anterior ?? ""} onChange={(e) => update({ diagnostico_anterior: e.target.value })} /></div>
                <div><Label>Efeitos adversos relatados</Label><Textarea rows={2} value={data.efeitos_adversos ?? ""} onChange={(e) => update({ efeitos_adversos: e.target.value })} /></div>
                <div><Label>Observações finais do profissional</Label><Textarea rows={3} value={data.observacoes_finais ?? ""} onChange={(e) => update({ observacoes_finais: e.target.value })} /></div>

                <div className="rounded-lg border bg-card p-4">
                  <AnamnesisAttachments
                    clinicId={patient.clinic_id}
                    patientId={patient.id}
                    attachments={data.attachments ?? []}
                    onChange={(next) => update({ attachments: next })}
                  />
                </div>

                <div className="rounded-lg border bg-muted/40 p-4">
                  <h4 className="text-sm font-medium">Resumo rápido</h4>
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                    <li>• Queixas: {(data.queixa_principal ?? []).join(", ") || "—"}</li>
                    <li>• Tempo de queda: {data.queda_tempo || "—"}</li>
                    <li>• Sintomas couro: {(data.couro_sintomas ?? []).slice(0, 4).join(", ") || "—"}</li>
                    <li>• Doenças: {(data.doencas ?? []).join(", ") || "—"}</li>
                    <li>• Gestante/lactante: {data.gestante_lactante ? "Sim" : "Não"} · Marcapasso: {data.marcapasso ? "Sim" : "Não"}</li>
                    <li>• Anexos: {(data.attachments ?? []).length} arquivo(s)</li>
                  </ul>
                </div>
              </>
            )}
          </div>

          <div className="mt-6 flex items-center justify-between">
            <Button variant="outline" disabled={step === 1} onClick={() => goTo(step - 1)}>Anterior</Button>
            <div className="flex gap-2">
              {step < ANAMNESIS_STEPS.length ? (
                <Button onClick={() => goTo(step + 1)}>Próxima etapa</Button>
              ) : (
                <Button onClick={completeAndReport} disabled={analyzing}>
                  {analyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  Concluir e gerar relatório final
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Painel IA + visibilidade */}
      <div className="space-y-4">
        <Card className="border-0 card-premium">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-base">Análise assistiva com IA</h3>
                <p className="text-xs text-muted-foreground">Resumo, hipóteses e contraindicações.</p>
              </div>
              <Button size="sm" onClick={runAI} disabled={analyzing}>
                {analyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Gerar
              </Button>
            </div>
            {record.ai_analysis && (
              <div className="prose prose-sm mt-4 max-w-none text-sm">
                <ReactMarkdown>{record.ai_analysis.markdown ?? ""}</ReactMarkdown>
                <p className="mt-3 text-[11px] text-muted-foreground">{AI_DISCLAIMER}</p>
              </div>
            )}
            {!record.ai_analysis && (
              <p className="mt-4 text-xs text-muted-foreground">Preencha as etapas e gere a análise inicial.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 card-premium">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-base">Liberar para o cliente</h3>
                <p className="text-xs text-muted-foreground">A análise aparecerá no portal do cliente.</p>
              </div>
              <Switch checked={!!record.visible_to_client} onCheckedChange={async (v) => {
                await supabase.from("anamneses").update({ visible_to_client: v } as any).eq("id", record.id);
                setRecord({ ...record, visible_to_client: v });
              }} />
            </div>
          </CardContent>
        </Card>
      </div>

      {printing && (
        <AnamnesisPrintView
          patient={patient}
          clinic={clinic}
          data={data}
          onClose={() => setPrinting(false)}
        />
      )}
    </div>
  );
}

function SwitchRow({ label, v, on }: { label: string; v: boolean; on: (b: boolean) => void }) {
  return (
    <label className="flex items-center justify-between rounded-lg border bg-card px-3 py-2 text-sm">
      <span>{label}</span>
      <Switch checked={v} onCheckedChange={on} />
    </label>
  );
}

function ChipGrid({ options, selected, onToggle }: { options: string[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <button key={opt} type="button" onClick={() => onToggle(opt)}
            className={`rounded-full border px-3 py-1 text-xs ${active ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted/60"}`}>
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function pickMostCompleteAnamnesis(rows: any[]) {
  return [...rows].sort((a, b) => {
    const aKeys = Object.keys((a?.data ?? {}) as Record<string, unknown>).length;
    const bKeys = Object.keys((b?.data ?? {}) as Record<string, unknown>).length;
    if (bKeys !== aKeys) return bKeys - aKeys;
    if (!!b?.completed !== !!a?.completed) return Number(!!b.completed) - Number(!!a.completed);
    return new Date(b?.updated_at ?? b?.created_at ?? 0).getTime() - new Date(a?.updated_at ?? a?.created_at ?? 0).getTime();
  })[0] ?? null;
}
