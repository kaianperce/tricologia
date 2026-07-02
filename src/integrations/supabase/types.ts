export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_chat_messages: {
        Row: {
          clinic_id: string
          content: string
          created_at: string
          id: string
          patient_id: string | null
          role: string
          user_id: string
        }
        Insert: {
          clinic_id: string
          content: string
          created_at?: string
          id?: string
          patient_id?: string | null
          role: string
          user_id: string
        }
        Update: {
          clinic_id?: string
          content?: string
          created_at?: string
          id?: string
          patient_id?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_messages_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_chat_messages_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_reports: {
        Row: {
          clinic_id: string
          content: Json
          created_at: string
          created_by: string | null
          id: string
          patient_id: string
          report_type: Database["public"]["Enums"]["report_type"]
          title: string | null
          visible_to_client: boolean
        }
        Insert: {
          clinic_id: string
          content: Json
          created_at?: string
          created_by?: string | null
          id?: string
          patient_id: string
          report_type: Database["public"]["Enums"]["report_type"]
          title?: string | null
          visible_to_client?: boolean
        }
        Update: {
          clinic_id?: string
          content?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          patient_id?: string
          report_type?: Database["public"]["Enums"]["report_type"]
          title?: string | null
          visible_to_client?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "ai_reports_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_reports_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      anamneses: {
        Row: {
          ai_analysis: Json | null
          clinic_id: string
          completed: boolean
          created_at: string
          current_step: number
          data: Json
          id: string
          patient_id: string
          updated_at: string
          visible_to_client: boolean
        }
        Insert: {
          ai_analysis?: Json | null
          clinic_id: string
          completed?: boolean
          created_at?: string
          current_step?: number
          data?: Json
          id?: string
          patient_id: string
          updated_at?: string
          visible_to_client?: boolean
        }
        Update: {
          ai_analysis?: Json | null
          clinic_id?: string
          completed?: boolean
          created_at?: string
          current_step?: number
          data?: Json
          id?: string
          patient_id?: string
          updated_at?: string
          visible_to_client?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "anamneses_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anamneses_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_members: {
        Row: {
          clinic_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_members_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinics: {
        Row: {
          address: string | null
          brand_color: string | null
          created_at: string
          email: string | null
          id: string
          instagram: string | null
          legal_id: string | null
          logo_url: string | null
          name: string
          phone: string | null
          privacy_policy: string | null
          responsible_name: string | null
          terms_of_use: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          brand_color?: string | null
          created_at?: string
          email?: string | null
          id?: string
          instagram?: string | null
          legal_id?: string | null
          logo_url?: string | null
          name: string
          phone?: string | null
          privacy_policy?: string | null
          responsible_name?: string | null
          terms_of_use?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          brand_color?: string | null
          created_at?: string
          email?: string | null
          id?: string
          instagram?: string | null
          legal_id?: string | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          privacy_policy?: string | null
          responsible_name?: string | null
          terms_of_use?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      consent_templates: {
        Row: {
          body: string
          category: string | null
          clinic_id: string
          created_at: string
          id: string
          title: string
          version: number
        }
        Insert: {
          body: string
          category?: string | null
          clinic_id: string
          created_at?: string
          id?: string
          title: string
          version?: number
        }
        Update: {
          body?: string
          category?: string | null
          clinic_id?: string
          created_at?: string
          id?: string
          title?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "consent_templates_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          assigned_professional_id: string | null
          avatar_url: string | null
          birth_date: string | null
          client_user_id: string | null
          clinic_id: string
          created_at: string
          crm_status: Database["public"]["Enums"]["crm_status"]
          document_id: string | null
          email: string | null
          emergency_contact: string | null
          full_name: string
          id: string
          notes: string | null
          origin: string | null
          phone: string | null
          profession: string | null
          sex: string | null
          tags: string[] | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          assigned_professional_id?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          client_user_id?: string | null
          clinic_id: string
          created_at?: string
          crm_status?: Database["public"]["Enums"]["crm_status"]
          document_id?: string | null
          email?: string | null
          emergency_contact?: string | null
          full_name: string
          id?: string
          notes?: string | null
          origin?: string | null
          phone?: string | null
          profession?: string | null
          sex?: string | null
          tags?: string[] | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          assigned_professional_id?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          client_user_id?: string | null
          clinic_id?: string
          created_at?: string
          crm_status?: Database["public"]["Enums"]["crm_status"]
          document_id?: string | null
          email?: string | null
          emergency_contact?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          origin?: string | null
          phone?: string | null
          profession?: string | null
          sex?: string | null
          tags?: string[] | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patients_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_records: {
        Row: {
          captured_at: string
          clinic_id: string
          created_at: string
          id: string
          notes: string | null
          patient_id: string
          region: Database["public"]["Enums"]["scalp_region"]
          session_id: string | null
          tags: string[] | null
          url: string
          visible_to_client: boolean
        }
        Insert: {
          captured_at?: string
          clinic_id: string
          created_at?: string
          id?: string
          notes?: string | null
          patient_id: string
          region: Database["public"]["Enums"]["scalp_region"]
          session_id?: string | null
          tags?: string[] | null
          url: string
          visible_to_client?: boolean
        }
        Update: {
          captured_at?: string
          clinic_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          patient_id?: string
          region?: Database["public"]["Enums"]["scalp_region"]
          session_id?: string | null
          tags?: string[] | null
          url?: string
          visible_to_client?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "photo_records_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      procedures: {
        Row: {
          clinic_id: string
          created_at: string
          default_duration_min: number | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          default_duration_min?: number | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          default_duration_min?: number | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "procedures_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand: string | null
          category: string | null
          clinic_id: string
          contraindications: string | null
          created_at: string
          id: string
          main_active: string | null
          name: string
          purpose: string | null
          usage_instructions: string | null
          used_at_home: boolean | null
          used_in_cabin: boolean | null
        }
        Insert: {
          brand?: string | null
          category?: string | null
          clinic_id: string
          contraindications?: string | null
          created_at?: string
          id?: string
          main_active?: string | null
          name: string
          purpose?: string | null
          usage_instructions?: string | null
          used_at_home?: boolean | null
          used_in_cabin?: boolean | null
        }
        Update: {
          brand?: string | null
          category?: string | null
          clinic_id?: string
          contraindications?: string | null
          created_at?: string
          id?: string
          main_active?: string | null
          name?: string
          purpose?: string | null
          usage_instructions?: string | null
          used_at_home?: boolean | null
          used_in_cabin?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "products_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      session_records: {
        Row: {
          ai_summary: string | null
          client_response: string | null
          clinic_id: string
          created_at: string
          evolution: string | null
          id: string
          intercurrences: string | null
          internal_notes: string | null
          patient_id: string
          performed_at: string | null
          plan_id: string | null
          post_session_instructions: string | null
          procedures: string[] | null
          products_used: string[] | null
          professional_id: string | null
          region_treated: string | null
          scheduled_at: string | null
          session_number: number
          visible_to_client: boolean
        }
        Insert: {
          ai_summary?: string | null
          client_response?: string | null
          clinic_id: string
          created_at?: string
          evolution?: string | null
          id?: string
          intercurrences?: string | null
          internal_notes?: string | null
          patient_id: string
          performed_at?: string | null
          plan_id?: string | null
          post_session_instructions?: string | null
          procedures?: string[] | null
          products_used?: string[] | null
          professional_id?: string | null
          region_treated?: string | null
          scheduled_at?: string | null
          session_number?: number
          visible_to_client?: boolean
        }
        Update: {
          ai_summary?: string | null
          client_response?: string | null
          clinic_id?: string
          created_at?: string
          evolution?: string | null
          id?: string
          intercurrences?: string | null
          internal_notes?: string | null
          patient_id?: string
          performed_at?: string | null
          plan_id?: string | null
          post_session_instructions?: string | null
          procedures?: string[] | null
          products_used?: string[] | null
          professional_id?: string | null
          region_treated?: string | null
          scheduled_at?: string | null
          session_number?: number
          visible_to_client?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "session_records_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_records_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "treatment_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      signed_consents: {
        Row: {
          body: string
          clinic_id: string
          created_at: string
          id: string
          patient_id: string
          signature_document: string | null
          signature_name: string | null
          signed_at: string | null
          status: Database["public"]["Enums"]["consent_status"]
          template_id: string | null
          title: string
        }
        Insert: {
          body: string
          clinic_id: string
          created_at?: string
          id?: string
          patient_id: string
          signature_document?: string | null
          signature_name?: string | null
          signed_at?: string | null
          status?: Database["public"]["Enums"]["consent_status"]
          template_id?: string | null
          title: string
        }
        Update: {
          body?: string
          clinic_id?: string
          created_at?: string
          id?: string
          patient_id?: string
          signature_document?: string | null
          signature_name?: string | null
          signed_at?: string | null
          status?: Database["public"]["Enums"]["consent_status"]
          template_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "signed_consents_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signed_consents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signed_consents_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "consent_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      treatment_plans: {
        Row: {
          clinic_id: string
          contraindications: string | null
          created_at: string
          home_care: string | null
          hypothesis: string | null
          id: string
          interval_days: number | null
          next_review_date: string | null
          objective: string | null
          patient_id: string
          post_session_instructions: string | null
          pre_session_instructions: string | null
          procedures: string[] | null
          products: string[] | null
          protocol: string | null
          sessions_planned: number | null
          status: Database["public"]["Enums"]["plan_status"]
          updated_at: string
          visible_to_client: boolean
        }
        Insert: {
          clinic_id: string
          contraindications?: string | null
          created_at?: string
          home_care?: string | null
          hypothesis?: string | null
          id?: string
          interval_days?: number | null
          next_review_date?: string | null
          objective?: string | null
          patient_id: string
          post_session_instructions?: string | null
          pre_session_instructions?: string | null
          procedures?: string[] | null
          products?: string[] | null
          protocol?: string | null
          sessions_planned?: number | null
          status?: Database["public"]["Enums"]["plan_status"]
          updated_at?: string
          visible_to_client?: boolean
        }
        Update: {
          clinic_id?: string
          contraindications?: string | null
          created_at?: string
          home_care?: string | null
          hypothesis?: string | null
          id?: string
          interval_days?: number | null
          next_review_date?: string | null
          objective?: string | null
          patient_id?: string
          post_session_instructions?: string | null
          pre_session_instructions?: string | null
          procedures?: string[] | null
          products?: string[] | null
          protocol?: string | null
          sessions_planned?: number | null
          status?: Database["public"]["Enums"]["plan_status"]
          updated_at?: string
          visible_to_client?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "treatment_plans_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plans_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      trichoscopy_records: {
        Row: {
          ai_insight: Json | null
          clinic_id: string
          conclusion: string | null
          created_at: string
          hair_shaft_findings: Json | null
          id: string
          image_urls: string[] | null
          notes: string | null
          patient_id: string
          record_date: string
          scalp_findings: Json | null
        }
        Insert: {
          ai_insight?: Json | null
          clinic_id: string
          conclusion?: string | null
          created_at?: string
          hair_shaft_findings?: Json | null
          id?: string
          image_urls?: string[] | null
          notes?: string | null
          patient_id: string
          record_date?: string
          scalp_findings?: Json | null
        }
        Update: {
          ai_insight?: Json | null
          clinic_id?: string
          conclusion?: string | null
          created_at?: string
          hair_shaft_findings?: Json | null
          id?: string
          image_urls?: string[] | null
          notes?: string | null
          patient_id?: string
          record_date?: string
          scalp_findings?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "trichoscopy_records_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trichoscopy_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bootstrap_clinic: { Args: { _name: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_clinic_member: {
        Args: { _clinic_id: string; _user_id: string }
        Returns: boolean
      }
      user_clinic_id: { Args: { _user_id: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "professional" | "assistant" | "client"
      consent_status: "pendente" | "assinado" | "recusado" | "expirado"
      crm_status:
        | "novo_lead"
        | "avaliacao_agendada"
        | "avaliacao_realizada"
        | "proposta_enviada"
        | "tratamento_iniciado"
        | "em_acompanhamento"
        | "reavaliacao_necessaria"
        | "tratamento_concluido"
        | "retorno_futuro"
        | "inativo"
      plan_status: "rascunho" | "em_andamento" | "pausado" | "concluido"
      report_type: "profissional" | "cliente" | "evolucao"
      scalp_region:
        | "frontal"
        | "linha_frontal"
        | "temporal_direita"
        | "temporal_esquerda"
        | "parietal_direita"
        | "parietal_esquerda"
        | "vertex"
        | "occipital"
        | "divisao_central"
        | "area_falha"
        | "sobrancelhas"
        | "outra"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "professional", "assistant", "client"],
      consent_status: ["pendente", "assinado", "recusado", "expirado"],
      crm_status: [
        "novo_lead",
        "avaliacao_agendada",
        "avaliacao_realizada",
        "proposta_enviada",
        "tratamento_iniciado",
        "em_acompanhamento",
        "reavaliacao_necessaria",
        "tratamento_concluido",
        "retorno_futuro",
        "inativo",
      ],
      plan_status: ["rascunho", "em_andamento", "pausado", "concluido"],
      report_type: ["profissional", "cliente", "evolucao"],
      scalp_region: [
        "frontal",
        "linha_frontal",
        "temporal_direita",
        "temporal_esquerda",
        "parietal_direita",
        "parietal_esquerda",
        "vertex",
        "occipital",
        "divisao_central",
        "area_falha",
        "sobrancelhas",
        "outra",
      ],
    },
  },
} as const
