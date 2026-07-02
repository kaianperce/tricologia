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
  ANAMNESIS_STEPS, QUEIXA_DOMINIOS, QUEDA_EVOLUCAO, QUEDA_DISTRIBUICAO, PULL_TEST,
  COURO_SINTOMAS, DESCAMACAO_TIPO, FIOS_SINTOMAS, CURVATURA, ESPESSURA, DENSIDADE,
  DOENCAS_OPTIONS, FAMILIAR_LADO, LAB_PRESETS, scaleForSex,
  isStepFilled, type AnamnesisData, type Lab,
} from "@/lib/anamnesis-schema";
import { Sparkles, Loader2, Printer, CheckCircle2, Circle, Plus, X, FlaskConical } from "lucide-react";
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
        body: JSON.stringify({ patientName: patient.full_name, patientSex: patient.sex, birthDate: patient.birth_date, data }),
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
      await supabase.from("anamneses").update({ data, completed: true, current_step: step } as any).eq("id", record.id);

      const res = await fetch("/api/anamnesis-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientName: patient.full_name, patientSex: patient.sex, birthDate: patient.birth_date, data }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Falha ao gerar relatório");

      await supabase.from("anamneses").update({ ai_analysis: json } as any).eq("id", record.id);

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
  const scale = scaleForSex(patient.sex);

  // Labs helpers
  const labs: Lab[] = Array.isArray(data.labs) ? data.labs : [];
  const setLabs = (next: Lab[]) => update({ labs: next });
  const addLab = (nome: string) => setLabs([...labs, { nome, valor: "", unidade: "", data: "" }]);
  const setLab = (i: number, patch: Partial<Lab>) => setLabs(labs.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

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
            {/* ETAPA 1 — Queixa & queda */}
            {step === 1 && (
              <>
                <div>
                  <Label>O que traz o cliente (marque os domínios)</Label>
                  <ChipGrid options={QUEIXA_DOMINIOS} selected={data.queixa_principal ?? []} onToggle={(v) => toggle("queixa_principal", v)} />
                  <p className="mt-1 text-[11px] text-muted-foreground">Os sintomas específicos são detalhados nas próximas etapas — aqui é só o motivo geral.</p>
                </div>
                <div>
                  <Label>Descreva a queixa com detalhes</Label>
                  <Textarea rows={3} value={data.queixa_descricao ?? ""} onChange={(e) => update({ queixa_descricao: e.target.value })} />
                </div>

                <div className="rounded-lg border bg-muted/30 p-3 space-y-4">
                  <div className="text-sm font-medium">Caracterização da queda</div>
                  <div className="grid grid-cols-2 gap-3">
                    <SwitchRow label="Percebe queda" v={!!data.percebeu_queda} on={(v) => update({ percebeu_queda: v })} />
                    <div><Label>Há quanto tempo?</Label><Input value={data.queda_tempo ?? ""} onChange={(e) => update({ queda_tempo: e.target.value })} placeholder="ex.: 6 meses" /></div>
                  </div>
                  {data.percebeu_queda && (
                    <>
                      <div>
                        <Label>Evolução</Label>
                        <RadioChips options={QUEDA_EVOLUCAO} value={data.queda_evolucao} onSelect={(v) => update({ queda_evolucao: v })} />
                      </div>
                      <div>
                        <Label>Distribuição (onde cai mais)</Label>
                        <ChipGrid options={QUEDA_DISTRIBUICAO} selected={data.queda_distribuicao ?? []} onToggle={(v) => toggle("queda_distribuicao", v)} />
                      </div>
                      <div>
                        <Label>{scale.label}</Label>
                        <RadioChips options={scale.options} value={data.escala_padrao} onSelect={(v) => update({ escala_padrao: v })} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <SwitchRow label="Queda com bulbo (raiz)" v={!!data.queda_com_bulbo} on={(v) => update({ queda_com_bulbo: v })} />
                        <SwitchRow label="Queda por quebra" v={!!data.queda_por_quebra} on={(v) => update({ queda_por_quebra: v })} />
                      </div>
                      <SwitchRow label="Perda de pelos em outras partes do corpo" v={!!data.perda_outras_partes} on={(v) => update({ perda_outras_partes: v })} />
                      {data.perda_outras_partes && (
                        <div><Label>Onde?</Label><Input value={data.perda_outras_partes_onde ?? ""} onChange={(e) => update({ perda_outras_partes_onde: e.target.value })} /></div>
                      )}
                    </>
                  )}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label>Teste de tração (pull test)</Label>
                      <RadioChips options={PULL_TEST} value={data.pull_test} onSelect={(v) => update({ pull_test: v })} />
                    </div>
                    {data.pull_test && data.pull_test !== "Não realizado" && (
                      <div><Label>Nº de fios destacados</Label><Input type="number" value={data.pull_test_fios ?? ""} onChange={(e) => update({ pull_test_fios: e.target.value === "" ? undefined : Number(e.target.value) })} /></div>
                    )}
                  </div>
                  <SwitchRow label="Acontecimento marcante nos últimos ~3 meses (cirurgia, COVID, parto, estresse intenso, emagrecimento)" v={!!data.eventos_marcantes_3m} on={(v) => update({ eventos_marcantes_3m: v })} />
                  {data.eventos_marcantes_3m && (
                    <div><Label>Descreva o evento</Label><Textarea rows={2} value={data.eventos_descricao ?? ""} onChange={(e) => update({ eventos_descricao: e.target.value })} /></div>
                  )}
                </div>
              </>
            )}

            {/* ETAPA 2 — Couro cabeludo */}
            {step === 2 && (
              <>
                <Label>Sintomas no couro cabeludo</Label>
                <ChipGrid options={COURO_SINTOMAS} selected={data.couro_sintomas ?? []} onToggle={(v) => toggle("couro_sintomas", v)} />
                <div>
                  <Label>Oleosidade do couro: {data.couro_oleosidade ?? 0}/10</Label>
                  <Slider value={[data.couro_oleosidade ?? 0]} max={10} step={1} onValueChange={(v) => update({ couro_oleosidade: v[0] })} />
                  <div className="flex justify-between text-[10px] text-muted-foreground"><span>Seco</span><span>Muito oleoso</span></div>
                </div>
                <div>
                  <Label>Descamação / caspa</Label>
                  <RadioChips options={DESCAMACAO_TIPO} value={data.descamacao_tipo} onSelect={(v) => update({ descamacao_tipo: v })} />
                </div>
                <div><Label>Observações do couro</Label><Textarea rows={3} value={data.couro_observacoes ?? ""} onChange={(e) => update({ couro_observacoes: e.target.value })} /></div>
              </>
            )}

            {/* ETAPA 3 — Fios e haste */}
            {step === 3 && (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div><Label>Curvatura</Label><RadioChips options={CURVATURA} value={data.curvatura} onSelect={(v) => update({ curvatura: v })} /></div>
                  <div><Label>Espessura do fio</Label><RadioChips options={ESPESSURA} value={data.espessura} onSelect={(v) => update({ espessura: v })} /></div>
                  <div><Label>Densidade percebida</Label><RadioChips options={DENSIDADE} value={data.densidade_percebida} onSelect={(v) => update({ densidade_percebida: v })} /></div>
                </div>
                <div>
                  <Label>Qualidade da fibra</Label>
                  <ChipGrid options={FIOS_SINTOMAS} selected={data.fios_sintomas ?? []} onToggle={(v) => toggle("fios_sintomas", v)} />
                </div>
              </>
            )}

            {/* ETAPA 4 — Rotina e agressões */}
            {step === 4 && (
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

            {/* ETAPA 5 — Histórico de saúde */}
            {step === 5 && (
              <>
                <Label>Doenças relevantes</Label>
                <ChipGrid options={DOENCAS_OPTIONS} selected={data.doencas ?? []} onToggle={(v) => toggle("doencas", v)} />
                <SwitchRow label="Portador(a) de marcapasso" v={!!data.marcapasso} on={(v) => update({ marcapasso: v })} />
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Medicamentos atuais</Label><Textarea rows={2} value={data.medicamentos_atuais ?? ""} onChange={(e) => update({ medicamentos_atuais: e.target.value })} /></div>
                  <div><Label>Suplementos</Label><Textarea rows={2} value={data.suplementos ?? ""} onChange={(e) => update({ suplementos: e.target.value })} /></div>
                </div>
                <SwitchRow label="Algum medicamento de uso contínuo" v={!!data.medicamento_continuo} on={(v) => update({ medicamento_continuo: v })} />
                {data.medicamento_continuo && (
                  <div><Label>Quais e há quanto tempo?</Label><Input value={data.medicamento_continuo_desc ?? ""} onChange={(e) => update({ medicamento_continuo_desc: e.target.value })} /></div>
                )}
                <div><Label>Alergias</Label><Input value={data.alergias ?? ""} onChange={(e) => update({ alergias: e.target.value })} /></div>
                <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
                  <SwitchRow label="Histórico familiar de calvície" v={!!data.historico_familiar} on={(v) => update({ historico_familiar: v })} />
                  {data.historico_familiar && (
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Lado da família</Label><RadioChips options={FAMILIAR_LADO} value={data.historico_familiar_lado} onSelect={(v) => update({ historico_familiar_lado: v })} /></div>
                      <div><Label>Idade de início na família</Label><Input value={data.historico_familiar_idade ?? ""} onChange={(e) => update({ historico_familiar_idade: e.target.value })} placeholder="ex.: pai aos 30" /></div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ETAPA 6 — Estilo de vida e hormonal */}
            {step === 6 && (
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
                <div className="grid grid-cols-2 gap-3">
                  <SwitchRow label="Gestante ou lactante" v={!!data.gestante_lactante} on={(v) => update({ gestante_lactante: v })} />
                  <SwitchRow label="Menopausa / climatério" v={!!data.menopausa} on={(v) => update({ menopausa: v })} />
                </div>
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

            {/* ETAPA 7 — Exames laboratoriais */}
            {step === 7 && (
              <>
                <div className="flex items-center gap-2">
                  <FlaskConical className="h-4 w-4 text-primary" />
                  <Label>Exames laboratoriais</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Registre os valores com data. Dados estruturados deixam a análise da IA muito mais precisa (ex.: ferritina baixa reforça hipótese de eflúvio).
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {LAB_PRESETS.map((preset) => (
                    <button key={preset} type="button" onClick={() => addLab(preset)}
                      className="rounded-full border bg-card px-3 py-1 text-xs hover:bg-muted/60">
                      <Plus className="mr-1 inline h-3 w-3" />{preset}
                    </button>
                  ))}
                </div>
                {labs.length > 0 && (
                  <div className="space-y-2">
                    {labs.map((l, i) => (
                      <div key={i} className="flex flex-wrap items-end gap-2 rounded-lg border bg-card p-2">
                        <div className="min-w-[8rem] flex-1"><Label className="text-[11px]">Exame</Label><Input className="h-8" value={l.nome} onChange={(e) => setLab(i, { nome: e.target.value })} /></div>
                        <div className="w-24"><Label className="text-[11px]">Valor</Label><Input className="h-8" value={l.valor} onChange={(e) => setLab(i, { valor: e.target.value })} /></div>
                        <div className="w-24"><Label className="text-[11px]">Unidade</Label><Input className="h-8" value={l.unidade ?? ""} onChange={(e) => setLab(i, { unidade: e.target.value })} placeholder="ng/mL" /></div>
                        <div className="w-32"><Label className="text-[11px]">Data</Label><Input className="h-8" type="date" value={l.data ?? ""} onChange={(e) => setLab(i, { data: e.target.value })} /></div>
                        <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => setLabs(labs.filter((_, idx) => idx !== i))}><X className="h-4 w-4" /></Button>
                      </div>
                    ))}
                  </div>
                )}
                <div><Label>Observações dos exames</Label><Textarea rows={2} value={data.exames_observacoes ?? ""} onChange={(e) => update({ exames_observacoes: e.target.value })} placeholder="Ex.: aguardando resultado de tireoide" /></div>
              </>
            )}

            {/* ETAPA 8 — Tratamentos & fechamento */}
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
                    <li>• Queixa: {(data.queixa_principal ?? []).join(", ") || "—"}</li>
                    <li>• Queda: {data.queda_tempo || "—"} · {data.queda_evolucao || "—"} · {data.escala_padrao?.split(" — ")[0] || "sem escala"}</li>
                    <li>• Pull test: {data.pull_test || "—"}</li>
                    <li>• Couro: {(data.couro_sintomas ?? []).slice(0, 4).join(", ") || "—"} · descamação {data.descamacao_tipo || "—"}</li>
                    <li>• Fio: {[data.curvatura, data.espessura, data.densidade_percebida].filter(Boolean).join(" · ") || "—"}</li>
                    <li>• Exames: {(data.labs ?? []).length} registrado(s)</li>
                    <li>• Alerta: {[data.gestante_lactante && "gestante/lactante", data.marcapasso && "marcapasso", (data.doencas ?? []).includes("Doenças autoimunes") && "autoimune"].filter(Boolean).join(" · ") || "nenhum sinalizado"}</li>
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
    <label className="flex items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2 text-sm">
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

/** Seleção única (radio em forma de chip). Clicar de novo desmarca. */
function RadioChips({ options, value, onSelect }: { options: string[]; value?: string; onSelect: (v: string | undefined) => void }) {
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button key={opt} type="button" onClick={() => onSelect(active ? undefined : opt)}
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
