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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          changed_by: string
          changed_fields: Json | null
          created_at: string
          donor_id: string
          id: string
          metadata: Json | null
        }
        Insert: {
          action: string
          changed_by: string
          changed_fields?: Json | null
          created_at?: string
          donor_id: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          action?: string
          changed_by?: string
          changed_fields?: Json | null
          created_at?: string
          donor_id?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_donor_id_fkey"
            columns: ["donor_id"]
            isOneToOne: false
            referencedRelation: "donors"
            referencedColumns: ["id"]
          },
        ]
      }
      call_transcripts: {
        Row: {
          call_duration_seconds: number | null
          caller_phone: string | null
          created_at: string
          donor_id: string | null
          extracted_data: Json | null
          id: string
          partner_id: string
          retell_call_id: string
          transcript: string
        }
        Insert: {
          call_duration_seconds?: number | null
          caller_phone?: string | null
          created_at?: string
          donor_id?: string | null
          extracted_data?: Json | null
          id?: string
          partner_id: string
          retell_call_id: string
          transcript: string
        }
        Update: {
          call_duration_seconds?: number | null
          caller_phone?: string | null
          created_at?: string
          donor_id?: string | null
          extracted_data?: Json | null
          id?: string
          partner_id?: string
          retell_call_id?: string
          transcript?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_transcripts_donor_id_fkey"
            columns: ["donor_id"]
            isOneToOne: false
            referencedRelation: "donors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_transcripts_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      document_requirements: {
        Row: {
          category: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          is_required: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_required?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_required?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          created_at: string
          document_requirement_id: string | null
          donor_id: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          document_requirement_id?: string | null
          donor_id: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          document_requirement_id?: string | null
          donor_id?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_document_requirement_id_fkey"
            columns: ["document_requirement_id"]
            isOneToOne: false
            referencedRelation: "document_requirements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_donor_id_fkey"
            columns: ["donor_id"]
            isOneToOne: false
            referencedRelation: "donors"
            referencedColumns: ["id"]
          },
        ]
      }
      donors: {
        Row: {
          ai_aorto_iliac: boolean | null
          blood_type: string | null
          call_type: string | null
          caller_name: string | null
          cause_of_death: string | null
          clinical_course: string | null
          consent_obtained: boolean | null
          courier_update: string | null
          created_at: string
          date_of_birth: string | null
          death_date: string | null
          death_timezone: string | null
          death_type: string | null
          din: string | null
          donor_accepted: string | null
          donor_age: number | null
          donor_code: string | null
          external_donor_id: string | null
          first_name: string | null
          fm_femoral: boolean | null
          gender: string | null
          has_autopsy: boolean | null
          height_inches: number | null
          high_risk_notes: string | null
          hv_heart_valves: boolean | null
          hv_pathology_request: string | null
          id: string
          intake_method: string | null
          is_prescreen_update: boolean | null
          last_name: string | null
          medical_history: string | null
          medical_history_reviewed: boolean | null
          partner_id: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["donor_status"]
          submitted_at: string | null
          sv_saphenous_vein: boolean | null
          time_of_death: string | null
          tissue_condition: string | null
          tissue_type: string | null
          updated_at: string
          weight_kgs: number | null
        }
        Insert: {
          ai_aorto_iliac?: boolean | null
          blood_type?: string | null
          call_type?: string | null
          caller_name?: string | null
          cause_of_death?: string | null
          clinical_course?: string | null
          consent_obtained?: boolean | null
          courier_update?: string | null
          created_at?: string
          date_of_birth?: string | null
          death_date?: string | null
          death_timezone?: string | null
          death_type?: string | null
          din?: string | null
          donor_accepted?: string | null
          donor_age?: number | null
          donor_code?: string | null
          external_donor_id?: string | null
          first_name?: string | null
          fm_femoral?: boolean | null
          gender?: string | null
          has_autopsy?: boolean | null
          height_inches?: number | null
          high_risk_notes?: string | null
          hv_heart_valves?: boolean | null
          hv_pathology_request?: string | null
          id?: string
          intake_method?: string | null
          is_prescreen_update?: boolean | null
          last_name?: string | null
          medical_history?: string | null
          medical_history_reviewed?: boolean | null
          partner_id?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["donor_status"]
          submitted_at?: string | null
          sv_saphenous_vein?: boolean | null
          time_of_death?: string | null
          tissue_condition?: string | null
          tissue_type?: string | null
          updated_at?: string
          weight_kgs?: number | null
        }
        Update: {
          ai_aorto_iliac?: boolean | null
          blood_type?: string | null
          call_type?: string | null
          caller_name?: string | null
          cause_of_death?: string | null
          clinical_course?: string | null
          consent_obtained?: boolean | null
          courier_update?: string | null
          created_at?: string
          date_of_birth?: string | null
          death_date?: string | null
          death_timezone?: string | null
          death_type?: string | null
          din?: string | null
          donor_accepted?: string | null
          donor_age?: number | null
          donor_code?: string | null
          external_donor_id?: string | null
          first_name?: string | null
          fm_femoral?: boolean | null
          gender?: string | null
          has_autopsy?: boolean | null
          height_inches?: number | null
          high_risk_notes?: string | null
          hv_heart_valves?: boolean | null
          hv_pathology_request?: string | null
          id?: string
          intake_method?: string | null
          is_prescreen_update?: boolean | null
          last_name?: string | null
          medical_history?: string | null
          medical_history_reviewed?: boolean | null
          partner_id?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["donor_status"]
          submitted_at?: string | null
          sv_saphenous_vein?: boolean | null
          time_of_death?: string | null
          tissue_condition?: string | null
          tissue_type?: string | null
          updated_at?: string
          weight_kgs?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "donors_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      heart_request_forms: {
        Row: {
          circumstances_of_death: string | null
          consented_for_research: boolean | null
          created_at: string
          donor_id: string
          form_completed_by: string | null
          form_completed_date: string | null
          height_method: string | null
          histologic_slides_requested: boolean | null
          id: string
          me_address: string | null
          me_city_state_zip: string | null
          me_coroner_name: string | null
          me_institution: string | null
          me_telephone: string | null
          request_type: string
          return_heart: boolean | null
          tissue_recovery_id: string | null
          updated_at: string
          weight_method: string | null
        }
        Insert: {
          circumstances_of_death?: string | null
          consented_for_research?: boolean | null
          created_at?: string
          donor_id: string
          form_completed_by?: string | null
          form_completed_date?: string | null
          height_method?: string | null
          histologic_slides_requested?: boolean | null
          id?: string
          me_address?: string | null
          me_city_state_zip?: string | null
          me_coroner_name?: string | null
          me_institution?: string | null
          me_telephone?: string | null
          request_type?: string
          return_heart?: boolean | null
          tissue_recovery_id?: string | null
          updated_at?: string
          weight_method?: string | null
        }
        Update: {
          circumstances_of_death?: string | null
          consented_for_research?: boolean | null
          created_at?: string
          donor_id?: string
          form_completed_by?: string | null
          form_completed_date?: string | null
          height_method?: string | null
          histologic_slides_requested?: boolean | null
          id?: string
          me_address?: string | null
          me_city_state_zip?: string | null
          me_coroner_name?: string | null
          me_institution?: string | null
          me_telephone?: string | null
          request_type?: string
          return_heart?: boolean | null
          tissue_recovery_id?: string | null
          updated_at?: string
          weight_method?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "heart_request_forms_donor_id_fkey"
            columns: ["donor_id"]
            isOneToOne: true
            referencedRelation: "donors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "heart_request_forms_tissue_recovery_id_fkey"
            columns: ["tissue_recovery_id"]
            isOneToOne: false
            referencedRelation: "tissue_recoveries"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          donor_id: string | null
          id: string
          message: string
          read: boolean | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          donor_id?: string | null
          id?: string
          message: string
          read?: boolean | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          donor_id?: string | null
          id?: string
          message?: string
          read?: boolean | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_donor_id_fkey"
            columns: ["donor_id"]
            isOneToOne: false
            referencedRelation: "donors"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          address: string | null
          contact_phone: string | null
          created_at: string
          id: string
          is_active: boolean
          organization_name: string
          slug: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          organization_name: string
          slug: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          organization_name?: string
          slug?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pending_donor_updates: {
        Row: {
          call_transcript_id: string | null
          created_at: string
          donor_id: string
          id: string
          proposed_changes: Json
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          call_transcript_id?: string | null
          created_at?: string
          donor_id: string
          id?: string
          proposed_changes: Json
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string
          status?: string
          updated_at?: string
        }
        Update: {
          call_transcript_id?: string | null
          created_at?: string
          donor_id?: string
          id?: string
          proposed_changes?: Json
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_donor_updates_call_transcript_id_fkey"
            columns: ["call_transcript_id"]
            isOneToOne: false
            referencedRelation: "call_transcripts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_donor_updates_donor_id_fkey"
            columns: ["donor_id"]
            isOneToOne: false
            referencedRelation: "donors"
            referencedColumns: ["id"]
          },
        ]
      }
      plasma_dilution_worksheets: {
        Row: {
          blood_products: Json
          blood_volume: number | null
          bsa_value: number | null
          colloids: Json
          created_at: string
          crystalloids: Json
          death_type: string | null
          donor_id: string
          id: string
          is_sample_acceptable: boolean | null
          plasma_volume: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          sample_datetime: string | null
          sample_type: string | null
          updated_at: string
        }
        Insert: {
          blood_products?: Json
          blood_volume?: number | null
          bsa_value?: number | null
          colloids?: Json
          created_at?: string
          crystalloids?: Json
          death_type?: string | null
          donor_id: string
          id?: string
          is_sample_acceptable?: boolean | null
          plasma_volume?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sample_datetime?: string | null
          sample_type?: string | null
          updated_at?: string
        }
        Update: {
          blood_products?: Json
          blood_volume?: number | null
          bsa_value?: number | null
          colloids?: Json
          created_at?: string
          crystalloids?: Json
          death_type?: string | null
          donor_id?: string
          id?: string
          is_sample_acceptable?: boolean | null
          plasma_volume?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sample_datetime?: string | null
          sample_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plasma_dilution_worksheets_donor_id_fkey"
            columns: ["donor_id"]
            isOneToOne: true
            referencedRelation: "donors"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recovered_tissues: {
        Row: {
          created_at: string
          id: string
          recovery_technician: string | null
          timestamp_value: string | null
          tissue_category: string
          tissue_recovery_id: string
          tissue_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          recovery_technician?: string | null
          timestamp_value?: string | null
          tissue_category: string
          tissue_recovery_id: string
          tissue_type: string
        }
        Update: {
          created_at?: string
          id?: string
          recovery_technician?: string | null
          timestamp_value?: string | null
          tissue_category?: string
          tissue_recovery_id?: string
          tissue_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "recovered_tissues_tissue_recovery_id_fkey"
            columns: ["tissue_recovery_id"]
            isOneToOne: false
            referencedRelation: "tissue_recoveries"
            referencedColumns: ["id"]
          },
        ]
      }
      screening_guidelines: {
        Row: {
          category: string
          content: string
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      screening_results: {
        Row: {
          concerns: Json
          confidence: number
          created_at: string
          donor_id: string
          guidelines_snapshot: Json
          id: string
          missing_data: Json
          model_used: string
          reasoning: string
          verdict: string
        }
        Insert: {
          concerns?: Json
          confidence?: number
          created_at?: string
          donor_id: string
          guidelines_snapshot?: Json
          id?: string
          missing_data?: Json
          model_used?: string
          reasoning?: string
          verdict: string
        }
        Update: {
          concerns?: Json
          confidence?: number
          created_at?: string
          donor_id?: string
          guidelines_snapshot?: Json
          id?: string
          missing_data?: Json
          model_used?: string
          reasoning?: string
          verdict?: string
        }
        Relationships: [
          {
            foreignKeyName: "screening_results_donor_id_fkey"
            columns: ["donor_id"]
            isOneToOne: false
            referencedRelation: "donors"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          carrier: string | null
          created_at: string
          created_by: string
          donor_id: string
          id: string
          notes: string | null
          status: string
          tracking_number: string
        }
        Insert: {
          carrier?: string | null
          created_at?: string
          created_by: string
          donor_id: string
          id?: string
          notes?: string | null
          status?: string
          tracking_number: string
        }
        Update: {
          carrier?: string | null
          created_at?: string
          created_by?: string
          donor_id?: string
          id?: string
          notes?: string | null
          status?: string
          tracking_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipments_donor_id_fkey"
            columns: ["donor_id"]
            isOneToOne: false
            referencedRelation: "donors"
            referencedColumns: ["id"]
          },
        ]
      }
      tissue_recoveries: {
        Row: {
          consent_delivery_method: string | null
          created_at: string
          donor_id: string
          form_completed_by: string | null
          heart_request_form_completed: boolean | null
          heart_request_needed: boolean | null
          id: string
          lemaitre_donor_number: string | null
          packaging_deviation: boolean | null
          packaging_notes: string | null
          updated_at: string
        }
        Insert: {
          consent_delivery_method?: string | null
          created_at?: string
          donor_id: string
          form_completed_by?: string | null
          heart_request_form_completed?: boolean | null
          heart_request_needed?: boolean | null
          id?: string
          lemaitre_donor_number?: string | null
          packaging_deviation?: boolean | null
          packaging_notes?: string | null
          updated_at?: string
        }
        Update: {
          consent_delivery_method?: string | null
          created_at?: string
          donor_id?: string
          form_completed_by?: string | null
          heart_request_form_completed?: boolean | null
          heart_request_needed?: boolean | null
          id?: string
          lemaitre_donor_number?: string | null
          packaging_deviation?: boolean | null
          packaging_notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tissue_recoveries_donor_id_fkey"
            columns: ["donor_id"]
            isOneToOne: true
            referencedRelation: "donors"
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "partner"
      donor_status:
        | "draft"
        | "submitted"
        | "under_review"
        | "approved"
        | "rejected"
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
      app_role: ["admin", "partner"],
      donor_status: [
        "draft",
        "submitted",
        "under_review",
        "approved",
        "rejected",
      ],
    },
  },
} as const
