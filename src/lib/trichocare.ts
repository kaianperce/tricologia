import { supabase } from "@/integrations/supabase/client";

export type Patient = {
  id: string;
  clinic_id: string;
  client_user_id: string | null;
  assigned_professional_id: string | null;
  full_name: string;
  birth_date: string | null;
  sex: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  document_id: string | null;
  profession: string | null;
  emergency_contact: string | null;
  origin: string | null;
  crm_status: string;
  tags: string[];
  notes: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type Clinic = {
  id: string;
  name: string;
  legal_id: string | null;
  responsible_name: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  address: string | null;
  logo_url: string | null;
  brand_color: string | null;
  privacy_policy: string | null;
  terms_of_use: string | null;
};

export async function getCurrentClinic(): Promise<Clinic | null> {
  const { data: u } = await supabase.auth.getUser();
  if (!u?.user) return null;
  let { data: member } = await supabase
    .from("clinic_members")
    .select("clinic_id")
    .eq("user_id", u.user.id)
    .maybeSingle();
  if (!member) {
    // Bootstrap: cria automaticamente a primeira clínica e vincula o usuário como admin.
    const defaultName =
      (u.user.user_metadata as any)?.clinic_name ||
      (u.user.user_metadata as any)?.full_name ||
      "Minha clínica";
    const { data: newId, error } = await supabase.rpc("bootstrap_clinic", { _name: defaultName });
    if (error || !newId) return null;
    member = { clinic_id: newId as string };
  }
  const { data: clinic } = await supabase
    .from("clinics")
    .select("*")
    .eq("id", member.clinic_id)
    .maybeSingle();
  return clinic as Clinic | null;
}

export async function getMyRoles(): Promise<string[]> {
  const { data: u } = await supabase.auth.getUser();
  if (!u?.user) return [];
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", u.user.id);
  return (data ?? []).map((r) => r.role as string);
}

export const CRM_STATUS_LABELS: Record<string, string> = {
  novo_lead: "Novo lead",
  avaliacao_agendada: "Avaliação agendada",
  avaliacao_realizada: "Avaliação realizada",
  proposta_enviada: "Proposta enviada",
  tratamento_iniciado: "Tratamento iniciado",
  em_acompanhamento: "Em acompanhamento",
  reavaliacao_necessaria: "Reavaliação necessária",
  tratamento_concluido: "Tratamento concluído",
  retorno_futuro: "Retorno futuro",
  inativo: "Inativo",
};

export const SCALP_REGION_LABELS: Record<string, string> = {
  frontal: "Frontal",
  linha_frontal: "Linha frontal",
  temporal_direita: "Temporal direita",
  temporal_esquerda: "Temporal esquerda",
  parietal_direita: "Parietal direita",
  parietal_esquerda: "Parietal esquerda",
  vertex: "Vertex / coroa",
  occipital: "Occipital / nuca",
  divisao_central: "Divisão central",
  area_falha: "Área de falha",
  sobrancelhas: "Sobrancelhas",
  outra: "Outra",
};
