import { createFileRoute } from "@tanstack/react-router";
import { createGateway, AI_DISCLAIMER } from "@/lib/ai-gateway.server";
import { generateText } from "ai";

export const Route = createFileRoute("/api/protocol-suggestion")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return Response.json({ error: "LOVABLE_API_KEY missing" }, { status: 500 });

        const body = (await request.json()) as {
          patientName?: string;
          anamnesis?: Record<string, unknown> | null;
          trichoscopy?: Record<string, unknown> | null;
          exams?: string | null;
          products?: Array<Record<string, unknown>>;
          protocols?: Array<Record<string, unknown>>;
        };

        const gateway = createGateway(key);
        const model = gateway("google/gemini-3-flash-preview");

        const system = `Você é um assistente clínico em tricologia e terapia capilar para uso por profissionais habilitados (terapeutas capilares, tricologistas, dermatologistas).

Sua tarefa: a partir dos dados do cliente (anamnese, tricoscopia e exames) e do CATÁLOGO de protocolos e produtos JÁ CADASTRADOS pela clínica, SUGERIR de forma assistiva qual protocolo e quais ativos fazem mais sentido investigar/aplicar.

REGRAS ABSOLUTAS — NUNCA VIOLAR:
- NUNCA dê diagnóstico definitivo; fale sempre em "hipótese a investigar".
- NUNCA prescreva medicamentos, doses de fármacos sistêmicos, nem prometa cura/resultado.
- A escolha final é SEMPRE do profissional responsável. Você apenas sugere e justifica.
- Priorize SEMPRE os protocolos e produtos do catálogo fornecido. Se sugerir algo fora do catálogo, deixe explícito que não está cadastrado.
- Se a anamnese apontar sinais de alarme (queda abrupta, lesões, dor, inflamação, sintomas sistêmicos, suspeita de alopecia cicatricial) ou contraindicações (gestante/lactante, autoimune, uso de anticoagulantes, neoplasia, marcapasso p/ procedimentos com corrente), destaque e recomende encaminhamento/cautela.
- Respeite as contraindicações registradas em cada produto/protocolo.

FORMATO (Markdown, até ~500 palavras):
**Leitura do caso** — resumo das hipóteses a investigar e do estágio.
**Protocolo sugerido** — nome do protocolo do catálogo mais indicado + porquê. Se nenhum servir bem, diga isso.
**Ativos / produtos sugeridos** — liste produtos do catálogo por objetivo (ex.: antiqueda, anti-inflamatório, hidratação), citando o ativo. Marque contraindicações relevantes.
**Sequência de sessões** — como distribuir ao longo das sessões.
**Pontos de atenção / encaminhamento** — sinais de alarme e quando encaminhar ao médico.
**O que falta** — dados/exames que aumentariam a confiança da sugestão.

Encerre com: *${AI_DISCLAIMER}*`;

        const catalogProtocols = (body.protocols ?? []).map((p: any) => ({
          nome: p.name,
          indicacoes: p.indications,
          contraindicacoes: p.contraindications,
          sessoes: p.sessions_planned,
          intervalo_dias: p.interval_days,
          etapas: p.steps,
        }));
        const catalogProducts = (body.products ?? []).map((p: any) => ({
          nome: p.name,
          marca: p.brand,
          ativos: p.actives,
          ativo_principal: p.main_active,
          indicacoes: p.indications,
          finalidade: p.purpose,
          contraindicacoes: p.contraindications,
        }));

        const prompt = `Cliente: ${body.patientName ?? "(não informado)"}

## Anamnese (JSON)
${JSON.stringify(body.anamnesis ?? {}, null, 2)}

## Tricoscopia (JSON)
${JSON.stringify(body.trichoscopy ?? {}, null, 2)}

## Exames / observações do profissional
${body.exams?.trim() || "(nenhum informado)"}

## CATÁLOGO — Protocolos cadastrados na clínica
${JSON.stringify(catalogProtocols, null, 2)}

## CATÁLOGO — Produtos e ativos cadastrados na clínica
${JSON.stringify(catalogProducts, null, 2)}

Gere a sugestão assistiva seguindo o formato, usando prioritariamente o catálogo acima.`;

        try {
          const result = await generateText({ model, system, prompt });
          return Response.json({ markdown: result.text, generated_at: new Date().toISOString() });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Falha ao gerar sugestão";
          return Response.json({ error: msg }, { status: 502 });
        }
      },
    },
  },
});
