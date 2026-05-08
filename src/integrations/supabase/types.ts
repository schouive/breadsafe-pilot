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
      allergens: {
        Row: {
          code: string
          created_at: string
          id: string
          label: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          label: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          label?: string
        }
        Relationships: []
      }
      article_templates: {
        Row: {
          created_at: string
          erp_article_id: string
          id: string
          template_id: string
        }
        Insert: {
          created_at?: string
          erp_article_id: string
          id?: string
          template_id: string
        }
        Update: {
          created_at?: string
          erp_article_id?: string
          id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_templates_erp_article_id_fkey"
            columns: ["erp_article_id"]
            isOneToOne: false
            referencedRelation: "erp_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_templates_erp_article_id_fkey"
            columns: ["erp_article_id"]
            isOneToOne: false
            referencedRelation: "product_label_view"
            referencedColumns: ["erp_article_id"]
          },
          {
            foreignKeyName: "article_templates_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "label_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_templates_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "product_label_view"
            referencedColumns: ["template_id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      carton_labels: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          label_title: string
          product_sheet_id: string
          snapshot_allergens_secondary: Json | null
          snapshot_created_at: string | null
          snapshot_ingredients_html: string | null
          snapshot_ingredients_html_original: string | null
          snapshot_net_weight: number | null
          snapshot_net_weight_unit: string | null
          snapshot_nutrition: Json | null
          snapshot_product_sheet_version: number | null
          snapshot_storage_instructions: string | null
          snapshot_thawing_instructions: string | null
          status: string
          updated_at: string
          validated_at: string | null
          validated_by: string | null
          validation_comment: string | null
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          label_title: string
          product_sheet_id: string
          snapshot_allergens_secondary?: Json | null
          snapshot_created_at?: string | null
          snapshot_ingredients_html?: string | null
          snapshot_ingredients_html_original?: string | null
          snapshot_net_weight?: number | null
          snapshot_net_weight_unit?: string | null
          snapshot_nutrition?: Json | null
          snapshot_product_sheet_version?: number | null
          snapshot_storage_instructions?: string | null
          snapshot_thawing_instructions?: string | null
          status?: string
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          validation_comment?: string | null
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          label_title?: string
          product_sheet_id?: string
          snapshot_allergens_secondary?: Json | null
          snapshot_created_at?: string | null
          snapshot_ingredients_html?: string | null
          snapshot_ingredients_html_original?: string | null
          snapshot_net_weight?: number | null
          snapshot_net_weight_unit?: string | null
          snapshot_nutrition?: Json | null
          snapshot_product_sheet_version?: number | null
          snapshot_storage_instructions?: string | null
          snapshot_thawing_instructions?: string | null
          status?: string
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          validation_comment?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "carton_labels_product_sheet_id_fkey"
            columns: ["product_sheet_id"]
            isOneToOne: false
            referencedRelation: "product_label_view"
            referencedColumns: ["product_sheet_id"]
          },
          {
            foreignKeyName: "carton_labels_product_sheet_id_fkey"
            columns: ["product_sheet_id"]
            isOneToOne: false
            referencedRelation: "product_sheets"
            referencedColumns: ["id"]
          },
        ]
      }
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
          order_id: string | null
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
          order_id?: string | null
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
          order_id?: string | null
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
            foreignKeyName: "control_records_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "supplier_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "control_records_raw_material_id_fkey"
            columns: ["raw_material_id"]
            isOneToOne: false
            referencedRelation: "raw_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      erp_articles: {
        Row: {
          active: boolean
          barcode_value: string | null
          created_at: string
          erp_code: string
          erp_label: string
          id: string
          packaging_code: string
          product_id: string
          slicing_state: string
          temperature_state: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          barcode_value?: string | null
          created_at?: string
          erp_code: string
          erp_label: string
          id?: string
          packaging_code: string
          product_id: string
          slicing_state: string
          temperature_state: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          barcode_value?: string | null
          created_at?: string
          erp_code?: string
          erp_label?: string
          id?: string
          packaging_code?: string
          product_id?: string
          slicing_state?: string
          temperature_state?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "erp_articles_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_label_view"
            referencedColumns: ["product_master_id"]
          },
          {
            foreignKeyName: "erp_articles_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_master"
            referencedColumns: ["id"]
          },
        ]
      }
      inco_change_logs: {
        Row: {
          action: string
          allergens_removed: string[] | null
          carton_label_id: string | null
          created_at: string
          html_after: string | null
          html_before: string | null
          id: string
          product_sheet_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          allergens_removed?: string[] | null
          carton_label_id?: string | null
          created_at?: string
          html_after?: string | null
          html_before?: string | null
          id?: string
          product_sheet_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          allergens_removed?: string[] | null
          carton_label_id?: string | null
          created_at?: string
          html_after?: string | null
          html_before?: string | null
          id?: string
          product_sheet_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inco_change_logs_carton_label_id_fkey"
            columns: ["carton_label_id"]
            isOneToOne: false
            referencedRelation: "carton_labels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inco_change_logs_product_sheet_id_fkey"
            columns: ["product_sheet_id"]
            isOneToOne: false
            referencedRelation: "product_label_view"
            referencedColumns: ["product_sheet_id"]
          },
          {
            foreignKeyName: "inco_change_logs_product_sheet_id_fkey"
            columns: ["product_sheet_id"]
            isOneToOne: false
            referencedRelation: "product_sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      label_data: {
        Row: {
          carton_format: string | null
          cartons_per_layer: number | null
          cartons_per_pallet: number | null
          commercial_designation: string | null
          created_at: string
          id: string
          net_weight: number | null
          net_weight_unit: string | null
          pieces_per_carton: number | null
          product_image_url: string | null
          product_reference: string | null
          recipe_id: string
          storage_conditions: string | null
          thawing_instructions: string | null
          updated_at: string
          usage_instructions: string | null
        }
        Insert: {
          carton_format?: string | null
          cartons_per_layer?: number | null
          cartons_per_pallet?: number | null
          commercial_designation?: string | null
          created_at?: string
          id?: string
          net_weight?: number | null
          net_weight_unit?: string | null
          pieces_per_carton?: number | null
          product_image_url?: string | null
          product_reference?: string | null
          recipe_id: string
          storage_conditions?: string | null
          thawing_instructions?: string | null
          updated_at?: string
          usage_instructions?: string | null
        }
        Update: {
          carton_format?: string | null
          cartons_per_layer?: number | null
          cartons_per_pallet?: number | null
          commercial_designation?: string | null
          created_at?: string
          id?: string
          net_weight?: number | null
          net_weight_unit?: string | null
          pieces_per_carton?: number | null
          product_image_url?: string | null
          product_reference?: string | null
          recipe_id?: string
          storage_conditions?: string | null
          thawing_instructions?: string | null
          updated_at?: string
          usage_instructions?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "label_data_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: true
            referencedRelation: "product_label_view"
            referencedColumns: ["recipe_id"]
          },
          {
            foreignKeyName: "label_data_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: true
            referencedRelation: "recipe_baker_nutrition"
            referencedColumns: ["recipe_id"]
          },
          {
            foreignKeyName: "label_data_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: true
            referencedRelation: "recipe_nutrition"
            referencedColumns: ["recipe_id"]
          },
          {
            foreignKeyName: "label_data_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: true
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      label_templates: {
        Row: {
          active: boolean
          created_at: string
          id: string
          template_code: string
          template_name: string
          zpl_content: string | null
          zpl_filename: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          template_code: string
          template_name: string
          zpl_content?: string | null
          zpl_filename?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          template_code?: string
          template_name?: string
          zpl_content?: string | null
          zpl_filename?: string | null
        }
        Relationships: []
      }
      metal_detector_audit_logs: {
        Row: {
          action: string
          control_id: string | null
          created_at: string
          deviation_id: string | null
          id: string
          new_values: Json | null
          old_values: Json | null
          user_id: string
        }
        Insert: {
          action: string
          control_id?: string | null
          created_at?: string
          deviation_id?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          user_id: string
        }
        Update: {
          action?: string
          control_id?: string | null
          created_at?: string
          deviation_id?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "metal_detector_audit_logs_control_id_fkey"
            columns: ["control_id"]
            isOneToOne: false
            referencedRelation: "metal_detector_controls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metal_detector_audit_logs_deviation_id_fkey"
            columns: ["deviation_id"]
            isOneToOne: false
            referencedRelation: "metal_detector_deviations"
            referencedColumns: ["id"]
          },
        ]
      }
      metal_detector_controls: {
        Row: {
          calibration_date: string | null
          control_moment: string
          created_at: string
          id: string
          is_validated: boolean
          lot_number: string
          metal_detector_id: string
          notes: string | null
          operator_id: string
          product_reference: string
          production_blocked: boolean
          production_date: string
          production_line: string
          status: string
          supervisor_id: string | null
          test_kit_reference: string | null
          updated_at: string
          validated_at: string | null
        }
        Insert: {
          calibration_date?: string | null
          control_moment: string
          created_at?: string
          id?: string
          is_validated?: boolean
          lot_number: string
          metal_detector_id: string
          notes?: string | null
          operator_id: string
          product_reference: string
          production_blocked?: boolean
          production_date?: string
          production_line: string
          status?: string
          supervisor_id?: string | null
          test_kit_reference?: string | null
          updated_at?: string
          validated_at?: string | null
        }
        Update: {
          calibration_date?: string | null
          control_moment?: string
          created_at?: string
          id?: string
          is_validated?: boolean
          lot_number?: string
          metal_detector_id?: string
          notes?: string | null
          operator_id?: string
          product_reference?: string
          production_blocked?: boolean
          production_date?: string
          production_line?: string
          status?: string
          supervisor_id?: string | null
          test_kit_reference?: string | null
          updated_at?: string
          validated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "metal_detector_controls_metal_detector_id_fkey"
            columns: ["metal_detector_id"]
            isOneToOne: false
            referencedRelation: "metal_detectors"
            referencedColumns: ["id"]
          },
        ]
      }
      metal_detector_deviations: {
        Row: {
          cause_description: string
          control_id: string
          corrective_action: string
          created_at: string
          id: string
          product_decision: string
          release_justification: string | null
          retest_control_id: string | null
          supervisor_id: string
          supervisor_validated: boolean
          supervisor_validated_at: string | null
          updated_at: string
        }
        Insert: {
          cause_description: string
          control_id: string
          corrective_action: string
          created_at?: string
          id?: string
          product_decision: string
          release_justification?: string | null
          retest_control_id?: string | null
          supervisor_id: string
          supervisor_validated?: boolean
          supervisor_validated_at?: string | null
          updated_at?: string
        }
        Update: {
          cause_description?: string
          control_id?: string
          corrective_action?: string
          created_at?: string
          id?: string
          product_decision?: string
          release_justification?: string | null
          retest_control_id?: string | null
          supervisor_id?: string
          supervisor_validated?: boolean
          supervisor_validated_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "metal_detector_deviations_control_id_fkey"
            columns: ["control_id"]
            isOneToOne: false
            referencedRelation: "metal_detector_controls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metal_detector_deviations_retest_control_id_fkey"
            columns: ["retest_control_id"]
            isOneToOne: false
            referencedRelation: "metal_detector_controls"
            referencedColumns: ["id"]
          },
        ]
      }
      metal_detector_settings: {
        Row: {
          check_interval_hours: number
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          check_interval_hours?: number
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          check_interval_hours?: number
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      metal_detector_test_configs: {
        Row: {
          created_at: string
          diameter_mm: number
          id: string
          is_active: boolean
          test_piece_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          diameter_mm: number
          id?: string
          is_active?: boolean
          test_piece_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          diameter_mm?: number
          id?: string
          is_active?: boolean
          test_piece_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      metal_detector_tests: {
        Row: {
          control_id: string
          created_at: string
          diameter_mm: number
          id: string
          result: string
          test_piece_type: string
          tested_at: string
        }
        Insert: {
          control_id: string
          created_at?: string
          diameter_mm: number
          id?: string
          result: string
          test_piece_type: string
          tested_at?: string
        }
        Update: {
          control_id?: string
          created_at?: string
          diameter_mm?: number
          id?: string
          result?: string
          test_piece_type?: string
          tested_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "metal_detector_tests_control_id_fkey"
            columns: ["control_id"]
            isOneToOne: false
            referencedRelation: "metal_detector_controls"
            referencedColumns: ["id"]
          },
        ]
      }
      metal_detectors: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          last_calibration_date: string | null
          name: string
          production_line: string
          serial_number: string | null
          test_kit_reference: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_calibration_date?: string | null
          name: string
          production_line: string
          serial_number?: string | null
          test_kit_reference?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_calibration_date?: string | null
          name?: string
          production_line?: string
          serial_number?: string | null
          test_kit_reference?: string | null
          updated_at?: string
        }
        Relationships: []
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
      nutrition_profiles: {
        Row: {
          carbohydrates: number | null
          created_at: string
          energy_kcal: number | null
          energy_kj: number | null
          fat: number | null
          fiber: number | null
          id: string
          name: string | null
          protein: number | null
          salt: number | null
          saturated_fat: number | null
          sugars: number | null
          updated_at: string
        }
        Insert: {
          carbohydrates?: number | null
          created_at?: string
          energy_kcal?: number | null
          energy_kj?: number | null
          fat?: number | null
          fiber?: number | null
          id?: string
          name?: string | null
          protein?: number | null
          salt?: number | null
          saturated_fat?: number | null
          sugars?: number | null
          updated_at?: string
        }
        Update: {
          carbohydrates?: number | null
          created_at?: string
          energy_kcal?: number | null
          energy_kj?: number | null
          fat?: number | null
          fiber?: number | null
          id?: string
          name?: string | null
          protein?: number | null
          salt?: number | null
          saturated_fat?: number | null
          sugars?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      packaging_types: {
        Row: {
          active: boolean
          code: string
          created_at: string
          id: string
          label: string
          quantity: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          id?: string
          label: string
          quantity?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          id?: string
          label?: string
          quantity?: number
        }
        Relationships: []
      }
      print_favorites: {
        Row: {
          created_at: string
          id: string
          operator_id: string
          product_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          operator_id: string
          product_id: string
        }
        Update: {
          created_at?: string
          id?: string
          operator_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "print_favorites_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "print_products"
            referencedColumns: ["id"]
          },
        ]
      }
      print_history: {
        Row: {
          ddm: string
          final_sku: string
          id: string
          lot_number: string
          old_code: string | null
          operator_id: string
          packaging: string
          printed_at: string
          product_id: string
          quantity: number
          sku_base: string
          slicing: string
          temperature: string
          template_name: string
          variant_id: string | null
        }
        Insert: {
          ddm: string
          final_sku: string
          id?: string
          lot_number: string
          old_code?: string | null
          operator_id: string
          packaging: string
          printed_at?: string
          product_id: string
          quantity: number
          sku_base: string
          slicing: string
          temperature: string
          template_name: string
          variant_id?: string | null
        }
        Update: {
          ddm?: string
          final_sku?: string
          id?: string
          lot_number?: string
          old_code?: string | null
          operator_id?: string
          packaging?: string
          printed_at?: string
          product_id?: string
          quantity?: number
          sku_base?: string
          slicing?: string
          temperature?: string
          template_name?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "print_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "print_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "print_history_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "print_product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      print_product_variants: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          packaging: string
          packaging_id: string | null
          product_id: string
          slicing: string
          temperature: string
          template_id: string | null
          template_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          packaging: string
          packaging_id?: string | null
          product_id: string
          slicing: string
          temperature: string
          template_id?: string | null
          template_name: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          packaging?: string
          packaging_id?: string | null
          product_id?: string
          slicing?: string
          temperature?: string
          template_id?: string | null
          template_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "print_product_variants_packaging_id_fkey"
            columns: ["packaging_id"]
            isOneToOne: false
            referencedRelation: "packaging_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "print_product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "print_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "print_product_variants_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "label_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "print_product_variants_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "product_label_view"
            referencedColumns: ["template_id"]
          },
        ]
      }
      print_products: {
        Row: {
          active: boolean
          created_at: string
          family: string
          family_id: string | null
          id: string
          label: string
          old_code: string | null
          product_sheet_id: string | null
          recipe_id: string | null
          sku_base: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          family: string
          family_id?: string | null
          id?: string
          label: string
          old_code?: string | null
          product_sheet_id?: string | null
          recipe_id?: string | null
          sku_base: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          family?: string
          family_id?: string | null
          id?: string
          label?: string
          old_code?: string | null
          product_sheet_id?: string | null
          recipe_id?: string | null
          sku_base?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "print_products_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "product_families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "print_products_product_sheet_id_fkey"
            columns: ["product_sheet_id"]
            isOneToOne: false
            referencedRelation: "product_label_view"
            referencedColumns: ["product_sheet_id"]
          },
          {
            foreignKeyName: "print_products_product_sheet_id_fkey"
            columns: ["product_sheet_id"]
            isOneToOne: false
            referencedRelation: "product_sheets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "print_products_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "product_label_view"
            referencedColumns: ["recipe_id"]
          },
          {
            foreignKeyName: "print_products_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe_baker_nutrition"
            referencedColumns: ["recipe_id"]
          },
          {
            foreignKeyName: "print_products_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe_nutrition"
            referencedColumns: ["recipe_id"]
          },
          {
            foreignKeyName: "print_products_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      product_families: {
        Row: {
          active: boolean
          code: string
          created_at: string
          id: string
          label: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          id?: string
          label: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          id?: string
          label?: string
        }
        Relationships: []
      }
      product_sheets: {
        Row: {
          allergen_statement: string | null
          barcode: string | null
          brand: string | null
          carton_dimensions: string | null
          carton_weight: number | null
          cartons_per_layer: number | null
          certifications: string[] | null
          created_at: string
          created_by: string | null
          description: string | null
          dlc_ddm_days: number | null
          dlc_ddm_type: string | null
          id: string
          inco_html: string | null
          inco_html_original: string | null
          inco_status: string
          inco_validated_at: string | null
          inco_validated_by: string | null
          inco_validation_comment: string | null
          inco_version: number
          ingredients_declaration: string | null
          is_published: boolean
          layers_per_pallet: number | null
          net_weight: number | null
          net_weight_unit: string | null
          origin_country: string | null
          pieces_per_carton: number | null
          product_image_url: string | null
          product_name: string
          product_reference: string | null
          published_at: string | null
          quality_comment: string | null
          recipe_id: string
          shelf_life_days: number | null
          snapshot_allergens: Json | null
          snapshot_created_at: string | null
          snapshot_ingredients: Json | null
          snapshot_nutrition: Json | null
          snapshot_recipe_code: string | null
          snapshot_recipe_name: string | null
          storage_instructions: string | null
          thawing_instructions: string | null
          updated_at: string
          usage_instructions: string | null
          version: number
        }
        Insert: {
          allergen_statement?: string | null
          barcode?: string | null
          brand?: string | null
          carton_dimensions?: string | null
          carton_weight?: number | null
          cartons_per_layer?: number | null
          certifications?: string[] | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          dlc_ddm_days?: number | null
          dlc_ddm_type?: string | null
          id?: string
          inco_html?: string | null
          inco_html_original?: string | null
          inco_status?: string
          inco_validated_at?: string | null
          inco_validated_by?: string | null
          inco_validation_comment?: string | null
          inco_version?: number
          ingredients_declaration?: string | null
          is_published?: boolean
          layers_per_pallet?: number | null
          net_weight?: number | null
          net_weight_unit?: string | null
          origin_country?: string | null
          pieces_per_carton?: number | null
          product_image_url?: string | null
          product_name: string
          product_reference?: string | null
          published_at?: string | null
          quality_comment?: string | null
          recipe_id: string
          shelf_life_days?: number | null
          snapshot_allergens?: Json | null
          snapshot_created_at?: string | null
          snapshot_ingredients?: Json | null
          snapshot_nutrition?: Json | null
          snapshot_recipe_code?: string | null
          snapshot_recipe_name?: string | null
          storage_instructions?: string | null
          thawing_instructions?: string | null
          updated_at?: string
          usage_instructions?: string | null
          version?: number
        }
        Update: {
          allergen_statement?: string | null
          barcode?: string | null
          brand?: string | null
          carton_dimensions?: string | null
          carton_weight?: number | null
          cartons_per_layer?: number | null
          certifications?: string[] | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          dlc_ddm_days?: number | null
          dlc_ddm_type?: string | null
          id?: string
          inco_html?: string | null
          inco_html_original?: string | null
          inco_status?: string
          inco_validated_at?: string | null
          inco_validated_by?: string | null
          inco_validation_comment?: string | null
          inco_version?: number
          ingredients_declaration?: string | null
          is_published?: boolean
          layers_per_pallet?: number | null
          net_weight?: number | null
          net_weight_unit?: string | null
          origin_country?: string | null
          pieces_per_carton?: number | null
          product_image_url?: string | null
          product_name?: string
          product_reference?: string | null
          published_at?: string | null
          quality_comment?: string | null
          recipe_id?: string
          shelf_life_days?: number | null
          snapshot_allergens?: Json | null
          snapshot_created_at?: string | null
          snapshot_ingredients?: Json | null
          snapshot_nutrition?: Json | null
          snapshot_recipe_code?: string | null
          snapshot_recipe_name?: string | null
          storage_instructions?: string | null
          thawing_instructions?: string | null
          updated_at?: string
          usage_instructions?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_sheets_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "product_label_view"
            referencedColumns: ["recipe_id"]
          },
          {
            foreignKeyName: "product_sheets_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe_baker_nutrition"
            referencedColumns: ["recipe_id"]
          },
          {
            foreignKeyName: "product_sheets_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe_nutrition"
            referencedColumns: ["recipe_id"]
          },
          {
            foreignKeyName: "product_sheets_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      products_master: {
        Row: {
          active: boolean
          created_at: string
          family_id: string | null
          id: string
          label: string
          nutrition_profile_id: string | null
          product_sheet_id: string | null
          recipe_id: string | null
          sku_base: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          family_id?: string | null
          id?: string
          label: string
          nutrition_profile_id?: string | null
          product_sheet_id?: string | null
          recipe_id?: string | null
          sku_base: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          family_id?: string | null
          id?: string
          label?: string
          nutrition_profile_id?: string | null
          product_sheet_id?: string | null
          recipe_id?: string | null
          sku_base?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_master_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "product_families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_master_nutrition_profile_id_fkey"
            columns: ["nutrition_profile_id"]
            isOneToOne: false
            referencedRelation: "nutrition_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_master_product_sheet_id_fkey"
            columns: ["product_sheet_id"]
            isOneToOne: false
            referencedRelation: "product_label_view"
            referencedColumns: ["product_sheet_id"]
          },
          {
            foreignKeyName: "products_master_product_sheet_id_fkey"
            columns: ["product_sheet_id"]
            isOneToOne: false
            referencedRelation: "product_sheets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_master_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "product_label_view"
            referencedColumns: ["recipe_id"]
          },
          {
            foreignKeyName: "products_master_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe_baker_nutrition"
            referencedColumns: ["recipe_id"]
          },
          {
            foreignKeyName: "products_master_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe_nutrition"
            referencedColumns: ["recipe_id"]
          },
          {
            foreignKeyName: "products_master_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          badge_id: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          last_sign_in_at: string | null
          photo_url: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          badge_id?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          is_active?: boolean
          last_sign_in_at?: string | null
          photo_url?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          badge_id?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          last_sign_in_at?: string | null
          photo_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      raw_materials: {
        Row: {
          allergens: string[] | null
          allergens_secondary: string[] | null
          carbohydrates: number | null
          category: string | null
          composition: string | null
          created_at: string
          density: number | null
          description: string | null
          energy_kcal: number | null
          energy_kj: number | null
          fat: number | null
          fds_url: string | null
          fiber: number | null
          id: string
          inco_name: string | null
          internal_comment: string | null
          is_active: boolean
          name: string
          order_unit: string | null
          price: number | null
          price_unit: string | null
          protein: number | null
          purchase_price: number | null
          purchase_unit: string | null
          requires_cold_storage: boolean
          requires_dlc_check: boolean
          salt: number | null
          saturated_fat: number | null
          storage_temp_max: number | null
          storage_temp_min: number | null
          sugars: number | null
          supplier_id: string | null
          supplier_reference: string | null
          type: string | null
          type_produit: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          allergens?: string[] | null
          allergens_secondary?: string[] | null
          carbohydrates?: number | null
          category?: string | null
          composition?: string | null
          created_at?: string
          density?: number | null
          description?: string | null
          energy_kcal?: number | null
          energy_kj?: number | null
          fat?: number | null
          fds_url?: string | null
          fiber?: number | null
          id?: string
          inco_name?: string | null
          internal_comment?: string | null
          is_active?: boolean
          name: string
          order_unit?: string | null
          price?: number | null
          price_unit?: string | null
          protein?: number | null
          purchase_price?: number | null
          purchase_unit?: string | null
          requires_cold_storage?: boolean
          requires_dlc_check?: boolean
          salt?: number | null
          saturated_fat?: number | null
          storage_temp_max?: number | null
          storage_temp_min?: number | null
          sugars?: number | null
          supplier_id?: string | null
          supplier_reference?: string | null
          type?: string | null
          type_produit?: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          allergens?: string[] | null
          allergens_secondary?: string[] | null
          carbohydrates?: number | null
          category?: string | null
          composition?: string | null
          created_at?: string
          density?: number | null
          description?: string | null
          energy_kcal?: number | null
          energy_kj?: number | null
          fat?: number | null
          fds_url?: string | null
          fiber?: number | null
          id?: string
          inco_name?: string | null
          internal_comment?: string | null
          is_active?: boolean
          name?: string
          order_unit?: string | null
          price?: number | null
          price_unit?: string | null
          protein?: number | null
          purchase_price?: number | null
          purchase_unit?: string | null
          requires_cold_storage?: boolean
          requires_dlc_check?: boolean
          salt?: number | null
          saturated_fat?: number | null
          storage_temp_max?: number | null
          storage_temp_min?: number | null
          sugars?: number | null
          supplier_id?: string | null
          supplier_reference?: string | null
          type?: string | null
          type_produit?: string
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
      rd_trial_ingredients: {
        Row: {
          baker_percentage: number | null
          created_at: string
          id: string
          ingredient_name: string
          observations: string | null
          order_index: number
          quantity: number
          raw_material_id: string | null
          trial_id: string
          unit: string
        }
        Insert: {
          baker_percentage?: number | null
          created_at?: string
          id?: string
          ingredient_name: string
          observations?: string | null
          order_index?: number
          quantity?: number
          raw_material_id?: string | null
          trial_id: string
          unit?: string
        }
        Update: {
          baker_percentage?: number | null
          created_at?: string
          id?: string
          ingredient_name?: string
          observations?: string | null
          order_index?: number
          quantity?: number
          raw_material_id?: string | null
          trial_id?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "rd_trial_ingredients_raw_material_id_fkey"
            columns: ["raw_material_id"]
            isOneToOne: false
            referencedRelation: "raw_materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rd_trial_ingredients_trial_id_fkey"
            columns: ["trial_id"]
            isOneToOne: false
            referencedRelation: "rd_trials"
            referencedColumns: ["id"]
          },
        ]
      }
      rd_trial_journal: {
        Row: {
          author_id: string | null
          author_name: string | null
          comment: string
          created_at: string
          entry_time: string
          id: string
          trial_id: string
        }
        Insert: {
          author_id?: string | null
          author_name?: string | null
          comment: string
          created_at?: string
          entry_time?: string
          id?: string
          trial_id: string
        }
        Update: {
          author_id?: string | null
          author_name?: string | null
          comment?: string
          created_at?: string
          entry_time?: string
          id?: string
          trial_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rd_trial_journal_trial_id_fkey"
            columns: ["trial_id"]
            isOneToOne: false
            referencedRelation: "rd_trials"
            referencedColumns: ["id"]
          },
        ]
      }
      rd_trial_rabats: {
        Row: {
          created_at: string
          id: string
          observation: string | null
          order_index: number
          rabat_time: string | null
          rabat_type: string | null
          trial_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          observation?: string | null
          order_index?: number
          rabat_time?: string | null
          rabat_type?: string | null
          trial_id: string
        }
        Update: {
          created_at?: string
          id?: string
          observation?: string | null
          order_index?: number
          rabat_time?: string | null
          rabat_type?: string | null
          trial_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rd_trial_rabats_trial_id_fkey"
            columns: ["trial_id"]
            isOneToOne: false
            referencedRelation: "rd_trials"
            referencedColumns: ["id"]
          },
        ]
      }
      rd_trial_versions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          snapshot: Json
          trial_id: string
          version_number: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          snapshot: Json
          trial_id: string
          version_number: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          snapshot?: Json
          trial_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "rd_trial_versions_trial_id_fkey"
            columns: ["trial_id"]
            isOneToOne: false
            referencedRelation: "rd_trials"
            referencedColumns: ["id"]
          },
        ]
      }
      rd_trials: {
        Row: {
          appret_end: string | null
          appret_humidity: number | null
          appret_observations: string | null
          appret_start: string | null
          appret_temp: number | null
          autolyse_notes: string | null
          bassinage_notes: string | null
          conclusion_corrective: string | null
          conclusion_decision:
            | Database["public"]["Enums"]["rd_trial_decision"]
            | null
          conclusion_gaps: string | null
          conclusion_hypothesis: string | null
          conclusion_result: string | null
          cooking_duration_min: number | null
          cooking_observations: string | null
          cooking_temp: number | null
          created_at: string
          created_by: string | null
          detente_duration_min: number | null
          division_observations: string | null
          division_time: string | null
          eval_alveolage: number | null
          eval_average: number | null
          eval_coloration: number | null
          eval_croustillance: number | null
          eval_gout: number | null
          eval_maniabilite: number | null
          eval_notes: string | null
          eval_tenue: number | null
          eval_volume: number | null
          formulation_notes: string | null
          frasage_notes: string | null
          id: string
          is_archived: boolean
          kneading_observations: string | null
          kneading_total_min: number | null
          mixer_type: string | null
          objective: string | null
          operator_id: string | null
          operator_name: string | null
          oven_type: string | null
          patons_weight: number | null
          pointage_ambient_temp: number | null
          pointage_dough_temp: number | null
          pointage_end: string | null
          pointage_humidity: number | null
          pointage_observations: string | null
          pointage_start: string | null
          product_concerned: string | null
          recipe_id: string | null
          recipe_name_text: string | null
          recipe_version_text: string | null
          speed1_duration_min: number | null
          speed1_value: string | null
          speed2_duration_min: number | null
          speed2_value: string | null
          status: Database["public"]["Enums"]["rd_trial_status"]
          steam: boolean | null
          temp_actual_end_kneading: number | null
          temp_base: number | null
          temp_flour: number | null
          temp_lab: number | null
          temp_target: number | null
          temp_water: number | null
          total_hydration: number | null
          trial_date: string
          trial_name: string
          trial_number: string
          trial_version: number
          updated_at: string
        }
        Insert: {
          appret_end?: string | null
          appret_humidity?: number | null
          appret_observations?: string | null
          appret_start?: string | null
          appret_temp?: number | null
          autolyse_notes?: string | null
          bassinage_notes?: string | null
          conclusion_corrective?: string | null
          conclusion_decision?:
            | Database["public"]["Enums"]["rd_trial_decision"]
            | null
          conclusion_gaps?: string | null
          conclusion_hypothesis?: string | null
          conclusion_result?: string | null
          cooking_duration_min?: number | null
          cooking_observations?: string | null
          cooking_temp?: number | null
          created_at?: string
          created_by?: string | null
          detente_duration_min?: number | null
          division_observations?: string | null
          division_time?: string | null
          eval_alveolage?: number | null
          eval_average?: number | null
          eval_coloration?: number | null
          eval_croustillance?: number | null
          eval_gout?: number | null
          eval_maniabilite?: number | null
          eval_notes?: string | null
          eval_tenue?: number | null
          eval_volume?: number | null
          formulation_notes?: string | null
          frasage_notes?: string | null
          id?: string
          is_archived?: boolean
          kneading_observations?: string | null
          kneading_total_min?: number | null
          mixer_type?: string | null
          objective?: string | null
          operator_id?: string | null
          operator_name?: string | null
          oven_type?: string | null
          patons_weight?: number | null
          pointage_ambient_temp?: number | null
          pointage_dough_temp?: number | null
          pointage_end?: string | null
          pointage_humidity?: number | null
          pointage_observations?: string | null
          pointage_start?: string | null
          product_concerned?: string | null
          recipe_id?: string | null
          recipe_name_text?: string | null
          recipe_version_text?: string | null
          speed1_duration_min?: number | null
          speed1_value?: string | null
          speed2_duration_min?: number | null
          speed2_value?: string | null
          status?: Database["public"]["Enums"]["rd_trial_status"]
          steam?: boolean | null
          temp_actual_end_kneading?: number | null
          temp_base?: number | null
          temp_flour?: number | null
          temp_lab?: number | null
          temp_target?: number | null
          temp_water?: number | null
          total_hydration?: number | null
          trial_date?: string
          trial_name: string
          trial_number?: string
          trial_version?: number
          updated_at?: string
        }
        Update: {
          appret_end?: string | null
          appret_humidity?: number | null
          appret_observations?: string | null
          appret_start?: string | null
          appret_temp?: number | null
          autolyse_notes?: string | null
          bassinage_notes?: string | null
          conclusion_corrective?: string | null
          conclusion_decision?:
            | Database["public"]["Enums"]["rd_trial_decision"]
            | null
          conclusion_gaps?: string | null
          conclusion_hypothesis?: string | null
          conclusion_result?: string | null
          cooking_duration_min?: number | null
          cooking_observations?: string | null
          cooking_temp?: number | null
          created_at?: string
          created_by?: string | null
          detente_duration_min?: number | null
          division_observations?: string | null
          division_time?: string | null
          eval_alveolage?: number | null
          eval_average?: number | null
          eval_coloration?: number | null
          eval_croustillance?: number | null
          eval_gout?: number | null
          eval_maniabilite?: number | null
          eval_notes?: string | null
          eval_tenue?: number | null
          eval_volume?: number | null
          formulation_notes?: string | null
          frasage_notes?: string | null
          id?: string
          is_archived?: boolean
          kneading_observations?: string | null
          kneading_total_min?: number | null
          mixer_type?: string | null
          objective?: string | null
          operator_id?: string | null
          operator_name?: string | null
          oven_type?: string | null
          patons_weight?: number | null
          pointage_ambient_temp?: number | null
          pointage_dough_temp?: number | null
          pointage_end?: string | null
          pointage_humidity?: number | null
          pointage_observations?: string | null
          pointage_start?: string | null
          product_concerned?: string | null
          recipe_id?: string | null
          recipe_name_text?: string | null
          recipe_version_text?: string | null
          speed1_duration_min?: number | null
          speed1_value?: string | null
          speed2_duration_min?: number | null
          speed2_value?: string | null
          status?: Database["public"]["Enums"]["rd_trial_status"]
          steam?: boolean | null
          temp_actual_end_kneading?: number | null
          temp_base?: number | null
          temp_flour?: number | null
          temp_lab?: number | null
          temp_target?: number | null
          temp_water?: number | null
          total_hydration?: number | null
          trial_date?: string
          trial_name?: string
          trial_number?: string
          trial_version?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rd_trials_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "product_label_view"
            referencedColumns: ["recipe_id"]
          },
          {
            foreignKeyName: "rd_trials_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe_baker_nutrition"
            referencedColumns: ["recipe_id"]
          },
          {
            foreignKeyName: "rd_trials_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe_nutrition"
            referencedColumns: ["recipe_id"]
          },
          {
            foreignKeyName: "rd_trials_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_ingredients: {
        Row: {
          baker_percentage: number | null
          created_at: string
          id: string
          ingredient_recipe_id: string | null
          notes: string | null
          order_index: number
          quantity: number
          raw_material_id: string | null
          recipe_id: string
          unit: string
          updated_at: string
        }
        Insert: {
          baker_percentage?: number | null
          created_at?: string
          id?: string
          ingredient_recipe_id?: string | null
          notes?: string | null
          order_index?: number
          quantity: number
          raw_material_id?: string | null
          recipe_id: string
          unit?: string
          updated_at?: string
        }
        Update: {
          baker_percentage?: number | null
          created_at?: string
          id?: string
          ingredient_recipe_id?: string | null
          notes?: string | null
          order_index?: number
          quantity?: number
          raw_material_id?: string | null
          recipe_id?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_ingredient_recipe_id_fkey"
            columns: ["ingredient_recipe_id"]
            isOneToOne: false
            referencedRelation: "product_label_view"
            referencedColumns: ["recipe_id"]
          },
          {
            foreignKeyName: "recipe_ingredients_ingredient_recipe_id_fkey"
            columns: ["ingredient_recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe_baker_nutrition"
            referencedColumns: ["recipe_id"]
          },
          {
            foreignKeyName: "recipe_ingredients_ingredient_recipe_id_fkey"
            columns: ["ingredient_recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe_nutrition"
            referencedColumns: ["recipe_id"]
          },
          {
            foreignKeyName: "recipe_ingredients_ingredient_recipe_id_fkey"
            columns: ["ingredient_recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_raw_material_id_fkey"
            columns: ["raw_material_id"]
            isOneToOne: false
            referencedRelation: "raw_materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "product_label_view"
            referencedColumns: ["recipe_id"]
          },
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe_baker_nutrition"
            referencedColumns: ["recipe_id"]
          },
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe_nutrition"
            referencedColumns: ["recipe_id"]
          },
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          baking_ratio: number | null
          calculation_mode: string
          category: string | null
          code: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          inco_declaration_mode: string | null
          inco_name: string | null
          is_active: boolean
          name: string
          preparation_notes: string | null
          process: string | null
          process_losses: number | null
          recipe_type: string
          reference_flour_id: string | null
          status: string | null
          updated_at: string
          yield_quantity: number
          yield_unit: string
        }
        Insert: {
          baking_ratio?: number | null
          calculation_mode?: string
          category?: string | null
          code?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          inco_declaration_mode?: string | null
          inco_name?: string | null
          is_active?: boolean
          name: string
          preparation_notes?: string | null
          process?: string | null
          process_losses?: number | null
          recipe_type?: string
          reference_flour_id?: string | null
          status?: string | null
          updated_at?: string
          yield_quantity?: number
          yield_unit?: string
        }
        Update: {
          baking_ratio?: number | null
          calculation_mode?: string
          category?: string | null
          code?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          inco_declaration_mode?: string | null
          inco_name?: string | null
          is_active?: boolean
          name?: string
          preparation_notes?: string | null
          process?: string | null
          process_losses?: number | null
          recipe_type?: string
          reference_flour_id?: string | null
          status?: string | null
          updated_at?: string
          yield_quantity?: number
          yield_unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipes_reference_flour_id_fkey"
            columns: ["reference_flour_id"]
            isOneToOne: false
            referencedRelation: "raw_materials"
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
          status: string
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
          status?: string
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
          status?: string
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
      supplier_order_lines: {
        Row: {
          created_at: string
          id: string
          order_id: string
          quantity_ordered: number
          raw_material_id: string
          unit: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          quantity_ordered: number
          raw_material_id: string
          unit?: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          quantity_ordered?: number
          raw_material_id?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_order_lines_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "supplier_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_order_lines_raw_material_id_fkey"
            columns: ["raw_material_id"]
            isOneToOne: false
            referencedRelation: "raw_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_orders: {
        Row: {
          comment: string | null
          created_at: string
          created_by: string
          expected_delivery_date: string | null
          id: string
          order_date: string
          order_number: string
          status: Database["public"]["Enums"]["order_status"]
          supplier_id: string
          updated_at: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          created_by: string
          expected_delivery_date?: string | null
          id?: string
          order_date?: string
          order_number?: string
          status?: Database["public"]["Enums"]["order_status"]
          supplier_id: string
          updated_at?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          created_by?: string
          expected_delivery_date?: string | null
          id?: string
          order_date?: string
          order_number?: string
          status?: Database["public"]["Enums"]["order_status"]
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_reception_lines: {
        Row: {
          created_at: string
          id: string
          order_line_id: string | null
          quantity_received: number
          raw_material_id: string
          reception_id: string
          unit: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_line_id?: string | null
          quantity_received: number
          raw_material_id: string
          reception_id: string
          unit?: string
        }
        Update: {
          created_at?: string
          id?: string
          order_line_id?: string | null
          quantity_received?: number
          raw_material_id?: string
          reception_id?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_reception_lines_order_line_id_fkey"
            columns: ["order_line_id"]
            isOneToOne: false
            referencedRelation: "supplier_order_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_reception_lines_raw_material_id_fkey"
            columns: ["raw_material_id"]
            isOneToOne: false
            referencedRelation: "raw_materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_reception_lines_reception_id_fkey"
            columns: ["reception_id"]
            isOneToOne: false
            referencedRelation: "supplier_receptions"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_receptions: {
        Row: {
          created_at: string
          delivery_note_number: string
          id: string
          notes: string | null
          operator_id: string
          order_id: string | null
          received_at: string
          supplier_id: string
        }
        Insert: {
          created_at?: string
          delivery_note_number: string
          id?: string
          notes?: string | null
          operator_id: string
          order_id?: string | null
          received_at?: string
          supplier_id: string
        }
        Update: {
          created_at?: string
          delivery_note_number?: string
          id?: string
          notes?: string | null
          operator_id?: string
          order_id?: string | null
          received_at?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_receptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "supplier_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_receptions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          client_code: string | null
          contact_name: string | null
          created_at: string
          email: string | null
          email2: string | null
          id: string
          is_active: boolean
          name: string
          order_email: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          client_code?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          email2?: string | null
          id?: string
          is_active?: boolean
          name: string
          order_email?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          client_code?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          email2?: string | null
          id?: string
          is_active?: boolean
          name?: string
          order_email?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      time_corrections: {
        Row: {
          corrected_event_type: string | null
          corrected_recorded_at: string | null
          created_at: string
          id: string
          original_event_type: string
          original_recorded_at: string
          reason: string
          requested_by: string
          review_comment: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          time_entry_id: string
        }
        Insert: {
          corrected_event_type?: string | null
          corrected_recorded_at?: string | null
          created_at?: string
          id?: string
          original_event_type: string
          original_recorded_at: string
          reason: string
          requested_by: string
          review_comment?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          time_entry_id: string
        }
        Update: {
          corrected_event_type?: string | null
          corrected_recorded_at?: string | null
          created_at?: string
          id?: string
          original_event_type?: string
          original_recorded_at?: string
          reason?: string
          requested_by?: string
          review_comment?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          time_entry_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_corrections_time_entry_id_fkey"
            columns: ["time_entry_id"]
            isOneToOne: false
            referencedRelation: "time_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          badge_id: string
          created_at: string
          device_id: string | null
          employee_id: string
          event_type: string
          id: string
          is_manual_correction: boolean
          photo_url: string | null
          recorded_at: string
          scan_speed_ms: number | null
        }
        Insert: {
          badge_id: string
          created_at?: string
          device_id?: string | null
          employee_id: string
          event_type: string
          id?: string
          is_manual_correction?: boolean
          photo_url?: string | null
          recorded_at?: string
          scan_speed_ms?: number | null
        }
        Update: {
          badge_id?: string
          created_at?: string
          device_id?: string | null
          employee_id?: string
          event_type?: string
          id?: string
          is_manual_correction?: boolean
          photo_url?: string | null
          recorded_at?: string
          scan_speed_ms?: number | null
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
      product_label_view: {
        Row: {
          active: boolean | null
          allergen_statement: string | null
          barcode_value: string | null
          carbohydrates: number | null
          energy_kcal: number | null
          energy_kj: number | null
          erp_article_id: string | null
          erp_code: string | null
          erp_label: string | null
          family_code: string | null
          family_label: string | null
          fat: number | null
          fiber: number | null
          inco_html: string | null
          packaging_code: string | null
          product_label: string | null
          product_master_id: string | null
          product_sheet_id: string | null
          protein: number | null
          recipe_id: string | null
          recipe_name: string | null
          salt: number | null
          saturated_fat: number | null
          sku_base: string | null
          slicing_state: string | null
          snapshot_allergens: Json | null
          sugars: number | null
          temperature_state: string | null
          template_code: string | null
          template_id: string | null
          template_name: string | null
          zpl_filename: string | null
        }
        Relationships: []
      }
      profiles_public: {
        Row: {
          avatar_url: string | null
          badge_id: string | null
          full_name: string | null
          id: string | null
          is_active: boolean | null
          photo_url: string | null
        }
        Insert: {
          avatar_url?: string | null
          badge_id?: string | null
          full_name?: string | null
          id?: string | null
          is_active?: boolean | null
          photo_url?: string | null
        }
        Update: {
          avatar_url?: string | null
          badge_id?: string | null
          full_name?: string | null
          id?: string | null
          is_active?: boolean | null
          photo_url?: string | null
        }
        Relationships: []
      }
      recipe_baker_nutrition: {
        Row: {
          baking_ratio: number | null
          process_losses: number | null
          recipe_id: string | null
          recipe_name: string | null
          total_baker_percentage: number | null
          total_carbohydrates: number | null
          total_cost: number | null
          total_energy_kcal: number | null
          total_energy_kj: number | null
          total_fat: number | null
          total_fiber: number | null
          total_flour_percentage: number | null
          total_protein: number | null
          total_salt: number | null
          total_saturated_fat: number | null
          total_sugars: number | null
        }
        Relationships: []
      }
      recipe_nutrition: {
        Row: {
          per_100g_carbohydrates: number | null
          per_100g_energy_kcal: number | null
          per_100g_energy_kj: number | null
          per_100g_fat: number | null
          per_100g_fiber: number | null
          per_100g_protein: number | null
          per_100g_salt: number | null
          per_100g_saturated_fat: number | null
          per_100g_sugars: number | null
          recipe_id: string | null
          recipe_name: string | null
          total_carbohydrates: number | null
          total_energy_kcal: number | null
          total_energy_kj: number | null
          total_fat: number | null
          total_fiber: number | null
          total_protein: number | null
          total_salt: number | null
          total_saturated_fat: number | null
          total_sugars: number | null
          yield_quantity: number | null
          yield_unit: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      generate_order_number: { Args: never; Returns: string }
      generate_rd_trial_number: { Args: never; Returns: string }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "operator"
        | "quality_assistant"
        | "admin"
        | "bureau_methodes"
        | "auditor"
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
      order_status: "draft" | "sent" | "partially_received" | "received"
      rd_trial_decision: "redo" | "adjust" | "validated"
      rd_trial_status:
        | "preparation"
        | "in_progress"
        | "completed"
        | "validated"
        | "abandoned"
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
      app_role: [
        "operator",
        "quality_assistant",
        "admin",
        "bureau_methodes",
        "auditor",
      ],
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
      order_status: ["draft", "sent", "partially_received", "received"],
      rd_trial_decision: ["redo", "adjust", "validated"],
      rd_trial_status: [
        "preparation",
        "in_progress",
        "completed",
        "validated",
        "abandoned",
      ],
    },
  },
} as const
