import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — TrichoCare AI" },
      { name: "description", content: "Acesse seu painel TrichoCare AI: anamnese, prontuário visual, sessões e IA assistiva." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/app" });
    });
  }, [navigate]);

  async function signIn() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Bem-vindo(a) de volta!");
    navigate({ to: "/app" });
  }

  async function signUp() {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Conta criada! Você já pode entrar.");
  }

  async function signInGoogle() {
    const res = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (res.error) toast.error("Não foi possível entrar com Google");
    if (!res.error && !res.redirected) navigate({ to: "/app" });
  }

  async function fillDemo(kind: "pro" | "client") {
    if (kind === "pro") {
      setEmail("demo@trichocare.ai");
      setPassword("trichocare-demo");
    } else {
      setEmail("cliente@trichocare.ai");
      setPassword("trichocare-demo");
    }
  }

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="hidden flex-col justify-between bg-accent p-12 text-accent-foreground md:flex">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-background text-foreground font-display text-lg">T</span>
          <span className="font-display text-lg">TrichoCare AI</span>
        </div>
        <div>
          <h2 className="font-display text-4xl leading-tight">
            Cuidado capilar com método, beleza e IA ética.
          </h2>
          <p className="mt-4 max-w-md text-sm opacity-90">
            Cadastre clientes, conduza a anamnese, registre sessões e gere relatórios
            premium com o Copiloto Tricológico. Tudo em um só lugar.
          </p>
        </div>
        <p className="text-xs opacity-70">
          Toda análise da IA é assistiva. Não substitui avaliação médica.
        </p>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center gap-2 md:hidden">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground font-display">T</span>
            <span className="font-display text-lg">TrichoCare AI</span>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="font-display">Entrar na plataforma</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="signin">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Entrar</TabsTrigger>
                  <TabsTrigger value="signup">Criar conta</TabsTrigger>
                </TabsList>
                <TabsContent value="signin" className="space-y-3 pt-4">
                  <div className="space-y-1.5">
                    <Label>E-mail</Label>
                    <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Senha</Label>
                    <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
                  </div>
                  <Button onClick={signIn} disabled={loading} className="w-full">Entrar</Button>
                  <Button onClick={signInGoogle} type="button" variant="outline" className="w-full">
                    Continuar com Google
                  </Button>
                </TabsContent>
                <TabsContent value="signup" className="space-y-3 pt-4">
                  <div className="space-y-1.5">
                    <Label>Nome completo</Label>
                    <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>E-mail</Label>
                    <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Senha</Label>
                    <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
                  </div>
                  <Button onClick={signUp} disabled={loading} className="w-full">Criar conta</Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <div className="card-premium mt-6 p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="h-4 w-4 text-primary" /> Contas de demonstração
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Preencha automaticamente as credenciais demo (crie a conta na aba "Criar conta" na primeira vez).
            </p>
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => fillDemo("pro")}>Profissional demo</Button>
              <Button size="sm" variant="secondary" onClick={() => fillDemo("client")}>Cliente demo</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
