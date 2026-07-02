import { createFileRoute } from "@tanstack/react-router";
import { createGateway, AI_DISCLAIMER } from "@/lib/ai-gateway.server";
import { generateText } from "ai";

export const Route = createFileRoute("/api/session-summary")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return Response.json({ error: "LOVABLE_API_KEY missing" }, { status: 500 });

        const body = (await request.json()) as {
          patientName?: string;
          session?: Record<string, unknown>;
        };
        if (!body?.session) return Response.json({ error: "Session data required" }, { status: 400 });

        const gateway = createGateway(key);
        const model = gateway("google/gemini-3-flash-preview");

        const system = `Você é um assistente de tricologia para profissionais habilitados. A partir dos dados de UMA sessão de tratamento capilar, gere um registro de evolução e uma mensagem pós-sessão para o cliente.

REGRAS ABSOLUTAS — NUNCA VIOLAR:
- NUNCA dê diagnóstico definitivo nem prometa resultado/cura.
- NUNCA prescreva medicamentos.
- Linguagem acolhedora e clara para o cliente; técnica e objetiva para o prontuário.

FORMATO (Markdown, conciso):
**Resumo para o prontuário** — o que foi feito, produtos/formulações usados, resposta e intercorrências.
**Evolução** — comparação com o esperado para a etapa (sem prometer resultado).
**Mensagem para o cliente** — texto curto e gentil (pode enviar por WhatsApp) com cuidados pós-sessão e próximo passo.

Encerre com: *${AI_DISCLAIMER}*`;

        const prompt = `Cliente: ${body.patientName ?? "(não informado)"}

Dados da sessão (JSON):
${JSON.stringify(body.session, null, 2)}

Gere o resumo e a mensagem pós-sessão seguindo o formato.`;

        try {
          const result = await generateText({ model, system, prompt });
          return Response.json({ markdown: result.text, generated_at: new Date().toISOString() });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Falha ao gerar resumo";
          return Response.json({ error: msg }, { status: 502 });
        }
      },
    },
  },
});
