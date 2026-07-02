import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CRM_STATUS_LABELS, getCurrentClinic } from "@/lib/trichocare";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/clientes/")({
  component: ClientsPage,
});

function ClientsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");

  const { data: patients = [] } = useQuery({
    queryKey: ["patients"],
    queryFn: async () => {
      const { data } = await supabase
        .from("patients")
        .select("*")
        .order("updated_at", { ascending: false });
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    return patients.filter((p: any) => {
      if (status !== "all" && p.crm_status !== status) return false;
      if (q && !p.full_name.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [patients, status, q]);

  async function createPatient() {
    if (!newName.trim()) return toast.error("Informe o nome do cliente");
    const clinic = await getCurrentClinic();
    if (!clinic) return toast.error("Sua conta ainda não está vinculada a uma clínica");
    const { data, error } = await supabase
      .from("patients")
      .insert({
        clinic_id: clinic.id,
        full_name: newName.trim(),
        phone: newPhone || null,
        email: newEmail || null,
      })
      .select()
      .single();
    if (error) return toast.error(error.message);
    toast.success("Cliente cadastrado");
    setOpen(false);
    setNewName(""); setNewPhone(""); setNewEmail("");
    qc.invalidateQueries({ queryKey: ["patients"] });
    if (data) navigate({ to: "/app/clientes/$id", params: { id: data.id } });
  }

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle="Pipeline e ficha de cada cliente da clínica."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Novo cliente</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-display">Novo cliente</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div><Label>Nome completo *</Label><Input value={newName} onChange={(e) => setNewName(e.target.value)} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Telefone</Label><Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} /></div>
                  <div><Label>E-mail</Label><Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} type="email" /></div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={createPatient}>Cadastrar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="space-y-4 p-6">
        <div className="flex flex-col gap-2 md:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="md:w-64"><SelectValue placeholder="Status no CRM" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {Object.entries(CRM_STATUS_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card className="border-0 card-premium">
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Telefone</th>
                  <th className="px-4 py-3">Atualizado</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p: any) => (
                  <tr key={p.id} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <Link to="/app/clientes/$id" params={{ id: p.id }} className="font-medium hover:underline">{p.full_name}</Link>
                      {p.email && <div className="text-xs text-muted-foreground">{p.email}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">{CRM_STATUS_LABELS[p.crm_status] ?? p.crm_status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.phone ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(p.updated_at).toLocaleDateString("pt-BR")}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={4} className="p-10 text-center text-muted-foreground">Nenhum cliente encontrado.</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
