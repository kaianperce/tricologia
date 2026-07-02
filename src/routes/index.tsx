import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Sparkles, Microscope, Camera, ClipboardList, ShieldCheck, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TrichoCare AI — CRM capilar com IA para tricologia" },
      { name: "description", content: "Anamnese inteligente, prontuário visual, sessões organizadas, evolução fotográfica e Copiloto Tricológico assistido por IA — tudo em um SaaS premium para clínicas capilares e profissionais de tricologia." },
      { property: "og:title", content: "TrichoCare AI" },
      { property: "og:description", content: "O sistema completo para acompanhamento de tratamentos capilares — com IA ética e assistiva." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground font-display text-lg">T</span>
            <span className="font-display text-lg">TrichoCare AI</span>
          </Link>
          <nav className="flex items-center gap-3">
            <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground">Entrar</Link>
            <Button asChild size="sm">
              <Link to="/auth">Começar agora</Link>
            </Button>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            <Sparkles className="h-3.5 w-3.5" /> Copiloto Tricológico com IA assistiva
          </span>
          <h1 className="mt-6 font-display text-5xl leading-tight text-foreground md:text-6xl">
            O prontuário capilar inteligente para profissionais de tricologia.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            Anamnese guiada, evolução fotográfica por região, sessões organizadas,
            plano de tratamento, relatórios bonitos e um Copiloto IA que ajuda — sem
            jamais substituir o profissional.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/auth">Acessar painel demo</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/auth">Conhecer o portal do cliente</Link>
            </Button>
          </div>
        </div>

        <div className="mt-20 grid gap-4 md:grid-cols-3">
          {[
            { icon: ClipboardList, title: "Anamnese inteligente", text: "Wizard em 8 etapas com salvamento automático e análise assistiva por IA." },
            { icon: Camera, title: "Evolução fotográfica", text: "Galeria por região do couro cabeludo com comparador antes/depois." },
            { icon: Microscope, title: "Tricoscopia técnica", text: "Formulário completo de achados com sugestões de hipóteses a investigar." },
            { icon: MessageSquare, title: "Copiloto Tricológico", text: "Chat com IA ética, sempre assistiva. Nunca diagnostica nem prescreve." },
            { icon: ShieldCheck, title: "LGPD e consentimentos", text: "Termos digitais, assinatura e controle do que cada cliente vê." },
            { icon: Sparkles, title: "Relatórios premium", text: "Documentos profissionais com a identidade da sua clínica." },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="card-premium p-6">
              <Icon className="h-6 w-6 text-primary" />
              <h3 className="mt-4 font-display text-lg">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-3 px-6 py-10 text-sm text-muted-foreground md:flex-row md:items-center">
          <p>© {new Date().getFullYear()} TrichoCare AI — SaaS para tricologia.</p>
          <p className="max-w-xl text-xs">
            Toda análise da IA é assistiva. Não substitui avaliação médica, diagnóstico ou prescrição.
          </p>
        </div>
      </footer>
    </div>
  );
}
