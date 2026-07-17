# Visão de produto — O sistema operacional da clínica capilar

> Documento-mestre da estratégia. O detalhamento técnico da Etapa 1 está em
> [`PLANO.md`](./PLANO.md); as fases antigas do [`ROADMAP.md`](./ROADMAP.md)
> ficam re-sequenciadas por este documento.

## O melhor projeto possível (em uma frase)

**A plataforma onde a clínica/salão capilar inteiro funciona:** o cliente
chega (funil de marketing), agenda (agenda online), é atendido (prontuário +
IA tricológica), recebe o kit e o acompanhamento (portal + automações), volta
(retenção) — e o dono vê tudo em números.

## Estratégia: por que tricologia primeiro está certo

Sistemas de salão genéricos (agenda + cadastro + lembrete) existem aos montes
e competem por preço. **Ninguém tem profundidade clínica tricológica com IA.**

- **Tricologia é o fosso (moat):** anamnese estruturada, tricoscopia,
  biblioteca clínica, IA que cita fontes — isso não se copia num fim de semana
  e justifica preço premium.
- **CRM + agenda + inbox são o uso diário:** são o que faz a clínica abrir o
  app todo dia e nunca cancelar. Sozinhos são commodity; em cima do prontuário,
  são imbatíveis (o lembrete sabe em que sessão do protocolo o cliente está).
- **A IA amarra as camadas:** a mesma base que sugere protocolo hoje vai
  sugerir resposta no inbox, prever no-show e escrever o follow-up do funil.

### O flywheel do nicho

```
resultados clínicos documentados (fotos de evolução, relatórios)
        → prova social e conteúdo de marketing
        → mais leads no funil
        → mais agendamentos
        → mais atendimentos com prontuário + IA
        → mais resultados documentados … (volta ao início)
```

Cada etapa do produto alimenta a seguinte. É por isso que a ordem importa:
**sem a clínica 100%, o marketing não tem o que mostrar.**

---

## Sequência de etapas

### Etapa 1 — Tricologia 100% (agora)
É o `PLANO.md` completo (Fases 0–4): biblioteca clínica (condições, exames,
fórmulas, protocolos), escopo profissional, triagem, PDF do paciente e IA
embasada na base de conhecimento. **Critério de "100%":**

- [ ] Biblioteca navegável com as 15 condições, exames e 48+ fórmulas
- [ ] IA citando fichas da biblioteca na análise e na sugestão de protocolo
- [ ] PDF/kit do paciente com filtro de escopo profissional
- [ ] Triagem inteligente integrada à anamnese
- [ ] Comparação evolutiva de fotos por região (a "prova social" do flywheel)
- [ ] Portal do cliente com vínculo automático (sem colar UUID na mão)
- [ ] Fundação: CI + tipos gerados do Supabase

### Etapa 2 — CRM com funis de verdade
Hoje `patients.crm_status` já é um funil de 10 etapas — mas fixo (enum) e sem
visão de pipeline. Upgrade:

- **Funis configuráveis:** tabelas `crm_pipelines` + `crm_stages` por clínica
  (nome, ordem, cor). O enum atual vira o seed padrão ("Funil de vendas");
  a clínica pode criar outros (ex.: "Retenção/recorrência", "Reativação de
  inativos").
- **Kanban** de arrastar cliente entre etapas + visão lista com filtros por
  tag/origem/profissional.
- **Atividades e follow-ups:** `crm_activities` (tarefa, ligação, retorno,
  nota) com data e responsável; "próximo contato" visível no card.
- **Automações internas:** X dias sem contato → tarefa; sessão concluída sem
  reagendamento → alerta; reavaliação vencida → entra no funil de retenção.
- **Métricas:** conversão por etapa, tempo médio em cada etapa, leads por
  origem (`patients.origin` já existe), receita estimada por funil.

### Etapa 3 — Agendamento para salão
A base já existe: `session_records.scheduled_at` e a tabela `procedures`.

- **Serviços:** evoluir `procedures` (duração, preço, profissional habilitado,
  cor na agenda).
- **Agenda:** `appointments` (serviço, profissional, cliente, sala/cadeira,
  status agendado/confirmado/realizado/faltou), horários de trabalho e
  bloqueios por profissional, visão dia/semana.
- **Agendamento online público:** página por clínica (marca branca —
  `brand_color`/`logo_url` já existem) onde o cliente escolhe serviço,
  profissional e horário. Novo cliente entra **direto no funil** como lead.
- **Ponte com a clínica:** confirmar um `appointment` de tratamento gera o
  `session_record` da sessão correspondente do protocolo (nº da sessão,
  produtos previstos).
- **Lembretes:** começa com WhatsApp por deeplink (`wa.me` com mensagem
  pronta, zero dependência da Meta) e evolui para envio automático na Etapa 4.
- **No-show:** marcação de falta + taxa por cliente/serviço (insumo para a IA
  e para regras de confirmação).

### Etapa 4 — Inbox omnichannel (WhatsApp + Instagram Direct)
Vem depois da agenda de propósito: a conversa que converte termina em
**agendamento**, e as automações mais valiosas disparam de **eventos da
agenda** (confirmação, lembrete, pós-sessão).

- **WhatsApp Cloud API** (Meta) e **Instagram Direct** (Graph API):
  `channels`, `conversations`, `messages`, `contacts` — contato vinculado ao
  `patient` (prontuário a um clique da conversa).
- **Inbox unificado** com atribuição por profissional e status.
- **IA assistiva no atendimento:** sugere resposta com base no prontuário e na
  biblioteca (sempre com revisão humana — decisão é do atendente), resume a
  conversa, detecta intenção ("quer remarcar", "quer orçamento") e sugere a
  ação (mover no funil, oferecer horário).
- **Automações externas:** confirmação de agendamento, lembrete 24h/2h,
  mensagem pós-sessão (o `/api/session-summary` já gera o texto), reativação
  de inativos — com templates aprovados pela Meta.
- **Realidade técnica a antecipar:** webhooks públicos, verificação de domínio,
  app review da Meta e filas de envio. **A papelada da Meta (Business
  verification + app review) começa durante a Etapa 3**, porque leva semanas.

### Etapa 5 — SaaS multi-salão (vender para o nicho)
A infra multi-tenant (clinics + clinic_members + RLS) já está pronta.

- Onboarding self-service, billing Stripe (planos, trial, limites por plano:
  profissionais, clientes, mensagens, IA), superadmin.
- Marca branca completa (agendamento público + portal + PDF com a marca).
- **LMS de videoaulas** (antiga Fase 2 do roadmap) entra aqui como receita de
  expansão: cursos de tricologia dentro da plataforma que o cliente já paga.

---

## Regras de ouro transversais

1. **IA aconselha, humano decide** — em toda camada: clínica (protocolo),
   CRM (follow-up sugerido), inbox (resposta sugerida). Nada é enviado ou
   aplicado sem confirmação humana.
2. **Tudo liga no prontuário** — lead, conversa, agendamento e sessão são o
   mesmo cliente (`patients` é a entidade central; nada de cadastros paralelos).
3. **Cada etapa entrega valor sozinha** — o CRM funciona sem o inbox; a agenda
   funciona sem a Meta; nada fica bloqueado por dependência externa.
4. **Multi-tenant desde o dia 1** — toda tabela nova nasce com `clinic_id` +
   RLS (`is_clinic_member`), como as existentes.

## Ordem e paralelismos

```
Etapa 1 (tricologia 100%)
   └─→ Etapa 2 (CRM/funis)
          └─→ Etapa 3 (agendamento)  ── inicia papelada Meta em paralelo
                 └─→ Etapa 4 (inbox omnichannel)
                        └─→ Etapa 5 (SaaS + LMS)
```

Dentro da Etapa 1, as fases 3 e 4 do `PLANO.md` podem rodar em paralelo.
A partir da Etapa 2, cada etapa pode ser lançada para clínicas reais — o
feedback de uso alimenta a seguinte.
