import { createFileRoute } from "@tanstack/react-router";
import { createGateway, AI_DISCLAIMER } from "@/lib/ai-gateway.server";
import { generateText } from "ai";

export const Route = createFileRoute("/api/anamnesis-analysis")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return Response.json({ error: "LOVABLE_API_KEY missing" }, { status: 500 });

        const body = (await request.json()) as {
          patientName?: string;
          patientSex?: string | null;
          birthDate?: string | null;
          data?: Record<string, unknown>;
        };
        if (!body?.data) return Response.json({ error: "Anamnesis data required" }, { status: 400 });

        const gateway = createGateway(key);
        const model = gateway("google/gemini-3-flash-preview");

        const system = `Você é um assistente clínico em tricologia e terapia capilar para uso por profissionais habilitados.

REGRAS ABSOLUTAS — NUNCA VIOLAR:
- NUNCA dê diagnóstico definitivo; fale sempre em "hipótese a investigar".
- NUNCA prescreva medicamentos ou doses.
- NUNCA prometa resultado ou cura.
- Sempre alerte sobre encaminhamento médico/dermatológico quando houver sinais de alarme (queda abrupta, lesões, pústulas, dor persistente, sintomas sistêmicos, suspeita de alopecia cicatricial ou areata em atividade).
- Sempre destaque contraindicações para procedimentos invasivos (microagulhamento, mesoterapia, laser, corrente) quando a anamnese apontar: gestante/lactante, marcapasso, autoimune, neoplasia, diabetes descompensada, anticoagulantes, lúpus, HIV+.

COMO RACIOCINAR (use os dados estruturados, não invente):
- Correlacione a **escala de padrão** (Ludwig/Norwood) e a **distribuição** com hipótese de alopecia androgenética.
- Um **evento marcante há ~3 meses** + queda difusa + pull test positivo sugere eflúvio telógeno agudo (a investigar).
- Queda **difusa crônica** (>6 meses, evolução progressiva) levanta eflúvio crônico vs androgenética.
- **Placas/áreas localizadas** com pull test positivo na borda → considerar alopecia areata (encaminhar).
- Leia os **exames laboratoriais** informados e comente desvios relevantes de forma cautelosa (ex.: ferritina baixa favorece eflúvio; alterações de TSH/T4; sinais de SOP). Cite os valores informados; NUNCA invente valores não fornecidos.
- Considere **rotina/agressões** (química, calor, tração) para diferenciar quebra de queda real.

ESTILO:
- Português do Brasil, técnico mas acessível.
- Use Markdown com seções: **Resumo clínico**, **Hipóteses a investigar** (ordene por probabilidade e diga o que apoia/contraria cada uma), **Correlação com exames**, **Pontos de atenção / contraindicações**, **Perguntas/exames para aprofundar**, **Sugestão de conduta inicial** (condutas de terapia capilar/cosmética e home care, sem fármacos).
- Seja objetivo (até ~500 palavras).
- Encerre com: *${AI_DISCLAIMER}*`;

        const prompt = `Paciente: ${body.patientName ?? "(não informado)"}${body.patientSex ? ` · sexo: ${body.patientSex}` : ""}${body.birthDate ? ` · nascimento: ${body.birthDate}` : ""}

Anamnese estruturada (JSON):
${JSON.stringify(body.data, null, 2)}

Gere a análise assistiva seguindo o formato pedido, apoiando-se nos campos estruturados (escala de padrão, distribuição, pull test, exames laboratoriais).`;

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
