import { createFileRoute } from "@tanstack/react-router";
import { createGateway, AI_DISCLAIMER } from "@/lib/ai-gateway.server";
import { generateText } from "ai";

export const Route = createFileRoute("/api/anamnesis-analysis")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return Response.json({ error: "LOVABLE_API_KEY missing" }, { status: 500 });

        const body = (await request.json()) as { patientName?: string; data?: Record<string, unknown> };
        if (!body?.data) return Response.json({ error: "Anamnesis data required" }, { status: 400 });

        const gateway = createGateway(key);
        const model = gateway("google/gemini-3-flash-preview");

        const system = `Você é um assistente clínico em tricologia capilar para uso por profissionais habilitados.
REGRAS ABSOLUTAS — NUNCA VIOLAR:
- NUNCA dê diagnóstico definitivo, sempre fale em "hipótese a investigar".
- NUNCA prescreva medicamentos ou doses.
- NUNCA prometa resultado ou cura.
- Sempre alerte sobre encaminhamento médico/dermatológico quando houver sinais de alarme (queda abrupta, lesões, dor persistente, sintomas sistêmicos, suspeita de alopecia cicatricial).
- Sempre destaque contraindicações para procedimentos invasivos (microagulhamento, mesoterapia, laser) quando a anamnese apontar: gestante/lactante, marcapasso, autoimune, neoplasia, diabetes descompensada, anticoagulantes, lúpus, tatuagem/micropigmentação no couro cabeludo, doença cardiovascular grave, HIV+.

ESTILO:
- Português do Brasil, técnico mas acessível.
- Use Markdown com seções: **Resumo clínico**, **Hipóteses a investigar**, **Pontos de atenção / contraindicações**, **Perguntas para aprofundar**, **Sugestão de conduta inicial**.
- Seja conciso (até ~400 palavras).
- Encerre com: *${AI_DISCLAIMER}*`;

        const prompt = `Paciente: ${body.patientName ?? "(não informado)"}

Anamnese preenchida (JSON):
${JSON.stringify(body.data, null, 2)}

Gere a análise assistiva seguindo o formato pedido.`;

        try {
          const result = await generateText({ model, system, prompt });
          return Response.json({ markdown: result.text, generated_at: new Date().toISOString() });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Falha ao gerar análise";
          return Response.json({ error: msg }, { status: 502 });
        }
      },
    },
  },
});
