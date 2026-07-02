import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createGateway, COPILOT_SYSTEM_PROMPT, AI_DISCLAIMER } from "@/lib/ai-gateway.server";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as { messages?: UIMessage[]; patientId?: string };
        if (!Array.isArray(body.messages)) {
          return new Response("Messages are required", { status: 400 });
        }
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("LOVABLE_API_KEY missing", { status: 500 });

        // Pull lightweight patient context for the system prompt (publishable client, RLS as anon — patient table is not anon-readable, so we just send the id reference).
        let extraContext = "";
        if (body.patientId) {
          extraContext = `\n\nContexto da conversa: o profissional está visualizando o paciente com id ${body.patientId}. Sempre que possível, peça ao profissional os dados específicos da ficha; nunca invente dados clínicos.`;
        }

        const gateway = createGateway(key);
        const model = gateway("google/gemini-3-flash-preview");

        const result = streamText({
          model,
          system: COPILOT_SYSTEM_PROMPT + extraContext + `\n\nAo final de respostas longas inclua: ${AI_DISCLAIMER}`,
          messages: await convertToModelMessages(body.messages),
        });
        return result.toUIMessageStreamResponse();
      },
    },
  },
});
