import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { AI_DISCLAIMER } from "@/lib/ai-disclaimer";

export function SessionsSection({ patient }: { patient: any }) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [loadingAI, setLoadingAI] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase.from("session_records").select("*").eq("patient_id", patient.id).order("session_number", { ascending: false });
    setSessions(data ?? []);
  }
  useEffect(() => { load(); }, [patient.id]);

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

  async function generateSummary(s: any) {
    setLoadingAI(s.id);
    try {
      const r = await fetch("/api/session-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: s.id, patientName: patient.full_name, session: s }),
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
        {sessions.map((s) => (
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
                      {s.procedures?.length ? ` · ${s.procedures.slice(0, 2).join(", ")}` : ""}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{open === s.id ? "Recolher" : "Detalhes"}</span>
                </button>
                {open === s.id && (
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div><Label>Procedimentos (vírgula)</Label><Input defaultValue={s.procedures?.join(", ") ?? ""} onBlur={(e) => update(s.id, { procedures: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} /></div>
                    <div><Label>Produtos usados (vírgula)</Label><Input defaultValue={s.products_used?.join(", ") ?? ""} onBlur={(e) => update(s.id, { products_used: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} /></div>
                    <div><Label>Região tratada</Label><Input defaultValue={s.region_treated ?? ""} onBlur={(e) => update(s.id, { region_treated: e.target.value })} /></div>
                    <div><Label>Resposta do cliente</Label><Input defaultValue={s.client_response ?? ""} onBlur={(e) => update(s.id, { client_response: e.target.value })} /></div>
                    <div className="md:col-span-2"><Label>Evolução percebida</Label><Textarea rows={2} defaultValue={s.evolution ?? ""} onBlur={(e) => update(s.id, { evolution: e.target.value })} /></div>
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
        ))}
        {sessions.length === 0 && (
          <Card className="border-0 card-premium ml-[-24px]">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">Nenhuma sessão registrada ainda.</CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
