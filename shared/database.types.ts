
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "children": {
                  Row: {
                    "color": string,"created_at": string,"family_id": string,"grade": number,"id": string,"league": number,"name": string,"photo_path": string | null,"position": string,"shirt_number": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "color"?: string,"created_at"?: string,"family_id": string,"grade": number,"id"?: string,"league"?: number,"name": string,"photo_path"?: string | null,"position"?: string,"shirt_number"?: number | null
                  }
                  Update: {
                    "color"?: string,"created_at"?: string,"family_id"?: string,"grade"?: number,"id"?: string,"league"?: number,"name"?: string,"photo_path"?: string | null,"position"?: string,"shirt_number"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "children_family_id_fkey"
      columns: ["family_id"]
isOneToOne: false
      referencedRelation: "families"
      referencedColumns: ["id"]
    }
                  ]
                },"dictation_rounds": {
                  Row: {
                    "checked_at": string | null,"child_id": string,"corrects_round_id": string | null,"created_at": string,"family_id": string,"finished_at": string | null,"id": string,"list_id": string,"read_lines": Json | null,"results": Json | null,"scan_path": string | null,"started_at": string | null,"word_ids": (string)[]
                  }
                  ComputedFields: never
                  Insert: {
                    "checked_at"?: string | null,"child_id": string,"corrects_round_id"?: string | null,"created_at"?: string,"family_id": string,"finished_at"?: string | null,"id"?: string,"list_id": string,"read_lines"?: Json | null,"results"?: Json | null,"scan_path"?: string | null,"started_at"?: string | null,"word_ids": (string)[]
                  }
                  Update: {
                    "checked_at"?: string | null,"child_id"?: string,"corrects_round_id"?: string | null,"created_at"?: string,"family_id"?: string,"finished_at"?: string | null,"id"?: string,"list_id"?: string,"read_lines"?: Json | null,"results"?: Json | null,"scan_path"?: string | null,"started_at"?: string | null,"word_ids"?: (string)[]
                  }
                  Relationships: [
                    {
      foreignKeyName: "dictation_rounds_child_family_fkey"
      columns: ["child_id","family_id"]
isOneToOne: false
      referencedRelation: "children"
      referencedColumns: ["id","family_id"]
    },{
      foreignKeyName: "dictation_rounds_corrects_round_fkey"
      columns: ["corrects_round_id","child_id","list_id"]
isOneToOne: false
      referencedRelation: "dictation_rounds"
      referencedColumns: ["id","child_id","list_id"]
    },{
      foreignKeyName: "dictation_rounds_family_id_fkey"
      columns: ["family_id"]
isOneToOne: false
      referencedRelation: "families"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dictation_rounds_list_family_fkey"
      columns: ["list_id","family_id"]
isOneToOne: false
      referencedRelation: "word_lists"
      referencedColumns: ["id","family_id"]
    }
                  ]
                },"families": {
                  Row: {
                    "created_at": string,"id": string,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"name": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"family_members": {
                  Row: {
                    "created_at": string,"family_id": string,"role": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"family_id": string,"role"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"family_id"?: string,"role"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "family_members_family_id_fkey"
      columns: ["family_id"]
isOneToOne: false
      referencedRelation: "families"
      referencedColumns: ["id"]
    }
                  ]
                },"team_invitations": {
                  Row: {
                    "accepted_at": string | null,"created_at": string,"created_by": string,"email": string,"expires_at": string,"family_id": string,"id": string,"revoked_at": string | null,"token_hash": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_at"?: string | null,"created_at"?: string,"created_by": string,"email": string,"expires_at": string,"family_id": string,"id"?: string,"revoked_at"?: string | null,"token_hash": string
                  }
                  Update: {
                    "accepted_at"?: string | null,"created_at"?: string,"created_by"?: string,"email"?: string,"expires_at"?: string,"family_id"?: string,"id"?: string,"revoked_at"?: string | null,"token_hash"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "team_invitations_family_id_fkey"
      columns: ["family_id"]
isOneToOne: false
      referencedRelation: "families"
      referencedColumns: ["id"]
    }
                  ]
                },"team_security_settings": {
                  Row: {
                    "failed_attempts": number,"family_id": string,"locked_until": string | null,"pin_hash": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "failed_attempts"?: number,"family_id": string,"locked_until"?: string | null,"pin_hash": string,"updated_at"?: string
                  }
                  Update: {
                    "failed_attempts"?: number,"family_id"?: string,"locked_until"?: string | null,"pin_hash"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "team_security_settings_family_id_fkey"
      columns: ["family_id"]
isOneToOne: true
      referencedRelation: "families"
      referencedColumns: ["id"]
    }
                  ]
                },"word_lists": {
                  Row: {
                    "created_at": string,"discipline": string,"family_id": string,"grade_max": number,"grade_min": number,"id": string,"test_date": string | null,"title": string,"words": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"discipline"?: string,"family_id": string,"grade_max"?: number,"grade_min"?: number,"id"?: string,"test_date"?: string | null,"title": string,"words"?: NonNullable<Json>
                  }
                  Update: {
                    "created_at"?: string,"discipline"?: string,"family_id"?: string,"grade_max"?: number,"grade_min"?: number,"id"?: string,"test_date"?: string | null,"title"?: string,"words"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "word_lists_family_id_fkey"
      columns: ["family_id"]
isOneToOne: false
      referencedRelation: "families"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "accept_team_invitation":
{ Args: { "p_token_hash": string }; Returns: string
                           },
"check_team_pin":
{ Args: { "p_candidate_hash": string,"p_family_id": string }; Returns: boolean
                           },
"ensure_family":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"get_team_trainers":
{ Args: Record<PropertyKey, never>; Returns: {
              "email": string,"role": string,"user_id": string
            }[]
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
