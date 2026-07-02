import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { toast } from "sonner";

const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  assinado: "Assinado",
  recusado: "Recusado",
  expirado: "Expirado",
};

export function ConsentsSection({ patient }: { patient: any }) {
  const [items, setItems] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  async function load() {
    const { data: s } = await supabase.from("signed_consents").select("*").eq("patient_id", patient.id).order("created_at", { ascending: false });
    setItems(s ?? []);
    const { data: t } = await supabase.from("consent_templates").select("*").eq("clinic_id", patient.clinic_id);
    setTemplates(t ?? []);
  }
  useEffect(() => { load(); }, [patient.id, patient.clinic_id]);

  function pickTemplate(id: string) {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setTitle(t.title); setBody(t.body);
  }

  async function send() {
    if (!title || !body) return toast.error("Preencha título e corpo");
    await supabase.from("signed_consents").insert({
      patient_id: patient.id, clinic_id: patient.clinic_id, title, body, status: "pendente",
    });
    setOpen(false); setTitle(""); setBody("");
    toast.success("Termo enviado para o cliente");
    load();
  }

  return (
    <div className="space-y-3">
      <Card className="border-0 card-premium">
        <CardContent className="flex items-center justify-between p-4">
          <div>
            <h3 className="font-display text-lg">Consentimentos digitais</h3>
            <p className="text-xs text-muted-foreground">Modelos disponíveis: {templates.length}. Envie um termo para o cliente assinar via portal.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Enviar termo</Button></DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle className="font-display">Novo termo</DialogTitle></DialogHeader>
              <div className="space-y-3">
                {templates.length > 0 && (
                  <div>
                    <Label>Usar modelo</Label>
                    <select className="mt-1 w-full rounded-md border bg-card px-3 py-2 text-sm" onChange={(e) => pickTemplate(e.target.value)} defaultValue="">
                      <option value="">Selecione…</option>
                      {templates.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
                    </select>
                  </div>
                )}
                <div><Label>Título</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
                <div><Label>Texto do termo</Label><Textarea rows={10} value={body} onChange={(e) => setBody(e.target.value)} /></div>
              </div>
              <DialogFooter><Button onClick={send}>Enviar para assinatura</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {items.map((it) => (
          <Card key={it.id} className="border-0 card-premium">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <div className="font-medium">{it.title}</div>
                <div className="text-xs text-muted-foreground">{new Date(it.created_at).toLocaleString("pt-BR")} {it.signed_at && ` · assinado em ${new Date(it.signed_at).toLocaleDateString("pt-BR")}`}</div>
              </div>
              <Badge variant={it.status === "assinado" ? "default" : "secondary"}>{STATUS_LABEL[it.status]}</Badge>
            </CardContent>
          </Card>
        ))}
        {items.length === 0 && (
          <Card className="border-0 card-premium">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">Nenhum termo enviado ainda.</CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
