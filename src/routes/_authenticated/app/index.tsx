import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CRM_STATUS_LABELS } from "@/lib/trichocare";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Calendar, AlertTriangle, Activity, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/app/")({
  component: Dashboard,
});

function Dashboard() {
  const { data: patients = [] } = useQuery({
    queryKey: ["patients"],
    queryFn: async () => {
      const { data } = await supabase.from("patients").select("*").order("updated_at", { ascending: false });
      return data ?? [];
    },
  });
  const { data: sessions = [] } = useQuery({
    queryKey: ["sessions-upcoming"],
    queryFn: async () => {
      const { data } = await supabase
        .from("session_records")
        .select("*, patients(full_name)")
        .gte("scheduled_at", new Date().toISOString())
        .order("scheduled_at")
        .limit(5);
      return data ?? [];
    },
  });

  const active = patients.filter((p: any) =>
    ["tratamento_iniciado","em_acompanhamento"].includes(p.crm_status),
  ).length;
  const reavaliacao = patients.filter((p: any) => p.crm_status === "reavaliacao_necessaria").length;
  const leads = patients.filter((p: any) => p.crm_status === "novo_lead").length;

  const cards = [
    { label: "Pacientes ativos", value: active, icon: Activity, hint: "Em tratamento ou acompanhamento" },
    { label: "Sessões agendadas", value: sessions.length, icon: Calendar, hint: "Próximos 7 dias" },
    { label: "Reavaliações pendentes", value: reavaliacao, icon: AlertTriangle, hint: "Aguardando reavaliação" },
    { label: "Novos leads", value: leads, icon: Users, hint: "A converter em avaliação" },
  ];

  return (
    <div>
      <PageHeader
        title="Painel"
        subtitle="Visão geral da sua clínica capilar — clientes, sessões e alertas."
        actions={
          <Button asChild>
            <Link to="/app/clientes">Ver todos os clientes</Link>
          </Button>
        }
      />

      <div className="grid gap-4 px-6 pt-2 md:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, hint }) => (
          <Card key={label} className="border-0 card-premium">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
                  <div className="mt-2 font-display text-3xl">{value}</div>
                </div>
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-secondary text-secondary-foreground">
                  <Icon className="h-5 w-5" />
                </span>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">{hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 p-6 lg:grid-cols-3">
        <Card className="border-0 card-premium lg:col-span-2">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg">Clientes recentes</h3>
                <p className="text-xs text-muted-foreground">Atualizações mais recentes na sua clínica.</p>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link to="/app/clientes">Ver todos</Link>
              </Button>
            </div>
            <div className="space-y-2">
              {patients.slice(0, 6).map((p: any) => (
                <Link
                  key={p.id}
                  to="/app/clientes/$id"
                  params={{ id: p.id }}
                  className="flex items-center justify-between rounded-lg border bg-card px-4 py-3 hover:bg-muted/40"
                >
                  <div>
                    <div className="font-medium">{p.full_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {CRM_STATUS_LABELS[p.crm_status] ?? p.crm_status}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(p.updated_at).toLocaleDateString("pt-BR")}
                  </span>
                </Link>
              ))}
              {patients.length === 0 && (
                <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                  Nenhum cliente cadastrado ainda — comece pelo botão acima.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 card-premium">
          <CardContent className="p-5">
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="font-display text-lg">Copiloto Tricológico</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Pergunte ao Copiloto sobre um caso, peça resumo de anamnese ou sugestões de conduta. Toda análise é assistiva.
            </p>
            <div className="mt-4 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
              Exemplos:<br />
              • "Resumir queixa principal do João"<br />
              • "Hipóteses a investigar para queda difusa pós-parto"<br />
              • "Mensagem pós-sessão para hidratação capilar"
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
