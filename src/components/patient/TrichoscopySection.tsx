import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Plus, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { AI_DISCLAIMER } from "@/lib/ai-disclaimer";

const SCALP_FINDINGS = [
  "Inflamação da epiderme","Vasos sanguíneos visíveis","Descamação difusa","Descamação localizada",
  "Ausência de folículos","Variação de espessura no mesmo orifício","Tufos de fios","Fios vellus",
  "Fios em ponto de exclamação","Fios quebrados",
];
const SHAFT_FINDINGS = [
  "Tricorrexe nodosa","Tricoptilose","Triconodose","Moniletrix","Pili torti","Tricorrexe invaginata","Bubble hair",
];

export function TrichoscopySection({ patient }: { patient: any }) {
  const [records, setRecords] = useState<any[]>([]);
  const [current, setCurrent] = useState<any>(null);
  const [scalp, setScalp] = useState<string[]>([]);
  const [shaft, setShaft] = useState<string[]>([]);
  const [conclusion, setConclusion] = useState("");
  const [notes, setNotes] = useState("");
  const [imgs, setImgs] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    const { data } = await supabase.from("trichoscopy_records").select("*").eq("patient_id", patient.id).order("record_date", { ascending: false });
    setRecords(data ?? []);
  }
  useEffect(() => { load(); }, [patient.id]);

  async function newRecord() {
    const { data } = await supabase.from("trichoscopy_records").insert({
      patient_id: patient.id, clinic_id: patient.clinic_id, scalp_findings: {}, hair_shaft_findings: {},
    }).select().single();
    setCurrent(data);
    setScalp([]); setShaft([]); setConclusion(""); setNotes(""); setImgs("");
    load();
  }

  function loadRecord(r: any) {
    setCurrent(r);
    setScalp(Object.keys(r.scalp_findings ?? {}));
    setShaft(Object.keys(r.hair_shaft_findings ?? {}));
    setConclusion(r.conclusion ?? "");
    setNotes(r.notes ?? "");
    setImgs((r.image_urls ?? []).join("\n"));
  }

  async function save() {
    if (!current) return;
    await supabase.from("trichoscopy_records").update({
      scalp_findings: Object.fromEntries(scalp.map((k) => [k, true])),
      hair_shaft_findings: Object.fromEntries(shaft.map((k) => [k, true])),
      conclusion, notes,
      image_urls: imgs.split("\n").map((s) => s.trim()).filter(Boolean),
    } as any).eq("id", current.id);
    toast.success("Tricoscopia salva");
    load();
  }

  async function runAI() {
    if (!current) return;
    setLoading(true);
    try {
      const r = await fetch("/api/trichoscopy-insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordId: current.id, scalp, shaft, conclusion, notes, patientName: patient.full_name }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      await supabase.from("trichoscopy_records").update({ ai_insight: j } as any).eq("id", current.id);
      setCurrent({ ...current, ai_insight: j });
      toast.success("Análise gerada");
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
      <Card className="border-0 card-premium">
        <CardContent className="p-4">
          <Button onClick={newRecord} className="mb-3 w-full"><Plus className="mr-2 h-4 w-4" />Nova tricoscopia</Button>
          <div className="space-y-1 text-sm">
            {records.map((r) => (
              <button key={r.id} onClick={() => loadRecord(r)} className={`w-full rounded px-3 py-2 text-left text-xs hover:bg-muted/60 ${current?.id === r.id ? "bg-muted/60" : ""}`}>
                <div className="font-medium">{new Date(r.record_date).toLocaleDateString("pt-BR")}</div>
                <div className="truncate text-muted-foreground">{r.conclusion?.slice(0, 40) ?? "Sem conclusão"}</div>
              </button>
            ))}
            {records.length === 0 && <p className="text-xs text-muted-foreground">Nenhum registro ainda.</p>}
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 card-premium">
        <CardContent className="space-y-4 p-5">
          {!current && <p className="text-sm text-muted-foreground">Selecione ou crie uma tricoscopia para começar.</p>}
          {current && (
            <>
              <div>
                <Label>Achados — couro cabeludo</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {SCALP_FINDINGS.map((opt) => (
                    <button key={opt} type="button" onClick={() => setScalp((s) => s.includes(opt) ? s.filter((x) => x !== opt) : [...s, opt])}
                      className={`rounded-full border px-3 py-1 text-xs ${scalp.includes(opt) ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted/60"}`}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Achados — haste capilar</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {SHAFT_FINDINGS.map((opt) => (
                    <button key={opt} type="button" onClick={() => setShaft((s) => s.includes(opt) ? s.filter((x) => x !== opt) : [...s, opt])}
                      className={`rounded-full border px-3 py-1 text-xs ${shaft.includes(opt) ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted/60"}`}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
              <div><Label>Conclusão técnica</Label><Textarea rows={3} value={conclusion} onChange={(e) => setConclusion(e.target.value)} /></div>
              <div><Label>Observações / conduta sugerida</Label><Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
              <div>
                <Label>URLs de imagens tricoscópicas (uma por linha)</Label>
                <Textarea rows={3} value={imgs} onChange={(e) => setImgs(e.target.value)} placeholder="https://…" />
              </div>
              <div className="flex gap-2">
                <Button onClick={save}>Salvar tricoscopia</Button>
                <Button variant="outline" onClick={runAI} disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  Gerar análise IA
                </Button>
              </div>
              {current.ai_insight && (
                <div className="mt-4 rounded-lg border bg-muted/40 p-4 text-sm">
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown>{current.ai_insight.markdown ?? ""}</ReactMarkdown>
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground">{AI_DISCLAIMER}</p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
