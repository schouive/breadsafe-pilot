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
          status?: Database["public"]["Enums"]["control_status"]
          supplier?: string | null
          temperature?: number | null
          temperature_conforme?: boolean | null
          timestamp?: string
          updated_at?: string
        }
        Relationships: []
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
      ],
      control_status: ["conforme", "acceptable", "nonconforme", "pending"],
      nc_severity: ["minor", "major", "critical"],
      nc_status: ["open", "in_progress", "resolved", "validated"],
    },
  },
} as const
