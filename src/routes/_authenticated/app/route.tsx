import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentClinic, getMyRoles } from "@/lib/trichocare";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Briefcase,
  Package,
  ListChecks,
  Building2,
  LogOut,
  Sparkles,
  Heart,
  Menu,
} from "lucide-react";
import { CopilotPanel } from "@/components/CopilotPanel";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app")({
  component: AppShell,
});

function AppShell() {
  const navigate = useNavigate();
  const loc = useLocation();
  const [clinicName, setClinicName] = useState("");
  const [userName, setUserName] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      setUserName(u.user?.user_metadata?.full_name ?? u.user?.email ?? "");
      const c = await getCurrentClinic();
      setClinicName(c?.name ?? "Sua clínica");
      const r = await getMyRoles();
      setRoles(r);
      if (r.length && !r.some((x) => ["admin","professional","assistant"].includes(x))) {
        navigate({ to: "/portal" });
      }
    })();
  }, [navigate]);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileNavOpen(false);
  }, [loc.pathname]);

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Sessão encerrada");
    navigate({ to: "/auth" });
  }

  const nav = [
    { to: "/app", label: "Painel", icon: LayoutDashboard, exact: true },
    { to: "/app/clientes", label: "Clientes", icon: Users },
    { to: "/app/anamneses", label: "Anamneses", icon: ClipboardList },
    { to: "/app/procedimentos", label: "Procedimentos", icon: Briefcase },
    { to: "/app/produtos", label: "Produtos", icon: Package },
    { to: "/app/protocolos", label: "Protocolos", icon: ListChecks },
    { to: "/app/clinica", label: "Clínica", icon: Building2 },
  ];

  const SidebarInner = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="border-b px-5 py-5">
        <Link to="/app" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground font-display text-lg">T</span>
          <div>
            <div className="font-display text-base leading-none">TrichoCare AI</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{clinicName}</div>
          </div>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {nav.map(({ to, label, icon: Icon, exact }) => {
          const active = exact ? loc.pathname === to : loc.pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/60"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="space-y-2 border-t p-3">
        <Button
          variant="secondary"
          className="w-full justify-start"
          onClick={() => { setCopilotOpen(true); setMobileNavOpen(false); }}
        >
          <Sparkles className="mr-2 h-4 w-4" /> Copiloto Tricológico
        </Button>
        {roles.includes("client") && (
          <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
            <Link to="/portal"><Heart className="mr-2 h-4 w-4" />Ir ao portal do cliente</Link>
          </Button>
        )}
        <div className="rounded-lg bg-muted/60 px-3 py-2 text-xs">
          <div className="font-medium text-foreground">{userName}</div>
          <div className="mt-0.5 text-muted-foreground">{roles.join(" · ") || "—"}</div>
        </div>
        <Button variant="ghost" size="sm" className="w-full justify-start" onClick={signOut}>
          <LogOut className="mr-2 h-4 w-4" /> Sair
        </Button>
      </div>
    </div>
  );

  return (
    <div className="grid min-h-screen md:grid-cols-[260px_1fr]">
      <aside className="hidden border-r md:flex md:flex-col">
        {SidebarInner}
      </aside>

      <main className="min-w-0 bg-background">
        <div className="sticky top-0 z-30 border-b bg-card/80 px-4 py-2 backdrop-blur md:hidden">
          <div className="flex items-center justify-between gap-2">
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <Button size="icon" variant="ghost" aria-label="Abrir menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] p-0">
                <VisuallyHidden>
                  <SheetTitle>Menu de navegação</SheetTitle>
                  <SheetDescription>Navegue entre as seções do TrichoCare AI</SheetDescription>
                </VisuallyHidden>
                {SidebarInner}
              </SheetContent>
            </Sheet>
            <Link to="/app" className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground font-display text-sm">T</span>
              <span className="font-display text-sm">TrichoCare AI</span>
            </Link>
            <Button size="icon" variant="ghost" onClick={() => setCopilotOpen(true)} aria-label="Copiloto">
              <Sparkles className="h-5 w-5" />
            </Button>
          </div>
        </div>
        <Outlet />
      </main>

      <CopilotPanel open={copilotOpen} onOpenChange={setCopilotOpen} />
    </div>
  );
}
