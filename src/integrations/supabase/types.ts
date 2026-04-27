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
      abastecimentos: {
        Row: {
          condutor_id: string
          created_at: string
          data_abastecimento: string
          id: string
          litros: number
          registrado_por: string | null
          valor_total: number
          viatura_id: string
        }
        Insert: {
          condutor_id: string
          created_at?: string
          data_abastecimento: string
          id?: string
          litros: number
          registrado_por?: string | null
          valor_total: number
          viatura_id: string
        }
        Update: {
          condutor_id?: string
          created_at?: string
          data_abastecimento?: string
          id?: string
          litros?: number
          registrado_por?: string | null
          valor_total?: number
          viatura_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "abastecimentos_condutor_id_fkey"
            columns: ["condutor_id"]
            isOneToOne: false
            referencedRelation: "condutores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abastecimentos_viatura_id_fkey"
            columns: ["viatura_id"]
            isOneToOne: false
            referencedRelation: "viaturas"
            referencedColumns: ["id"]
          },
        ]
      }
      condutores: {
        Row: {
          cpf: string
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          cpf: string
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          cpf?: string
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          nome?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
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
      utilizacoes: {
        Row: {
          condutor_id: string
          created_at: string
          data_retorno: string | null
          data_saida: string
          id: string
          km_final: number | null
          km_inicial: number
          latitude_estacionamento: number | null
          local_estacionamento: string | null
          local_saida: string
          longitude_estacionamento: number | null
          registrado_por: string | null
          viatura_id: string
        }
        Insert: {
          condutor_id: string
          created_at?: string
          data_retorno?: string | null
          data_saida: string
          id?: string
          km_final?: number | null
          km_inicial: number
          latitude_estacionamento?: number | null
          local_estacionamento?: string | null
          local_saida: string
          longitude_estacionamento?: number | null
          registrado_por?: string | null
          viatura_id: string
        }
        Update: {
          condutor_id?: string
          created_at?: string
          data_retorno?: string | null
          data_saida?: string
          id?: string
          km_final?: number | null
          km_inicial?: number
          latitude_estacionamento?: number | null
          local_estacionamento?: string | null
          local_saida?: string
          longitude_estacionamento?: number | null
          registrado_por?: string | null
          viatura_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "utilizacoes_condutor_id_fkey"
            columns: ["condutor_id"]
            isOneToOne: false
            referencedRelation: "condutores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "utilizacoes_viatura_id_fkey"
            columns: ["viatura_id"]
            isOneToOne: false
            referencedRelation: "viaturas"
            referencedColumns: ["id"]
          },
        ]
      }
      viaturas: {
        Row: {
          ativa: boolean
          cor: string
          created_at: string
          id: string
          modelo: string
          placa: string | null
        }
        Insert: {
          ativa?: boolean
          cor: string
          created_at?: string
          id?: string
          modelo: string
          placa?: string | null
        }
        Update: {
          ativa?: boolean
          cor?: string
          created_at?: string
          id?: string
          modelo?: string
          placa?: string | null
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
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
