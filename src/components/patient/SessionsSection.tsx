import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Sparkles, Loader2, X, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { AI_DISCLAIMER } from "@/lib/ai-disclaimer";

type ProductLine = {
  kind: "produto" | "tintura" | "quimica";
  product_id?: string | null;
  name: string;
  formulation: string;   // fórmula/cor/mistura
  dose: string;          // quantidade
  developer_vol: string; // volume da oxidante (tintura)
  area: string;          // região/mecha aplicada
  notes: string;
};

const KIND_LABELS: Record<ProductLine["kind"], string> = {
  produto: "Produto",
  tintura: "Tintura / coloração",
  quimica: "Química",
};

function emptyLine(kind: ProductLine["kind"] = "produto"): ProductLine {
  return { kind, product_id: null, name: "", formulation: "", dose: "", developer_vol: "", area: "", notes: "" };
}

export function SessionsSection({ patient }: { patient: any }) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [loadingAI, setLoadingAI] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase.from("session_records").select("*").eq("patient_id", patient.id).order("session_number", { ascending: false });
    setSessions(data ?? []);
  }
  useEffect(() => {
    load();
    supabase.from("products").select("id,name,category").order("name").then(({ data }) => setProducts(data ?? []));
  }, [patient.id]);

  async function newSession() {
    const next = (sessions[0]?.session_number ?? 0) + 1;
    const { data } = await supabase.from("session_records").insert({
      patient_id: patient.id, clinic_id: patient.clinic_id, session_number: next,
      performed_at: new Date().toISOString(),
    }).select().single();
    setOpen(data!.id);
    load();
  }

  async function update(id: string, patch: any) {
    await supabase.from("session_records").update(patch as any).eq("id", id);
    load();
  }

  // Edita a lista estruturada de produtos/química da sessão.
  function getLines(s: any): ProductLine[] {
    return Array.isArray(s.products_detail) ? s.products_detail : [];
  }
  async function saveLines(s: any, lines: ProductLine[]) {
    // Espelha os nomes em products_used (TEXT[]) para compatibilidade/relatórios.
    const names = lines.map((l) => l.name).filter(Boolean);
    await update(s.id, { products_detail: lines, products_used: names });
  }

  async function generateSummary(s: any) {
    setLoadingAI(s.id);
    try {
      const r = await fetch("/api/session-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientName: patient.full_name, session: s }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      await supabase.from("session_records").update({ ai_summary: j.markdown } as any).eq("id", s.id);
      load();
    } catch (e: any) { toast.error(e.message); } finally { setLoadingAI(null); }
  }

  const ordinal = (n: number) => `${n}ª sessão`;
  const nextNumber = (sessions[0]?.session_number ?? 0) + 1;

  return (
    <div className="space-y-4">
      <Card className="border-0 card-premium">
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="font-display text-lg">Linha do tempo de sessões</h3>
            <p className="text-xs text-muted-foreground">
              {sessions.length === 0 ? "Nenhuma sessão ainda — comece pela 1ª." : `${sessions.length} sessão(ões) registrada(s)`}
            </p>
          </div>
          <Button onClick={newSession} size="lg"><Plus className="mr-2 h-4 w-4" />Registrar {ordinal(nextNumber)}</Button>
        </CardContent>
      </Card>

      <div className="relative space-y-3 border-l-2 border-dashed pl-6">
        {sessions.map((s) => {
          const lines = getLines(s);
          return (
            <div key={s.id} className="relative">
              <span className="absolute -left-[33px] top-3 grid h-6 w-6 place-items-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                {s.session_number}
              </span>
              <Card className="border-0 card-premium">
                <CardContent className="p-4">
                  <button onClick={() => setOpen(open === s.id ? null : s.id)} className="flex w-full items-center justify-between text-left">
                    <div>
                      <div className="font-display text-base">{ordinal(s.session_number)}</div>
                      <div className="text-xs text-muted-foreground">
                        {s.performed_at ? new Date(s.performed_at).toLocaleDateString("pt-BR") : "Não realizada"} · {s.region_treated ?? "—"}
                        {lines.length ? ` · ${lines.length} item(ns) usados` : ""}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">{open === s.id ? "Recolher" : "Detalhes"}</span>
                  </button>
                  {open === s.id && (
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div><Label>Procedimentos (vírgula)</Label><Input defaultValue={s.procedures?.join(", ") ?? ""} onBlur={(e) => update(s.id, { procedures: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} /></div>
                      <div><Label>Região tratada</Label><Input defaultValue={s.region_treated ?? ""} onBlur={(e) => update(s.id, { region_treated: e.target.value })} /></div>

                      {/* Prontuário químico estruturado */}
                      <div className="md:col-span-2 rounded-lg border bg-muted/30 p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FlaskConical className="h-4 w-4 text-primary" />
                            <Label className="text-sm">Produtos, tintura e química usados</Label>
                          </div>
                          <div className="flex gap-1">
                            <Button type="button" size="sm" variant="ghost" onClick={() => saveLines(s, [...lines, emptyLine("produto")])}><Plus className="mr-1 h-3.5 w-3.5" />Produto</Button>
                            <Button type="button" size="sm" variant="ghost" onClick={() => saveLines(s, [...lines, emptyLine("tintura")])}><Plus className="mr-1 h-3.5 w-3.5" />Tintura</Button>
                            <Button type="button" size="sm" variant="ghost" onClick={() => saveLines(s, [...lines, emptyLine("quimica")])}><Plus className="mr-1 h-3.5 w-3.5" />Química</Button>
                          </div>
                        </div>
                        {lines.length === 0 ? (
                          <p className="text-xs text-muted-foreground">Nenhum item registrado. Adicione produtos, fórmula de tintura (cor + oxidante) ou química (alisamento, relaxamento…) com dosagem.</p>
                        ) : (
                          <div className="space-y-3">
                            {lines.map((l, i) => {
                              const setLine = (patch: Partial<ProductLine>) => {
                                const next = lines.map((x, idx) => (idx === i ? { ...x, ...patch } : x));
                                saveLines(s, next);
                              };
                              return (
                                <div key={i} className="rounded-lg border bg-card p-3">
                                  <div className="mb-2 flex flex-wrap items-center gap-2">
                                    <Select value={l.kind} onValueChange={(v) => setLine({ kind: v as ProductLine["kind"] })}>
                                      <SelectTrigger className="h-8 w-44 text-xs"><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        {(["produto", "tintura", "quimica"] as const).map((k) => <SelectItem key={k} value={k}>{KIND_LABELS[k]}</SelectItem>)}
                                      </SelectContent>
                                    </Select>
                                    {l.kind === "produto" && products.length > 0 && (
                                      <Select
                                        value={l.product_id ?? ""}
                                        onValueChange={(pid) => {
                                          const p = products.find((x) => x.id === pid);
                                          setLine({ product_id: pid, name: p?.name ?? l.name });
                                        }}
                                      >
                                        <SelectTrigger className="h-8 w-52 text-xs"><SelectValue placeholder="Do catálogo…" /></SelectTrigger>
                                        <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                                      </Select>
                                    )}
                                    <Badge variant="secondary" className="font-normal">{KIND_LABELS[l.kind]}</Badge>
                                    <Button type="button" size="icon" variant="ghost" className="ml-auto h-7 w-7" onClick={() => saveLines(s, lines.filter((_, idx) => idx !== i))}><X className="h-4 w-4" /></Button>
                                  </div>
                                  <div className="grid gap-2 sm:grid-cols-2">
                                    <div>
                                      <Label className="text-xs">Nome / marca</Label>
                                      <Input className="h-8" defaultValue={l.name} onBlur={(e) => setLine({ name: e.target.value })} placeholder={l.kind === "tintura" ? "Ex.: Coloração 6.0" : "Nome do produto"} />
                                    </div>
                                    <div>
                                      <Label className="text-xs">{l.kind === "tintura" ? "Fórmula / cor (mistura)" : l.kind === "quimica" ? "Produto químico / ativo" : "Formulação"}</Label>
                                      <Input className="h-8" defaultValue={l.formulation} onBlur={(e) => setLine({ formulation: e.target.value })} placeholder={l.kind === "tintura" ? "Ex.: 6.0 + 7.1 (1:1)" : l.kind === "quimica" ? "Ex.: Tioglicolato / guanidina" : "Concentração usada"} />
                                    </div>
                                    <div>
                                      <Label className="text-xs">Dose / quantidade</Label>
                                      <Input className="h-8" defaultValue={l.dose} onBlur={(e) => setLine({ dose: e.target.value })} placeholder="Ex.: 30g, 5ml" />
                                    </div>
                                    {l.kind === "tintura" ? (
                                      <div>
                                        <Label className="text-xs">Oxidante (volume)</Label>
                                        <Input className="h-8" defaultValue={l.developer_vol} onBlur={(e) => setLine({ developer_vol: e.target.value })} placeholder="Ex.: 20 vol" />
                                      </div>
                                    ) : (
                                      <div>
                                        <Label className="text-xs">Área / mecha</Label>
                                        <Input className="h-8" defaultValue={l.area} onBlur={(e) => setLine({ area: e.target.value })} placeholder="Ex.: raiz, comprimento" />
                                      </div>
                                    )}
                                    {l.kind === "tintura" && (
                                      <div>
                                        <Label className="text-xs">Área / mecha</Label>
                                        <Input className="h-8" defaultValue={l.area} onBlur={(e) => setLine({ area: e.target.value })} placeholder="Ex.: raiz, comprimento" />
                                      </div>
                                    )}
                                    <div className="sm:col-span-2">
                                      <Label className="text-xs">Observações (tempo de pausa, reação…)</Label>
                                      <Input className="h-8" defaultValue={l.notes} onBlur={(e) => setLine({ notes: e.target.value })} />
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <div><Label>Resposta do cliente</Label><Input defaultValue={s.client_response ?? ""} onBlur={(e) => update(s.id, { client_response: e.target.value })} /></div>
                      <div><Label>Evolução percebida</Label><Input defaultValue={s.evolution ?? ""} onBlur={(e) => update(s.id, { evolution: e.target.value })} /></div>
                      <div className="md:col-span-2"><Label>Intercorrências</Label><Textarea rows={2} defaultValue={s.intercurrences ?? ""} onBlur={(e) => update(s.id, { intercurrences: e.target.value })} /></div>
                      <div className="md:col-span-2"><Label>Orientação pós-sessão</Label><Textarea rows={2} defaultValue={s.post_session_instructions ?? ""} onBlur={(e) => update(s.id, { post_session_instructions: e.target.value })} /></div>
                      <div className="md:col-span-2"><Label>Notas internas</Label><Textarea rows={2} defaultValue={s.internal_notes ?? ""} onBlur={(e) => update(s.id, { internal_notes: e.target.value })} /></div>
                      <div className="md:col-span-2 flex flex-wrap items-center gap-3">
                        <Button size="sm" onClick={() => generateSummary(s)} disabled={loadingAI === s.id}>
                          {loadingAI === s.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                          Resumo + mensagem pós-sessão
                        </Button>
                        <label className="flex items-center gap-2 text-xs">
                          <Switch checked={!!s.visible_to_client} onCheckedChange={(v) => update(s.id, { visible_to_client: v })} />
                          Liberar ao cliente
                        </label>
                      </div>
                      {s.ai_summary && (
                        <div className="md:col-span-2 rounded-lg border bg-muted/40 p-3">
                          <div className="prose prose-sm max-w-none text-sm"><ReactMarkdown>{s.ai_summary}</ReactMarkdown></div>
                          <p className="mt-2 text-[11px] text-muted-foreground">{AI_DISCLAIMER}</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          );
        })}
        {sessions.length === 0 && (
          <Card className="border-0 card-premium ml-[-24px]">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">Nenhuma sessão registrada ainda.</CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
