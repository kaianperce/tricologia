import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Sparkles, Loader2, Printer } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { AI_DISCLAIMER } from "@/lib/ai-disclaimer";

const TYPES = [
  { v: "profissional", l: "Relatório profissional" },
  { v: "cliente", l: "Relatório para cliente" },
  { v: "evolucao", l: "Relatório de evolução" },
];

export function ReportsSection({ patient }: { patient: any }) {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase.from("ai_reports").select("*").eq("patient_id", patient.id).order("created_at", { ascending: false });
    setReports(data ?? []);
  }
  useEffect(() => { load(); }, [patient.id]);

  async function gen(type: string) {
    setLoading(type);
    try {
      const r = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: patient.id, type }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      toast.success("Relatório gerado");
      load();
    } catch (e: any) { toast.error(e.message); } finally { setLoading(null); }
  }

  async function toggle(r: any) {
    await supabase.from("ai_reports").update({ visible_to_client: !r.visible_to_client } as any).eq("id", r.id);
    load();
  }

  return (
    <div className="space-y-4">
      <Card className="border-0 card-premium">
        <CardContent className="p-5">
          <h3 className="font-display text-lg">Gerar novo relatório com IA</h3>
          <p className="text-xs text-muted-foreground">A IA usa anamnese, tricoscopia e sessões. Você sempre revisa antes de liberar.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {TYPES.map((t) => (
              <Button key={t.v} variant="outline" onClick={() => gen(t.v)} disabled={loading === t.v}>
                {loading === t.v ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                {t.l}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {reports.map((r) => (
          <Card key={r.id} className="border-0 card-premium">
            <CardContent className="p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-display text-base">{r.title ?? TYPES.find((t) => t.v === r.report_type)?.l}</div>
                  <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("pt-BR")}</div>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs">
                    <Switch checked={!!r.visible_to_client} onCheckedChange={() => toggle(r)} />
                    Visível ao cliente
                  </label>
                  <Button size="sm" variant="ghost" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Imprimir/PDF</Button>
                </div>
              </div>
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown>{r.content?.markdown ?? ""}</ReactMarkdown>
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">{AI_DISCLAIMER}</p>
            </CardContent>
          </Card>
        ))}
        {reports.length === 0 && (
          <Card className="border-0 card-premium">
            <CardContent className="p-10 text-center text-sm text-muted-foreground">Nenhum relatório gerado ainda.</CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
