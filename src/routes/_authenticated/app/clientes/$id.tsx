import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CRM_STATUS_LABELS, SCALP_REGION_LABELS } from "@/lib/trichocare";
import { PageHeader } from "@/components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AnamnesisWizard } from "@/components/patient/AnamnesisWizard";
import { TrichoscopySection } from "@/components/patient/TrichoscopySection";
import { PhotosSection } from "@/components/patient/PhotosSection";
import { SessionsSection } from "@/components/patient/SessionsSection";
import { PlanSection } from "@/components/patient/PlanSection";
import { ReportsSection } from "@/components/patient/ReportsSection";
import { ConsentsSection } from "@/components/patient/ConsentsSection";
import { CopilotPanel } from "@/components/CopilotPanel";

export const Route = createFileRoute("/_authenticated/app/clientes/$id")({
  component: PatientPage,
});

function PatientPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [copilotOpen, setCopilotOpen] = useState(false);
  const initialTab = typeof window !== "undefined" && window.location.hash
    ? window.location.hash.replace("#", "")
    : "overview";
  const validTabs = ["overview","anamnese","tricoscopia","fotos","plano","sessoes","relatorios","termos"];
  const [tab, setTab] = useState(validTabs.includes(initialTab) ? initialTab : "overview");
  const tabsListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = tabsListRef.current?.querySelector<HTMLElement>(`[data-tab="${tab}"]`);
    el?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [tab]);

  const { data: patient, isLoading } = useQuery({
    queryKey: ["patient", id],
    queryFn: async () => {
      const { data } = await supabase.from("patients").select("*").eq("id", id).maybeSingle();
      return data;
    },
  });

  if (isLoading) return <div className="p-10 text-sm text-muted-foreground">Carregando…</div>;
  if (!patient) return <div className="p-10 text-sm text-muted-foreground">Cliente não encontrado.</div>;

  async function updateField(field: string, value: any) {
    const { error } = await supabase.from("patients").update({ [field]: value } as any).eq("id", id);
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["patient", id] });
  }

  return (
    <div>
      <PageHeader
        title={patient.full_name}
        subtitle={
          <span className="flex items-center gap-2">
            <Badge variant="secondary">{CRM_STATUS_LABELS[patient.crm_status] ?? patient.crm_status}</Badge>
            {patient.email && <span className="text-xs text-muted-foreground">{patient.email}</span>}
          </span> as any
        }
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/app/clientes"><ArrowLeft className="mr-2 h-4 w-4" />Clientes</Link>
            </Button>
            <Button onClick={() => setCopilotOpen(true)}>
              <Sparkles className="mr-2 h-4 w-4" /> Copiloto
            </Button>
          </>
        }
      />

      <div className="p-6">
        <Tabs value={tab} onValueChange={setTab}>
          <div className="relative -mx-6 mb-2 px-6">
            <div className="overflow-x-auto scrollbar-thin [-webkit-overflow-scrolling:touch]">
              <TabsList ref={tabsListRef} className="inline-flex w-max min-w-full gap-1">
                {[
                  ["overview", "Visão geral"],
                  ["anamnese", "Anamnese"],
                  ["tricoscopia", "Tricoscopia"],
                  ["fotos", "Fotos"],
                  ["plano", "Plano"],
                  ["sessoes", "Sessões"],
                  ["relatorios", "Relatórios"],
                  ["termos", "Termos"],
                ].map(([value, label]) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    data-tab={value}
                    className="shrink-0 whitespace-nowrap"
                  >
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent sm:hidden" />
          </div>

          <TabsContent value="overview">
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="border-0 card-premium lg:col-span-2">
                <CardContent className="space-y-3 p-5">
                  <h3 className="font-display text-lg">Dados do cliente</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Nome</Label><Input defaultValue={patient.full_name} onBlur={(e) => updateField("full_name", e.target.value)} /></div>
                    <div><Label>Sexo</Label><Input defaultValue={patient.sex ?? ""} onBlur={(e) => updateField("sex", e.target.value)} /></div>
                    <div><Label>Telefone</Label><Input defaultValue={patient.phone ?? ""} onBlur={(e) => updateField("phone", e.target.value)} /></div>
                    <div><Label>E-mail</Label><Input defaultValue={patient.email ?? ""} onBlur={(e) => updateField("email", e.target.value)} /></div>
                    <div><Label>WhatsApp</Label><Input defaultValue={patient.whatsapp ?? ""} onBlur={(e) => updateField("whatsapp", e.target.value)} /></div>
                    <div><Label>Documento</Label><Input defaultValue={patient.document_id ?? ""} onBlur={(e) => updateField("document_id", e.target.value)} /></div>
                    <div><Label>Profissão</Label><Input defaultValue={patient.profession ?? ""} onBlur={(e) => updateField("profession", e.target.value)} /></div>
                    <div><Label>Origem</Label><Input defaultValue={patient.origin ?? ""} onBlur={(e) => updateField("origin", e.target.value)} /></div>
                  </div>
                  <div><Label>Endereço</Label><Input defaultValue={patient.address ?? ""} onBlur={(e) => updateField("address", e.target.value)} /></div>
                  <div>
                    <Label>Status no CRM</Label>
                    <Select defaultValue={patient.crm_status} onValueChange={(v) => updateField("crm_status", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(CRM_STATUS_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Observações</Label><Textarea rows={4} defaultValue={patient.notes ?? ""} onBlur={(e) => updateField("notes", e.target.value)} /></div>
                </CardContent>
              </Card>

              <Card className="border-0 card-premium">
                <CardContent className="p-5">
                  <h3 className="font-display text-lg">Acesso ao portal</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Vincule este cliente a um e-mail para liberar o portal do cliente. Após convidá-lo a se cadastrar com o mesmo e-mail, vincule manualmente o usuário aqui.
                  </p>
                  <div className="mt-3">
                    <Label>ID do usuário no portal</Label>
                    <Input
                      placeholder="UUID do auth.users"
                      defaultValue={patient.client_user_id ?? ""}
                      onBlur={(e) => updateField("client_user_id", e.target.value || null)}
                    />
                  </div>
                  <div className="mt-4 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
                    Use o e-mail do cliente para criar uma conta na tela de login, depois cole o UUID retornado aqui. A conta de demo do cliente já vem vinculada ao paciente "Mariana Lopes".
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="anamnese"><AnamnesisWizard patient={patient} /></TabsContent>
          <TabsContent value="tricoscopia"><TrichoscopySection patient={patient} /></TabsContent>
          <TabsContent value="fotos"><PhotosSection patient={patient} /></TabsContent>
          <TabsContent value="plano"><PlanSection patient={patient} /></TabsContent>
          <TabsContent value="sessoes"><SessionsSection patient={patient} /></TabsContent>
          <TabsContent value="relatorios"><ReportsSection patient={patient} /></TabsContent>
          <TabsContent value="termos"><ConsentsSection patient={patient} /></TabsContent>
        </Tabs>
      </div>

      <CopilotPanel
        open={copilotOpen}
        onOpenChange={setCopilotOpen}
        patientContext={{ id: patient.id, name: patient.full_name }}
      />
    </div>
  );
}
