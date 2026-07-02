
-- ============= ENUMS =============
CREATE TYPE public.app_role AS ENUM ('admin','professional','assistant','client');
CREATE TYPE public.crm_status AS ENUM ('novo_lead','avaliacao_agendada','avaliacao_realizada','proposta_enviada','tratamento_iniciado','em_acompanhamento','reavaliacao_necessaria','tratamento_concluido','retorno_futuro','inativo');
CREATE TYPE public.scalp_region AS ENUM ('frontal','linha_frontal','temporal_direita','temporal_esquerda','parietal_direita','parietal_esquerda','vertex','occipital','divisao_central','area_falha','sobrancelhas','outra');
CREATE TYPE public.plan_status AS ENUM ('rascunho','em_andamento','pausado','concluido');
CREATE TYPE public.report_type AS ENUM ('profissional','cliente','evolucao');
CREATE TYPE public.consent_status AS ENUM ('pendente','assinado','recusado','expirado');

-- ============= PROFILES =============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_self_read" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_self_write" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_self_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- ============= USER ROLES =============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_self_read" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- ============= CLINICS =============
CREATE TABLE public.clinics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  legal_id TEXT,
  responsible_name TEXT,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  instagram TEXT,
  address TEXT,
  logo_url TEXT,
  brand_color TEXT DEFAULT '#7A9B86',
  privacy_policy TEXT,
  terms_of_use TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.clinics TO authenticated;
GRANT ALL ON public.clinics TO service_role;
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;

-- ============= CLINIC MEMBERS =============
CREATE TABLE public.clinic_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(clinic_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinic_members TO authenticated;
GRANT ALL ON public.clinic_members TO service_role;
ALTER TABLE public.clinic_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_clinic_member(_clinic_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.clinic_members WHERE clinic_id = _clinic_id AND user_id = _user_id)
$$;

CREATE OR REPLACE FUNCTION public.user_clinic_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT clinic_id FROM public.clinic_members WHERE user_id = _user_id LIMIT 1
$$;

CREATE POLICY "clinics_member_read" ON public.clinics FOR SELECT TO authenticated
  USING (public.is_clinic_member(id, auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "clinics_admin_write" ON public.clinics FOR UPDATE TO authenticated
  USING (public.is_clinic_member(id, auth.uid()) AND public.has_role(auth.uid(),'admin'));

CREATE POLICY "clinic_members_self_read" ON public.clinic_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_clinic_member(clinic_id, auth.uid()));

-- ============= PATIENTS =============
CREATE TABLE public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  client_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_professional_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  birth_date DATE,
  sex TEXT,
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  address TEXT,
  document_id TEXT,
  profession TEXT,
  emergency_contact TEXT,
  origin TEXT,
  crm_status public.crm_status NOT NULL DEFAULT 'novo_lead',
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patients TO authenticated;
GRANT ALL ON public.patients TO service_role;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "patients_clinic_read" ON public.patients FOR SELECT TO authenticated
  USING (public.is_clinic_member(clinic_id, auth.uid()) OR client_user_id = auth.uid());
CREATE POLICY "patients_clinic_write" ON public.patients FOR ALL TO authenticated
  USING (public.is_clinic_member(clinic_id, auth.uid()))
  WITH CHECK (public.is_clinic_member(clinic_id, auth.uid()));

-- ============= ANAMNESES =============
CREATE TABLE public.anamneses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  current_step INT NOT NULL DEFAULT 1,
  completed BOOLEAN NOT NULL DEFAULT false,
  ai_analysis JSONB,
  visible_to_client BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.anamneses TO authenticated;
GRANT ALL ON public.anamneses TO service_role;
ALTER TABLE public.anamneses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anamneses_clinic" ON public.anamneses FOR ALL TO authenticated
  USING (public.is_clinic_member(clinic_id, auth.uid()))
  WITH CHECK (public.is_clinic_member(clinic_id, auth.uid()));
CREATE POLICY "anamneses_client_read" ON public.anamneses FOR SELECT TO authenticated
  USING (visible_to_client AND EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_id AND p.client_user_id = auth.uid()));

-- ============= TRICHOSCOPY =============
CREATE TABLE public.trichoscopy_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  record_date DATE NOT NULL DEFAULT CURRENT_DATE,
  scalp_findings JSONB DEFAULT '{}'::jsonb,
  hair_shaft_findings JSONB DEFAULT '{}'::jsonb,
  conclusion TEXT,
  notes TEXT,
  ai_insight JSONB,
  image_urls TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trichoscopy_records TO authenticated;
GRANT ALL ON public.trichoscopy_records TO service_role;
ALTER TABLE public.trichoscopy_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tricho_clinic" ON public.trichoscopy_records FOR ALL TO authenticated
  USING (public.is_clinic_member(clinic_id, auth.uid()))
  WITH CHECK (public.is_clinic_member(clinic_id, auth.uid()));

-- ============= PHOTOS =============
CREATE TABLE public.photo_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  session_id UUID,
  region public.scalp_region NOT NULL,
  url TEXT NOT NULL,
  captured_at DATE NOT NULL DEFAULT CURRENT_DATE,
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  visible_to_client BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.photo_records TO authenticated;
GRANT ALL ON public.photo_records TO service_role;
ALTER TABLE public.photo_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "photos_clinic" ON public.photo_records FOR ALL TO authenticated
  USING (public.is_clinic_member(clinic_id, auth.uid()))
  WITH CHECK (public.is_clinic_member(clinic_id, auth.uid()));
CREATE POLICY "photos_client_read" ON public.photo_records FOR SELECT TO authenticated
  USING (visible_to_client AND EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_id AND p.client_user_id = auth.uid()));

-- ============= PROCEDURES & PRODUCTS =============
CREATE TABLE public.procedures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  default_duration_min INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.procedures TO authenticated;
GRANT ALL ON public.procedures TO service_role;
ALTER TABLE public.procedures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "procedures_clinic" ON public.procedures FOR ALL TO authenticated
  USING (public.is_clinic_member(clinic_id, auth.uid()))
  WITH CHECK (public.is_clinic_member(clinic_id, auth.uid()));

CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  brand TEXT,
  category TEXT,
  main_active TEXT,
  purpose TEXT,
  usage_instructions TEXT,
  used_in_cabin BOOLEAN DEFAULT true,
  used_at_home BOOLEAN DEFAULT false,
  contraindications TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_clinic" ON public.products FOR ALL TO authenticated
  USING (public.is_clinic_member(clinic_id, auth.uid()))
  WITH CHECK (public.is_clinic_member(clinic_id, auth.uid()));

-- ============= TREATMENT PLANS =============
CREATE TABLE public.treatment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  objective TEXT,
  hypothesis TEXT,
  protocol TEXT,
  sessions_planned INT DEFAULT 0,
  interval_days INT DEFAULT 7,
  procedures TEXT[] DEFAULT '{}',
  products TEXT[] DEFAULT '{}',
  home_care TEXT,
  pre_session_instructions TEXT,
  post_session_instructions TEXT,
  contraindications TEXT,
  status public.plan_status NOT NULL DEFAULT 'rascunho',
  visible_to_client BOOLEAN NOT NULL DEFAULT false,
  next_review_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.treatment_plans TO authenticated;
GRANT ALL ON public.treatment_plans TO service_role;
ALTER TABLE public.treatment_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plans_clinic" ON public.treatment_plans FOR ALL TO authenticated
  USING (public.is_clinic_member(clinic_id, auth.uid()))
  WITH CHECK (public.is_clinic_member(clinic_id, auth.uid()));
CREATE POLICY "plans_client_read" ON public.treatment_plans FOR SELECT TO authenticated
  USING (visible_to_client AND EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_id AND p.client_user_id = auth.uid()));

-- ============= SESSIONS =============
CREATE TABLE public.session_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.treatment_plans(id) ON DELETE SET NULL,
  professional_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_number INT NOT NULL DEFAULT 1,
  scheduled_at TIMESTAMPTZ,
  performed_at TIMESTAMPTZ,
  procedures TEXT[] DEFAULT '{}',
  products_used TEXT[] DEFAULT '{}',
  region_treated TEXT,
  client_response TEXT,
  intercurrences TEXT,
  evolution TEXT,
  post_session_instructions TEXT,
  internal_notes TEXT,
  ai_summary TEXT,
  visible_to_client BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_records TO authenticated;
GRANT ALL ON public.session_records TO service_role;
ALTER TABLE public.session_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions_clinic" ON public.session_records FOR ALL TO authenticated
  USING (public.is_clinic_member(clinic_id, auth.uid()))
  WITH CHECK (public.is_clinic_member(clinic_id, auth.uid()));
CREATE POLICY "sessions_client_read" ON public.session_records FOR SELECT TO authenticated
  USING (visible_to_client AND EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_id AND p.client_user_id = auth.uid()));

-- ============= CONSENT TEMPLATES & SIGNED =============
CREATE TABLE public.consent_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  version INT NOT NULL DEFAULT 1,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consent_templates TO authenticated;
GRANT ALL ON public.consent_templates TO service_role;
ALTER TABLE public.consent_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "consent_tpl_clinic" ON public.consent_templates FOR ALL TO authenticated
  USING (public.is_clinic_member(clinic_id, auth.uid()))
  WITH CHECK (public.is_clinic_member(clinic_id, auth.uid()));

CREATE TABLE public.signed_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.consent_templates(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  status public.consent_status NOT NULL DEFAULT 'pendente',
  signed_at TIMESTAMPTZ,
  signature_name TEXT,
  signature_document TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.signed_consents TO authenticated;
GRANT ALL ON public.signed_consents TO service_role;
ALTER TABLE public.signed_consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "signed_clinic" ON public.signed_consents FOR ALL TO authenticated
  USING (public.is_clinic_member(clinic_id, auth.uid()))
  WITH CHECK (public.is_clinic_member(clinic_id, auth.uid()));
CREATE POLICY "signed_client" ON public.signed_consents FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_id AND p.client_user_id = auth.uid()));
CREATE POLICY "signed_client_update" ON public.signed_consents FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_id AND p.client_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_id AND p.client_user_id = auth.uid()));

-- ============= AI REPORTS =============
CREATE TABLE public.ai_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  report_type public.report_type NOT NULL,
  title TEXT,
  content JSONB NOT NULL,
  visible_to_client BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_reports TO authenticated;
GRANT ALL ON public.ai_reports TO service_role;
ALTER TABLE public.ai_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reports_clinic" ON public.ai_reports FOR ALL TO authenticated
  USING (public.is_clinic_member(clinic_id, auth.uid()))
  WITH CHECK (public.is_clinic_member(clinic_id, auth.uid()));
CREATE POLICY "reports_client_read" ON public.ai_reports FOR SELECT TO authenticated
  USING (visible_to_client AND EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_id AND p.client_user_id = auth.uid()));

-- ============= COPILOT CHAT =============
CREATE TABLE public.ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_chat_messages TO authenticated;
GRANT ALL ON public.ai_chat_messages TO service_role;
ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat_clinic" ON public.ai_chat_messages FOR ALL TO authenticated
  USING (public.is_clinic_member(clinic_id, auth.uid()))
  WITH CHECK (public.is_clinic_member(clinic_id, auth.uid()) AND user_id = auth.uid());

-- ============= TRIGGERS: updated_at + auto-profile + auto-role =============
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_patients_updated BEFORE UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_anamneses_updated BEFORE UPDATE ON public.anamneses FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_plans_updated BEFORE UPDATE ON public.treatment_plans FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_clinics_updated BEFORE UPDATE ON public.clinics FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Auto profile + role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)))
  ON CONFLICT (id) DO NOTHING;
  -- Default role: professional (admins/clients atribuídos pelo seed/admin)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'professional')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
