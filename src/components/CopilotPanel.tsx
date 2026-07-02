import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { AI_DISCLAIMER } from "@/lib/ai-gateway.server";

export function CopilotPanel({
  open,
  onOpenChange,
  patientContext,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  patientContext?: { id: string; name: string };
}) {
  const transport = useRef(new DefaultChatTransport({
    api: "/api/chat",
    body: () => ({ patientId: patientContext?.id }),
  }));
  const { messages, sendMessage, status } = useChat({
    id: patientContext?.id ?? "global",
    transport: transport.current,
  });
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const loading = status === "submitted" || status === "streaming";

  async function submit() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    await sendMessage({ text });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-md">
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="flex items-center gap-2 font-display">
            <Sparkles className="h-4 w-4 text-primary" />
            Copiloto Tricológico
          </SheetTitle>
          <p className="text-xs text-muted-foreground">
            {patientContext ? `Contexto: ${patientContext.name}` : "Assistente IA assistivo — nunca diagnostica nem prescreve."}
          </p>
        </SheetHeader>

        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {messages.length === 0 && (
            <div className="rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Como posso ajudar?</p>
              <ul className="mt-2 space-y-1">
                <li>• "Resumir caso deste paciente"</li>
                <li>• "Hipóteses a investigar para queda difusa pós-parto"</li>
                <li>• "Sugerir mensagem pós-sessão de detox"</li>
                <li>• "Perguntas complementares para anamnese"</li>
              </ul>
            </div>
          )}
          {messages.map((m) => {
            const text = m.parts
              .map((p) => (p.type === "text" ? p.text : ""))
              .join("");
            return (
              <div
                key={m.id}
                className={`rounded-lg px-3 py-2 text-sm ${
                  m.role === "user"
                    ? "ml-auto max-w-[85%] bg-primary text-primary-foreground"
                    : "max-w-[95%] bg-muted/60"
                }`}
              >
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                    ul: ({ children }) => <ul className="ml-4 list-disc space-y-1">{children}</ul>,
                  }}
                >
                  {text}
                </ReactMarkdown>
              </div>
            );
          })}
          {loading && (
            <div className="text-xs text-muted-foreground">Copiloto pensando…</div>
          )}
        </div>

        <div className="border-t px-5 py-3 text-[10px] text-muted-foreground">
          {AI_DISCLAIMER}
        </div>

        <div className="border-t bg-card p-3">
          <div className="flex gap-2">
            <Input
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder="Pergunte ao Copiloto…"
            />
            <Button onClick={submit} disabled={loading} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
