import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentClinic } from "@/lib/trichocare";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Briefcase } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/procedimentos/")({
  component: ProceduresPage,
});

function ProceduresPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [duration, setDuration] = useState<number | "">("");
  const [description, setDescription] = useState("");

  const { data: procedures = [] } = useQuery({
    queryKey: ["procedures"],
    queryFn: async () => {
      const { data } = await supabase.from("procedures").select("*").order("name");
      return data ?? [];
    },
  });

  async function create() {
    if (!name.trim()) return toast.error("Informe o nome do procedimento");
    const clinic = await getCurrentClinic();
    if (!clinic) return toast.error("Clínica não encontrada");
    const { error } = await supabase.from("procedures").insert({
      clinic_id: clinic.id,
      name: name.trim(),
      default_duration_min: duration === "" ? null : Number(duration),
      description: description || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Procedimento criado");
    setName(""); setDuration(""); setDescription(""); setOpen(false);
    qc.invalidateQueries({ queryKey: ["procedures"] });
  }

  async function remove(id: string) {
    if (!confirm("Excluir este procedimento?")) return;
    const { error } = await supabase.from("procedures").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["procedures"] });
  }

  return (
    <div>
      <PageHeader
        title="Procedimentos"
        subtitle="Catálogo de procedimentos oferecidos pela clínica."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Novo procedimento</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-display">Novo procedimento</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Nome *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Microagulhamento capilar" /></div>
                <div><Label>Duração padrão (min)</Label><Input type="number" value={duration} onChange={(e) => setDuration(e.target.value === "" ? "" : Number(e.target.value))} /></div>
                <div><Label>Descrição</Label><Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
              </div>
              <DialogFooter><Button onClick={create}>Cadastrar</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="p-6">
        {procedures.length === 0 ? (
          <Card className="border-0 card-premium">
            <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary"><Briefcase className="h-6 w-6" /></div>
              <p className="text-sm text-muted-foreground">Nenhum procedimento cadastrado ainda.</p>
              <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Cadastrar o primeiro</Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-0 card-premium">
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Nome</th>
                    <th className="px-4 py-3">Duração</th>
                    <th className="px-4 py-3">Descrição</th>
                    <th className="px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {procedures.map((p: any) => (
                    <tr key={p.id} className="border-t">
                      <td className="px-4 py-3 font-medium">{p.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.default_duration_min ? `${p.default_duration_min} min` : "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.description ?? "—"}</td>
                      <td className="px-4 py-3"><Button size="icon" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4" /></Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
