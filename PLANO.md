# Plano de upgrade — Biblioteca Clínica de Tricologia + IA embasada

> **Princípio (reafirmado):** a IA **aconselha, a decisão é humana**. Todo
> conteúdo clínico é material de apoio ao profissional habilitado — nunca
> diagnóstico fechado, nunca prescrição automática. Tudo que a IA gera carrega
> o `AI_DISCLAIMER`.

## O que é este upgrade

Incorporar ao TrichoCare AI uma **base de conhecimento tricológica estruturada**
("Biblioteca Clínica") com os módulos já redigidos:

| Módulo | Conteúdo | Qtde |
|---|---|---|
| 1. Doenças & disfunções | Fichas completas (definição → prognóstico) | 15 |
| 2. Protocolos de consultório | Passo a passo, frequência, ativos, fórmula IDT | 7 |
| 3. Intradermoterapia | Mesclas com ativos + concentrações | 7 |
| 4. Suplementação oral | Fórmulas com doses e posologia | 25 |
| 5. Fórmulas tópicas | Tônicos, séruns, shampoos, máscaras | 16 |
| 6. Barba & sobrancelha | Oral + tópico + IDT por área | 2 guias |
| Exames laboratoriais | Função, referência, interpretação, alvos capilares | 10 |
| Exames por condição | Painéis prioritários por quadro | 8 |
| Questionário inteligente | 22 perguntas → hipóteses + exames sugeridos | 1 |
| Transversais | Busca, favoritos, PDF do paciente | — |

Esse conteúdo **não é um app paralelo**: ele vira a camada de conhecimento que
a IA existente (`/api/anamnesis-analysis`, `/api/protocol-suggestion`) passa a
**citar e priorizar** — é a "base de conhecimento versionada (RAG)" já prevista
na Fase 4 do `ROADMAP.md`, antecipada e alimentada com conteúdo próprio.

---

## Decisões de desenho (as 4 que evitam retrabalho e risco)

### 1. Conhecimento global × catálogo da clínica
Hoje `products` e `treatment_protocols` são **por clínica** (`clinic_id` +
RLS). A biblioteca é **global e curada** — todas as clínicas leem, ninguém
edita pela UI. Por isso ela nasce em tabelas próprias (`kb_*`, leitura para
`authenticated`, escrita só `service_role`), com uma ação **"Importar para meu
catálogo"** que copia um protocolo/fórmula da biblioteca para as tabelas da
clínica (aí sim editável e usável nos planos de tratamento). Um campo
`source_kb_id` na cópia mantém o vínculo com a ficha original.

**Por quê:** evita dois catálogos desconectados e evita que conteúdo curado
seja corrompido por edição local.

### 2. Escopo profissional (a trava ética/legal)
Parte do conteúdo é **conduta médica** (finasterida/dutasterida, minoxidil
oral, bimatoprosta, corticoide, inibidores de JAK, antibiótico, IDT com
fármaco). Terapeuta capilar/esteticista não prescreve nem injeta fármaco.

- Todo item da biblioteca tem `scope`: `estetico` | `medico` | `misto`.
- Itens `medico` aparecem **como referência**, com selo *"Conduta médica —
  requer prescrição por profissional habilitado"* — e **nunca entram no PDF do
  paciente** gerado por usuário de escopo estético.
- O perfil do membro da clínica ganha `professional_scope`
  (`estetico` | `medico`), declarado no onboarding da clínica; a UI filtra e
  rotula por ele.
- A IA recebe o escopo do usuário no contexto e restringe as condutas
  sugeridas ao escopo (referenciando encaminhamento quando a conduta é médica).

### 3. Uma tabela de fórmulas, não três
Mesclas (M3), suplementos (M4) e tópicos (M5) têm a **mesma estrutura**
(objetivo, composição com concentrações, posologia/modo de uso, mecanismo,
indicações, contraindicações). Viram **uma tabela `kb_formulas`** com
`route` (`intradermica` | `oral` | `topica`) e `area`
(`couro_cabeludo` | `barba` | `sobrancelha`) — o Módulo 6 entra aqui, não em
tabela própria. 48+ fórmulas, um só CRUD, uma só busca.

### 4. Referências cruzadas por slug
O fio condutor do conteúdo é "tudo se cruza": doença → exames → protocolos →
fórmulas. Cada condição tem um `slug` estável (`aag-feminina`,
`efluvio-telogeno-glp1`…) e os demais itens indicam `indications: text[]` com
esses slugs. É o que permite navegação cruzada na UI **e** o retrieval da IA
sem precisar de embeddings no primeiro momento.

---

## Modelo de dados (migração `kb_knowledge_base.sql`)

```sql
-- Fichas de doenças/disfunções (Módulo 1)
kb_conditions (
  id uuid PK, slug text UNIQUE, name text, aliases text[],
  definition text, clinical_features text, signs_symptoms text,
  causes text, differential_diagnosis text,
  recommended_exams jsonb,          -- [{ exam_slug, priority, note }]  ← "Exames por condição"
  aesthetic_treatments text,        -- escopo estético
  medical_treatments text,          -- escopo médico (selo + bloqueio no PDF)
  contraindications text, prognosis text,
  scope text CHECK (scope IN ('estetico','medico','misto')),
  sources jsonb,                    -- [{ label, ref, year }] ex.: TriNetX JAAD 2025
  reviewed_at date, version int, published boolean
)

-- Exames laboratoriais (10 fichas)
kb_exams (
  id uuid PK, slug text UNIQUE, name text,
  physiology text, reference_range text, capillary_target text,  -- ex.: ferritina ≥70
  interpretation text, hair_loss_relation text,
  possible_diagnoses text, conduct text, when_to_order text
)

-- Fórmulas: mesclas + suplementos + tópicos + barba/sobrancelha (48+)
kb_formulas (
  id uuid PK, slug text UNIQUE, name text,
  route text CHECK (route IN ('intradermica','oral','topica')),
  area text CHECK (area IN ('couro_cabeludo','barba','sobrancelha')),
  grouping text,                    -- "queda", "AAG", "pós-parto", "GLP-1"…
  objective text,
  composition jsonb,                -- [{ active, concentration, unit }]
  posology text,                    -- posologia / modo de uso / volume por sessão
  mechanism text, indications text[],           -- slugs de kb_conditions
  associations text, contraindications text, clinical_notes text,
  scope text, requires_prescription boolean,    -- ex.: finasterida 0,1% IDT
  sources jsonb, reviewed_at date, version int, published boolean
)

-- Protocolos de consultório (7)
kb_protocols (
  id uuid PK, slug text UNIQUE, name text,
  frequency text, sessions_planned int, interval_days int, duration text,
  indications text[], objective text,
  steps jsonb,                      -- [{ order, title, description, actives[], formula_slug }]
  idt_formula_slug text,            -- liga à mescla em kb_formulas
  expected_results text, contraindications text,
  scope text, sources jsonb, reviewed_at date, version int, published boolean
)

-- Regras do questionário inteligente (22 perguntas → hipóteses)
kb_triage_rules (
  id uuid PK, question_key text, answer_value text,
  condition_slug text, weight int, suggested_exams text[]
)

-- Favoritos (por usuário) e vínculo de importação
kb_favorites ( user_id uuid, item_type text, item_id uuid, PK (user_id, item_type, item_id) )
ALTER TABLE products            ADD COLUMN source_kb_id uuid;
ALTER TABLE treatment_protocols ADD COLUMN source_kb_id uuid;
ALTER TABLE clinic_members      ADD COLUMN professional_scope text DEFAULT 'estetico';
```

RLS: `kb_*` → `SELECT` para `authenticated` (somente `published = true`),
escrita só `service_role` (seed/curadoria). `kb_favorites` → dono da linha.

O conteúdo entra por **seed idempotente** (`supabase/seed/kb_*.sql` ou script
TS), com `version`/`reviewed_at` — medicina muda, o conteúdo precisa de data e
fonte (ex.: SURMOUNT-1, TriNetX JAAD 2025).

---

## Fases de entrega

### Fase 0 — Fundação (pré-requisito curto)
Rede de segurança antes de crescer o app:
- CI (GitHub Actions): `lint` + `tsc --noEmit` a cada push.
- Gerar tipos do Supabase e começar a remover `as any` dos acessos novos.
- Corrigir o card "Sessões agendadas — próximos 7 dias" (hoje conta todas as
  futuras) e atualizar `.lovable/plan.md` (bug das abas já foi corrigido).

### Fase 1 — Biblioteca núcleo (Módulo 1 + Exames)
- Migração `kb_*` + seed das **15 condições**, **10 exames** e **painéis por
  condição**.
- Rota **`/app/biblioteca`**: lista com filtro por tipo, ficha da condição com
  navegação cruzada (exames indicados → ficha do exame; tratamentos → selo de
  escopo).
- Selo de escopo + `professional_scope` no membro + filtro na UI.
- **Critério de aceite:** profissional abre "Eflúvio por GLP-1" e vê ficha
  completa, painel de exames com alvos (ferritina ≥70, vit. D ≥40…) e condutas
  separadas por escopo.

### Fase 2 — Fórmulas e protocolos (Módulos 2, 3, 4, 5, 6)
- Seed das **48+ fórmulas** (`kb_formulas`) e **7 protocolos**
  (`kb_protocols`), incluindo barba/sobrancelha com seus alertas próprios
  (proteção ocular, ≤0,5 mL, gestantes, hiperpigmentação de íris).
- **Importar para meu catálogo**: copia protocolo/fórmula para
  `treatment_protocols`/`products` da clínica (com `source_kb_id`).
- **Busca** unificada em tempo real (tipo + texto; Postgres full-text depois) e
  **Favoritos**.
- **Critério de aceite:** buscar "GLP-1" retorna condição, protocolo, mescla
  Recovery, suplementos e tônico de manutenção; importar o protocolo Intensivo
  Antiqueda cria um protocolo editável na clínica.

### Fase 3 — Saídas para o paciente + triagem
- **PDF do paciente** (kit home care): nome + observações + itens "Adicionar ao
  PDF", **filtrando por escopo** (item médico nunca sai no PDF de usuário
  estético), com orientações gerais e `AI_DISCLAIMER`. Reaproveita o padrão do
  `AnamnesisPrintView`.
- **Questionário inteligente (triagem)**: 22 perguntas → hipóteses + exames via
  `kb_triage_rules` (determinístico, sem IA — auditável). Integra com a
  anamnese existente: a triagem pré-preenche o `AnamnesisWizard`, não cria um
  fluxo paralelo.
- **Calculadoras**: HOMA-IR, IMC, dose ponderal (client-side, baratas).
- **Critério de aceite:** caso "feminino, queda difusa 1–3 meses" retorna
  hipótese + painel (ferritina, vit. D, TSH, hemograma, B12, zinco) e o kit do
  paciente sai sem nenhuma conduta médica quando o usuário é esteticista.

### Fase 4 — IA embasada na biblioteca (grounding/RAG)
- `/api/anamnesis-analysis` e `/api/protocol-suggestion` passam a fazer
  **retrieval**: casam achados da anamnese/triagem com `kb_conditions` (via
  slugs/indications), injetam as fichas relevantes no contexto e **citam a
  fonte** ("segundo a ficha *Eflúvio telógeno*…").
- Conduta sugerida respeita o `professional_scope` do usuário; sinais de alarme
  da ficha viram **alertas de encaminhamento** automáticos na anamnese.
- Sugestão de protocolo prioriza: catálogo da clínica → biblioteca → genérico.
- Evolução posterior: embeddings/pgvector quando o retrieval por slug ficar
  limitado.
- **Critério de aceite:** análise de anamnese cita fichas da biblioteca por
  nome, com hipóteses coerentes com os painéis de exames das fichas.

### Fase 5 — "Em breve" do produto
- Biblioteca de ativos e de medicamentos (mesma infra `kb_*`).
- Comparação evolutiva de fotos por região; tricoscopia assistida por imagem.
- Decisão clínica avançada (triagem + exames retornados → refinamento de
  hipóteses).

---

## Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Conteúdo médico virar "prescrição" na mão de não-médico | `scope` + selo + bloqueio no PDF + IA ciente do escopo (Fases 1–4) |
| Conteúdo clínico desatualizar | `version`, `reviewed_at`, `sources` em toda ficha; revisão periódica |
| Catálogo da clínica divergir da biblioteca | Importação com `source_kb_id`; UI indica quando a ficha-fonte foi atualizada |
| Duplicar a anamnese com o questionário | Triagem integra e pré-preenche o `AnamnesisWizard` (Fase 3) |
| Crescer sem rede de segurança | Fase 0 (CI + tipos) antes de tudo |

## Sequência recomendada

`Fase 0` → `Fase 1` → `Fase 2` → (`Fase 3` ∥ `Fase 4`) → `Fase 5`

Fases 3 e 4 são independentes entre si — dá para paralelizar. O maior valor
percebido chega já na Fase 1 (biblioteca navegável) e o maior salto de produto
na Fase 4 (IA que cita a própria base).
