# TrichoCare AI — Roadmap do produto

Plataforma para terapeutas capilares, tricologistas e clínicas: prontuário
capilar inteligente, CRM, catálogo de produtos/protocolos e IA assistiva.

> **Princípio ético (não negociável):** a IA é **assistiva**. Nunca dá
> diagnóstico definitivo, nunca prescreve medicamento, nunca promete cura. A
> decisão é sempre do profissional habilitado. Todo texto gerado carrega o
> aviso legal (`AI_DISCLAIMER`).

---

## ✅ Entregue nesta rodada

Enriquecimento da base existente (multi-tenant por clínica, Supabase + RLS):

- **Produtos com ativos ricos** (`/app/produtos`)
  - Múltiplos ativos com concentração (JSONB `products.actives`)
  - Indicações por condição capilar (`products.indications`)
  - Apresentação (ampola, sérum, frasco…) e contraindicações
- **Protocolos estruturados** (`/app/protocolos` — novo)
  - Etapas ordenadas, produtos por etapa, indicações, contraindicações,
    sessões planejadas e intervalo (tabela `treatment_protocols`)
  - Catálogo reutilizável que alimenta a IA
- **IA sugere protocolo** (`/api/protocol-suggestion`)
  - Lê anamnese + tricoscopia + exames do cliente e **prioriza o catálogo
    cadastrado** (protocolos e produtos) para sugerir tratamento e ativos
  - Botão no Plano de tratamento; sugestão salva em `treatment_plans.ai_suggestion`
  - Aplicar um protocolo do catálogo pré-preenche o plano
- **Prontuário químico por sessão** (`SessionsSection`)
  - Registro estruturado de produtos, **tintura** (fórmula/cor + oxidante) e
    **química** (produto/ativo, dose, área, observações) — JSONB
    `session_records.products_detail`
  - Espelha nomes em `products_used` para compatibilidade
- **Correção:** criado `/api/session-summary` (era referenciado pela UI mas
  não existia) — gera resumo de prontuário + mensagem pós-sessão para o cliente

Migração: `supabase/migrations/20260702120000_products_protocols_session_chart.sql`
(aditiva e idempotente — não altera dados existentes).

---

## 🔜 Próximas fases (a visão completa)

> **Ver também:** [`VISAO.md`](./VISAO.md) — visão-mestre do produto, que
> **re-sequencia** estas fases (tricologia 100% → CRM/funis → agendamento →
> inbox omnichannel → SaaS; o LMS passa para a última etapa) — e
> [`PLANO.md`](./PLANO.md) — plano detalhado da Biblioteca Clínica de
> Tricologia (15 condições, 7 protocolos, 48+ fórmulas, exames, triagem) e do
> grounding da IA nessa base.

### Fase 2 — Plataforma de videoaulas (LMS)
Cursos de tricologia, terapia capilar, técnicas de corte, tintura e luzes.
- Tabelas: `courses`, `modules`, `lessons` (vídeo + material), `enrollments`,
  `lesson_progress`, `certificates`
- Player com progresso, trilhas por nível, emissão de certificado
- Storage de vídeo (Mux/Cloudflare Stream/Bunny) ou embed
- Controle de acesso por assinatura/plano

### Fase 3 — CRM omnichannel (WhatsApp + Direct)
Atendimento centralizado ligado ao prontuário do cliente.
- **WhatsApp Cloud API** (Meta) para inbox, templates, automações
- **Instagram Direct** via Graph API
- Tabelas: `conversations`, `messages`, `channels`, `contacts` (liga a `patients`)
- Funil visual reaproveitando `crm_status` já existente
- Lembretes de sessão, retorno e reavaliação automáticos
- IA sugere respostas (sempre com revisão humana)

### Fase 4 — IA tricologista aprofundada
- Análise de imagem de tricoscopia (visão computacional assistiva)
- Comparação evolutiva automática entre fotos por região
- Base de conhecimento tricológica versionada (RAG) para embasar sugestões
- Alertas de sinais de alarme e encaminhamento médico

### Fase 5 — SaaS multi-salão (vender para outros)
Infra já é multi-tenant (`clinics` + `clinic_members` + RLS por clínica).
- **Onboarding self-service** de novas clínicas
- **Billing** (Stripe): planos, trial, limites por plano (nº de profissionais,
  clientes, IA, cursos)
- Papéis já existem (`admin`, `professional`, `assistant`, `client`)
- Marca branca por clínica (logo/cor já em `clinics.brand_color`/`logo_url`)
- Painel de superadmin para gestão das clínicas assinantes

---

## Notas técnicas
- Stack: TanStack Start (SSR) + React + Tailwind + shadcn/ui + Supabase.
- Acesso ao banco é feito sem tipos gerados para as tabelas novas (`as any`),
  seguindo o padrão do projeto. Ao rodar o build no Lovable, `types.ts` e
  `routeTree.gen.ts` são regenerados automaticamente.
- Gateway de IA: `ai.gateway.lovable.dev` (`LOVABLE_API_KEY`),
  modelo `google/gemini-3-flash-preview`.
- **Ação necessária:** aplicar a migração no banco Supabase da clínica
  (via Lovable/Supabase) para habilitar as novas colunas e a tabela de protocolos.
