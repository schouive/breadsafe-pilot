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
      cold_rooms: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          temp_max: number
          temp_min: number
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          temp_max: number
          temp_min: number
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          temp_max?: number
          temp_min?: number
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      control_records: {
        Row: {
          allergenes_conformes: boolean | null
          allergenes_notes: string | null
          control_point_code: Database["public"]["Enums"]["control_point_code"]
          corps_etranger_detecte: boolean | null
          created_at: string
          dlc_conforme: boolean | null
          dlc_date: string | null
          dlc_notes: string | null
          id: string
          integrite_conforme: boolean | null
          integrite_notes: string | null
          lot_number: string | null
          notes: string | null
          operator_id: string
          photos: string[] | null
          product: string | null
          raw_material_id: string | null
          status: Database["public"]["Enums"]["control_status"]
          supplier: string | null
          temperature: number | null
          temperature_conforme: boolean | null
          timestamp: string
          updated_at: string
        }
        Insert: {
          allergenes_conformes?: boolean | null
          allergenes_notes?: string | null
          control_point_code: Database["public"]["Enums"]["control_point_code"]
          corps_etranger_detecte?: boolean | null
          created_at?: string
          dlc_conforme?: boolean | null
          dlc_date?: string | null
          dlc_notes?: string | null
          id?: string
          integrite_conforme?: boolean | null
          integrite_notes?: string | null
          lot_number?: string | null
          notes?: string | null
          operator_id: string
          photos?: string[] | null
          product?: string | null
          raw_material_id?: string | null
          status?: Database["public"]["Enums"]["control_status"]
          supplier?: string | null
          temperature?: number | null
          temperature_conforme?: boolean | null
          timestamp?: string
          updated_at?: string
        }
        Update: {
          allergenes_conformes?: boolean | null
          allergenes_notes?: string | null
          control_point_code?: Database["public"]["Enums"]["control_point_code"]
          corps_etranger_detecte?: boolean | null
          created_at?: string
          dlc_conforme?: boolean | null
          dlc_date?: string | null
          dlc_notes?: string | null
          id?: string
          integrite_conforme?: boolean | null
          integrite_notes?: string | null
          lot_number?: string | null
          notes?: string | null
          operator_id?: string
          photos?: string[] | null
          product?: string | null
          raw_material_id?: string | null
          status?: Database["public"]["Enums"]["control_status"]
          supplier?: string | null
          temperature?: number | null
          temperature_conforme?: boolean | null
          timestamp?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "control_records_raw_material_id_fkey"
            columns: ["raw_material_id"]
            isOneToOne: false
            referencedRelation: "raw_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      nc_audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          new_values: Json | null
          non_conformity_id: string
          old_values: Json | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_values?: Json | null
          non_conformity_id: string
          old_values?: Json | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_values?: Json | null
          non_conformity_id?: string
          old_values?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nc_audit_logs_non_conformity_id_fkey"
            columns: ["non_conformity_id"]
            isOneToOne: false
            referencedRelation: "non_conformities"
            referencedColumns: ["id"]
          },
        ]
      }
      non_conformities: {
        Row: {
          assigned_to: string | null
          control_point_code: Database["public"]["Enums"]["control_point_code"]
          control_record_id: string
          corrective_action: string | null
          corrective_action_date: string | null
          created_at: string
          description: string
          id: string
          photos: string[] | null
          preventive_action: string | null
          severity: Database["public"]["Enums"]["nc_severity"]
          status: Database["public"]["Enums"]["nc_status"]
          updated_at: string
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          assigned_to?: string | null
          control_point_code: Database["public"]["Enums"]["control_point_code"]
          control_record_id: string
          corrective_action?: string | null
          corrective_action_date?: string | null
          created_at?: string
          description: string
          id?: string
          photos?: string[] | null
          preventive_action?: string | null
          severity?: Database["public"]["Enums"]["nc_severity"]
          status?: Database["public"]["Enums"]["nc_status"]
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          assigned_to?: string | null
          control_point_code?: Database["public"]["Enums"]["control_point_code"]
          control_record_id?: string
          corrective_action?: string | null
          corrective_action_date?: string | null
          created_at?: string
          description?: string
          id?: string
          photos?: string[] | null
          preventive_action?: string | null
          severity?: Database["public"]["Enums"]["nc_severity"]
          status?: Database["public"]["Enums"]["nc_status"]
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "non_conformities_control_record_id_fkey"
            columns: ["control_record_id"]
            isOneToOne: false
            referencedRelation: "control_records"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      raw_materials: {
        Row: {
          allergens: string[] | null
          category: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          requires_cold_storage: boolean
          requires_dlc_check: boolean
          storage_temp_max: number | null
          storage_temp_min: number | null
          supplier_id: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          allergens?: string[] | null
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          requires_cold_storage?: boolean
          requires_dlc_check?: boolean
          storage_temp_max?: number | null
          storage_temp_min?: number | null
          supplier_id: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          allergens?: string[] | null
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          requires_cold_storage?: boolean
          requires_dlc_check?: boolean
          storage_temp_max?: number | null
          storage_temp_min?: number | null
          supplier_id?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "raw_materials_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      storage_temperature_records: {
        Row: {
          cold_room_id: string
          created_at: string
          id: string
          is_conforme: boolean
          notes: string | null
          operator_id: string
          recorded_at: string
          temperature: number
        }
        Insert: {
          cold_room_id: string
          created_at?: string
          id?: string
          is_conforme: boolean
          notes?: string | null
          operator_id: string
          recorded_at?: string
          temperature: number
        }
        Update: {
          cold_room_id?: string
          created_at?: string
          id?: string
          is_conforme?: boolean
          notes?: string | null
          operator_id?: string
          recorded_at?: string
          temperature?: number
        }
        Relationships: [
          {
            foreignKeyName: "storage_temperature_records_cold_room_id_fkey"
            columns: ["cold_room_id"]
            isOneToOne: false
            referencedRelation: "cold_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      app_role: "operator" | "quality_assistant" | "admin"
      control_point_code:
        | "CP_RECEPTION"
        | "CP5_CORPS_ETRANGER"
        | "CP6_STOCKAGE_POSITIF"
        | "CP7_STOCKAGE_NEGATIF"
        | "CP8_DLC_PERIMEE"
        | "CP_STOCKAGE"
        | "CP_PRODUCTION"
      control_status: "conforme" | "acceptable" | "nonconforme" | "pending"
      nc_severity: "minor" | "major" | "critical"
      nc_status: "open" | "in_progress" | "resolved" | "validated"
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
      app_role: ["operator", "quality_assistant", "admin"],
      control_point_code: [
        "CP_RECEPTION",
        "CP5_CORPS_ETRANGER",
        "CP6_STOCKAGE_POSITIF",
        "CP7_STOCKAGE_NEGATIF",
        "CP8_DLC_PERIMEE",
        "CP_STOCKAGE",
        "CP_PRODUCTION",
      ],
      control_status: ["conforme", "acceptable", "nonconforme", "pending"],
      nc_severity: ["minor", "major", "critical"],
      nc_status: ["open", "in_progress", "resolved", "validated"],
    },
  },
} as const
