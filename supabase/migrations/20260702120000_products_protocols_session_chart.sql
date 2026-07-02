-- ============================================================================
-- Cadastro rico de produtos + protocolos estruturados + prontuário por sessão
-- Tudo aditivo e idempotente (não quebra dados existentes).
-- ============================================================================

-- ============= PRODUCTS: ativos estruturados + indicações =============
-- Mantém as colunas existentes (name, brand, category, main_active, purpose,
-- usage_instructions, contraindications). Adiciona estrutura para múltiplos
-- ativos com concentração e indicações por condição capilar.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS actives JSONB NOT NULL DEFAULT '[]'::jsonb,        -- [{ name, concentration }]
  ADD COLUMN IF NOT EXISTS indications TEXT[] NOT NULL DEFAULT '{}',          -- condições/hipóteses que trata
  ADD COLUMN IF NOT EXISTS presentation TEXT,                                 -- forma: ampola, loção, sérum…
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS trg_products_updated ON public.products;
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============= TREATMENT PROTOCOLS: catálogo reutilizável =============
-- Protocolos de tratamento cadastrados pela clínica (etapas + produtos por
-- etapa + indicações por condição). Base para a sugestão da IA.
CREATE TABLE IF NOT EXISTS public.treatment_protocols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  indications TEXT[] NOT NULL DEFAULT '{}',        -- condições que o protocolo trata
  contraindications TEXT,
  sessions_planned INT DEFAULT 0,
  interval_days INT DEFAULT 7,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,         -- [{ order, title, description, product_ids[], actives[] }]
  home_care TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.treatment_protocols TO authenticated;
GRANT ALL ON public.treatment_protocols TO service_role;
ALTER TABLE public.treatment_protocols ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "protocols_clinic" ON public.treatment_protocols;
CREATE POLICY "protocols_clinic" ON public.treatment_protocols FOR ALL TO authenticated
  USING (public.is_clinic_member(clinic_id, auth.uid()))
  WITH CHECK (public.is_clinic_member(clinic_id, auth.uid()));

DROP TRIGGER IF EXISTS trg_protocols_updated ON public.treatment_protocols;
CREATE TRIGGER trg_protocols_updated BEFORE UPDATE ON public.treatment_protocols
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============= TREATMENT PLANS: origem no protocolo + sugestão IA =============
ALTER TABLE public.treatment_plans
  ADD COLUMN IF NOT EXISTS protocol_id UUID REFERENCES public.treatment_protocols(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ai_suggestion JSONB;   -- { markdown, generated_at } da última sugestão da IA

-- ============= SESSION RECORDS: prontuário químico estruturado =============
-- Mantém products_used TEXT[] (compatibilidade). Adiciona detalhe estruturado
-- de produtos/tintura/química usados na sessão, com formulação e dosagem.
ALTER TABLE public.session_records
  ADD COLUMN IF NOT EXISTS products_detail JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- [{ kind: 'produto'|'tintura'|'quimica', product_id, name, formulation, dose, developer_vol, area, notes }]
  ADD COLUMN IF NOT EXISTS protocol_id UUID REFERENCES public.treatment_protocols(id) ON DELETE SET NULL;

-- Índices de apoio
CREATE INDEX IF NOT EXISTS treatment_protocols_clinic_idx ON public.treatment_protocols (clinic_id);
CREATE INDEX IF NOT EXISTS products_clinic_idx ON public.products (clinic_id);
