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
      ai_use_case_latest: {
        Row: {
          brand_id: string
          channels_selected_key: string
          id: string
          industry_normalized: string
          latest_run_id: string
          updated_at: string
        }
        Insert: {
          brand_id: string
          channels_selected_key: string
          id?: string
          industry_normalized: string
          latest_run_id: string
          updated_at?: string
        }
        Update: {
          brand_id?: string
          channels_selected_key?: string
          id?: string
          industry_normalized?: string
          latest_run_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_use_case_latest_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brand_profiles"
            referencedColumns: ["brand_id"]
          },
          {
            foreignKeyName: "ai_use_case_latest_latest_run_id_fkey"
            columns: ["latest_run_id"]
            isOneToOne: false
            referencedRelation: "ai_use_case_runs"
            referencedColumns: ["run_id"]
          },
        ]
      }
      ai_use_case_runs: {
        Row: {
          ai_output_payload: Json
          brand_id: string
          brand_profile_version_id: string | null
          channels_selected: string[]
          created_at: string
          generated_at: string
          hash_key: string
          industry_normalized: string
          internal_resource_version: string | null
          notes: string | null
          output_format: string
          prompt_version: string | null
          run_id: string
          status: string
          website_host_normalized: string
        }
        Insert: {
          ai_output_payload: Json
          brand_id: string
          brand_profile_version_id?: string | null
          channels_selected?: string[]
          created_at?: string
          generated_at?: string
          hash_key: string
          industry_normalized: string
          internal_resource_version?: string | null
          notes?: string | null
          output_format?: string
          prompt_version?: string | null
          run_id?: string
          status?: string
          website_host_normalized: string
        }
        Update: {
          ai_output_payload?: Json
          brand_id?: string
          brand_profile_version_id?: string | null
          channels_selected?: string[]
          created_at?: string
          generated_at?: string
          hash_key?: string
          industry_normalized?: string
          internal_resource_version?: string | null
          notes?: string | null
          output_format?: string
          prompt_version?: string | null
          run_id?: string
          status?: string
          website_host_normalized?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_use_case_runs_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brand_profiles"
            referencedColumns: ["brand_id"]
          },
        ]
      }
      brand_profile_versions: {
        Row: {
          brand_design_profile_json: Json | null
          brand_id: string
          brand_profile_json: Json
          brand_profile_version_id: string
          confidence: string
          created_at: string
          extraction_method: string
          extraction_version: string | null
          generated_at: string
          generated_by_user_id: string | null
          notes: string | null
          source_fingerprint: string | null
          status: string
          website_host_normalized: string
          website_text_blocks: Json | null
          website_url_original: string | null
        }
        Insert: {
          brand_design_profile_json?: Json | null
          brand_id: string
          brand_profile_json: Json
          brand_profile_version_id?: string
          confidence?: string
          created_at?: string
          extraction_method?: string
          extraction_version?: string | null
          generated_at?: string
          generated_by_user_id?: string | null
          notes?: string | null
          source_fingerprint?: string | null
          status?: string
          website_host_normalized: string
          website_text_blocks?: Json | null
          website_url_original?: string | null
        }
        Update: {
          brand_design_profile_json?: Json | null
          brand_id?: string
          brand_profile_json?: Json
          brand_profile_version_id?: string
          confidence?: string
          created_at?: string
          extraction_method?: string
          extraction_version?: string | null
          generated_at?: string
          generated_by_user_id?: string | null
          notes?: string | null
          source_fingerprint?: string | null
          status?: string
          website_host_normalized?: string
          website_text_blocks?: Json | null
          website_url_original?: string | null
        }
        Relationships: []
      }
      brand_profiles: {
        Row: {
          brand_design_profile_json: Json | null
          brand_id: string
          brand_name: string | null
          brand_profile_json: Json | null
          created_at: string
          event_schema_csv: string | null
          industry_selected: string
          iteration_count: number | null
          latest_brand_profile_version_id: string | null
          profile_completeness_score: number | null
          updated_at: string
          user_properties_csv: string | null
          website_host_normalized: string
          website_url: string | null
        }
        Insert: {
          brand_design_profile_json?: Json | null
          brand_id?: string
          brand_name?: string | null
          brand_profile_json?: Json | null
          created_at?: string
          event_schema_csv?: string | null
          industry_selected: string
          iteration_count?: number | null
          latest_brand_profile_version_id?: string | null
          profile_completeness_score?: number | null
          updated_at?: string
          user_properties_csv?: string | null
          website_host_normalized: string
          website_url?: string | null
        }
        Update: {
          brand_design_profile_json?: Json | null
          brand_id?: string
          brand_name?: string | null
          brand_profile_json?: Json | null
          created_at?: string
          event_schema_csv?: string | null
          industry_selected?: string
          iteration_count?: number | null
          latest_brand_profile_version_id?: string | null
          profile_completeness_score?: number | null
          updated_at?: string
          user_properties_csv?: string | null
          website_host_normalized?: string
          website_url?: string | null
        }
        Relationships: []
      }
      diagnostics_exports: {
        Row: {
          brand_name: string | null
          campaign_csv_path: string | null
          context_text: string | null
          created_at: string
          file_name: string
          file_size_bytes: number | null
          id: string
          industry: string | null
          month_range: string | null
          postmaster_csv_path: string | null
          report_type: string
          source_file_name: string | null
          storage_path: string
          website_host_normalized: string | null
        }
        Insert: {
          brand_name?: string | null
          campaign_csv_path?: string | null
          context_text?: string | null
          created_at?: string
          file_name: string
          file_size_bytes?: number | null
          id?: string
          industry?: string | null
          month_range?: string | null
          postmaster_csv_path?: string | null
          report_type?: string
          source_file_name?: string | null
          storage_path: string
          website_host_normalized?: string | null
        }
        Update: {
          brand_name?: string | null
          campaign_csv_path?: string | null
          context_text?: string | null
          created_at?: string
          file_name?: string
          file_size_bytes?: number | null
          id?: string
          industry?: string | null
          month_range?: string | null
          postmaster_csv_path?: string | null
          report_type?: string
          source_file_name?: string | null
          storage_path?: string
          website_host_normalized?: string | null
        }
        Relationships: []
      }
      resource_files: {
        Row: {
          channels: string[]
          created_at: string
          file_path: string
          id: string
          industries: string[]
          raw_metadata: Json | null
          resource_category: string
          source_name: string
          stages: string[]
          updated_at: string
          use_case_count: number
          version: string | null
        }
        Insert: {
          channels?: string[]
          created_at?: string
          file_path: string
          id?: string
          industries?: string[]
          raw_metadata?: Json | null
          resource_category?: string
          source_name: string
          stages?: string[]
          updated_at?: string
          use_case_count?: number
          version?: string | null
        }
        Update: {
          channels?: string[]
          created_at?: string
          file_path?: string
          id?: string
          industries?: string[]
          raw_metadata?: Json | null
          resource_category?: string
          source_name?: string
          stages?: string[]
          updated_at?: string
          use_case_count?: number
          version?: string | null
        }
        Relationships: []
      }
      resource_library_items: {
        Row: {
          checksum_sha256: string
          created_at: string
          display_name: string
          file_path: string
          framework: string | null
          id: string
          industry: string | null
          is_active: boolean
          last_updated: string | null
          org_id: string | null
          resource_type: string
          schema_version: string | null
          source: string | null
          updated_at: string
          version: string | null
        }
        Insert: {
          checksum_sha256: string
          created_at?: string
          display_name: string
          file_path: string
          framework?: string | null
          id?: string
          industry?: string | null
          is_active?: boolean
          last_updated?: string | null
          org_id?: string | null
          resource_type?: string
          schema_version?: string | null
          source?: string | null
          updated_at?: string
          version?: string | null
        }
        Update: {
          checksum_sha256?: string
          created_at?: string
          display_name?: string
          file_path?: string
          framework?: string | null
          id?: string
          industry?: string | null
          is_active?: boolean
          last_updated?: string | null
          org_id?: string | null
          resource_type?: string
          schema_version?: string | null
          source?: string | null
          updated_at?: string
          version?: string | null
        }
        Relationships: []
      }
      review_resolution_attempts: {
        Row: {
          campaign_fingerprint: string
          campaign_name: string | null
          confidence: number
          created_at: string
          evidence_snapshot: Json
          id: string
          industry: string | null
          margin_over_second: number | null
          reason_codes: string[]
          reason_for_review: string | null
          resolution_status: string
          suggested_use_case_id: string | null
          suggested_use_case_name: string | null
          top_candidates: Json | null
        }
        Insert: {
          campaign_fingerprint: string
          campaign_name?: string | null
          confidence?: number
          created_at?: string
          evidence_snapshot?: Json
          id?: string
          industry?: string | null
          margin_over_second?: number | null
          reason_codes?: string[]
          reason_for_review?: string | null
          resolution_status?: string
          suggested_use_case_id?: string | null
          suggested_use_case_name?: string | null
          top_candidates?: Json | null
        }
        Update: {
          campaign_fingerprint?: string
          campaign_name?: string | null
          confidence?: number
          created_at?: string
          evidence_snapshot?: Json
          id?: string
          industry?: string | null
          margin_over_second?: number | null
          reason_codes?: string[]
          reason_for_review?: string | null
          resolution_status?: string
          suggested_use_case_id?: string | null
          suggested_use_case_name?: string | null
          top_candidates?: Json | null
        }
        Relationships: []
      }
      slide_template_slots: {
        Row: {
          background_filename: string | null
          background_height: number | null
          background_path: string | null
          background_width: number | null
          created_at: string
          file_size_bytes: number | null
          id: string
          position: number
          report_type: string
          slide_type: string
          title: string
          updated_at: string
          uploaded_at: string | null
        }
        Insert: {
          background_filename?: string | null
          background_height?: number | null
          background_path?: string | null
          background_width?: number | null
          created_at?: string
          file_size_bytes?: number | null
          id?: string
          position: number
          report_type?: string
          slide_type?: string
          title: string
          updated_at?: string
          uploaded_at?: string | null
        }
        Update: {
          background_filename?: string | null
          background_height?: number | null
          background_path?: string | null
          background_width?: number | null
          created_at?: string
          file_size_bytes?: number | null
          id?: string
          position?: number
          report_type?: string
          slide_type?: string
          title?: string
          updated_at?: string
          uploaded_at?: string | null
        }
        Relationships: []
      }
      use_case_templates: {
        Row: {
          amp_valid: boolean
          amp_validator_errors: Json | null
          created_at: string
          file_size_bytes: number
          html_content: string
          id: string
          is_active: boolean
          label: string
          thumbnail_url: string | null
          updated_at: string
          usage_count: number
        }
        Insert: {
          amp_valid?: boolean
          amp_validator_errors?: Json | null
          created_at?: string
          file_size_bytes?: number
          html_content: string
          id?: string
          is_active?: boolean
          label: string
          thumbnail_url?: string | null
          updated_at?: string
          usage_count?: number
        }
        Update: {
          amp_valid?: boolean
          amp_validator_errors?: Json | null
          created_at?: string
          file_size_bytes?: number
          html_content?: string
          id?: string
          is_active?: boolean
          label?: string
          thumbnail_url?: string | null
          updated_at?: string
          usage_count?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
