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
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      beats: {
        Row: {
          bpm: number | null
          capa_path: string | null
          capa_url: string | null
          created_at: string
          descricao: string | null
          genero: string | null
          id: string
          mood: string | null
          nome: string
          plays_count: number
          preco: number | null
          preview_path: string | null
          preview_url: string | null
          produtora_id: string
          slug: string
          status: Database["public"]["Enums"]["beat_status"]
          stems_url: string | null
          tom: string | null
          updated_at: string
          wav_url: string | null
        }
        Insert: {
          bpm?: number | null
          capa_path?: string | null
          capa_url?: string | null
          created_at?: string
          descricao?: string | null
          genero?: string | null
          id?: string
          mood?: string | null
          nome: string
          plays_count?: number
          preco?: number | null
          preview_path?: string | null
          preview_url?: string | null
          produtora_id: string
          slug: string
          status?: Database["public"]["Enums"]["beat_status"]
          stems_url?: string | null
          tom?: string | null
          updated_at?: string
          wav_url?: string | null
        }
        Update: {
          bpm?: number | null
          capa_path?: string | null
          capa_url?: string | null
          created_at?: string
          descricao?: string | null
          genero?: string | null
          id?: string
          mood?: string | null
          nome?: string
          plays_count?: number
          preco?: number | null
          preview_path?: string | null
          preview_url?: string | null
          produtora_id?: string
          slug?: string
          status?: Database["public"]["Enums"]["beat_status"]
          stems_url?: string | null
          tom?: string | null
          updated_at?: string
          wav_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "beats_produtora_id_fkey"
            columns: ["produtora_id"]
            isOneToOne: false
            referencedRelation: "producers"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          beat_id: string
          created_at: string
          email: string
          id: string
          instagram: string | null
          mensagem: string | null
          nome: string
          status: Database["public"]["Enums"]["lead_status"]
          telefone: string
          updated_at: string
        }
        Insert: {
          beat_id: string
          created_at?: string
          email: string
          id?: string
          instagram?: string | null
          mensagem?: string | null
          nome: string
          status?: Database["public"]["Enums"]["lead_status"]
          telefone: string
          updated_at?: string
        }
        Update: {
          beat_id?: string
          created_at?: string
          email?: string
          id?: string
          instagram?: string | null
          mensagem?: string | null
          nome?: string
          status?: Database["public"]["Enums"]["lead_status"]
          telefone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_beat_id_fkey"
            columns: ["beat_id"]
            isOneToOne: false
            referencedRelation: "beats"
            referencedColumns: ["id"]
          },
        ]
      }
      producers: {
        Row: {
          bio: string | null
          cidade: string | null
          created_at: string
          foto_perfil_path: string | null
          foto_perfil_url: string | null
          id: string
          instagram: string | null
          nome_artistico: string
          slug: string
          spotify: string | null
          status: Database["public"]["Enums"]["producer_status"]
          updated_at: string
        }
        Insert: {
          bio?: string | null
          cidade?: string | null
          created_at?: string
          foto_perfil_path?: string | null
          foto_perfil_url?: string | null
          id?: string
          instagram?: string | null
          nome_artistico: string
          slug: string
          spotify?: string | null
          status?: Database["public"]["Enums"]["producer_status"]
          updated_at?: string
        }
        Update: {
          bio?: string | null
          cidade?: string | null
          created_at?: string
          foto_perfil_path?: string | null
          foto_perfil_url?: string | null
          id?: string
          instagram?: string | null
          nome_artistico?: string
          slug?: string
          spotify?: string | null
          status?: Database["public"]["Enums"]["producer_status"]
          updated_at?: string
        }
        Relationships: []
      }
      purchase_requests: {
        Row: {
          admin_notes: string | null
          beat_id: string
          continuation_token: string
          created_at: string
          email: string
          forma_pagamento: Database["public"]["Enums"]["purchase_payment_method"]
          id: string
          instagram: string | null
          nome_cliente: string
          receipt_path: string | null
          receipt_uploaded_at: string | null
          status: Database["public"]["Enums"]["purchase_status"]
          termos_aceitos: boolean
          updated_at: string
          valor: number | null
          whatsapp: string
        }
        Insert: {
          admin_notes?: string | null
          beat_id: string
          continuation_token?: string
          created_at?: string
          email: string
          forma_pagamento: Database["public"]["Enums"]["purchase_payment_method"]
          id?: string
          instagram?: string | null
          nome_cliente: string
          receipt_path?: string | null
          receipt_uploaded_at?: string | null
          status?: Database["public"]["Enums"]["purchase_status"]
          termos_aceitos?: boolean
          updated_at?: string
          valor?: number | null
          whatsapp: string
        }
        Update: {
          admin_notes?: string | null
          beat_id?: string
          continuation_token?: string
          created_at?: string
          email?: string
          forma_pagamento?: Database["public"]["Enums"]["purchase_payment_method"]
          id?: string
          instagram?: string | null
          nome_cliente?: string
          receipt_path?: string | null
          receipt_uploaded_at?: string | null
          status?: Database["public"]["Enums"]["purchase_status"]
          termos_aceitos?: boolean
          updated_at?: string
          valor?: number | null
          whatsapp?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_requests_beat_id_fkey"
            columns: ["beat_id"]
            isOneToOne: false
            referencedRelation: "beats"
            referencedColumns: ["id"]
          },
        ]
      }
      release_audio_files: {
        Row: {
          created_at: string
          format: Database["public"]["Enums"]["release_audio_format"]
          id: string
          order_index: number
          original_name: string
          path: string
          release_id: string
          size_bytes: number
        }
        Insert: {
          created_at?: string
          format: Database["public"]["Enums"]["release_audio_format"]
          id?: string
          order_index?: number
          original_name: string
          path: string
          release_id: string
          size_bytes: number
        }
        Update: {
          created_at?: string
          format?: Database["public"]["Enums"]["release_audio_format"]
          id?: string
          order_index?: number
          original_name?: string
          path?: string
          release_id?: string
          size_bytes?: number
        }
        Relationships: [
          {
            foreignKeyName: "release_audio_files_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
        ]
      }
      release_promo_photos: {
        Row: {
          created_at: string
          id: string
          order_index: number
          path: string
          release_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_index?: number
          path: string
          release_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_index?: number
          path?: string
          release_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "release_promo_photos_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
        ]
      }
      releases: {
        Row: {
          about_artist: string
          about_release: string
          artist_name: string
          audio_drive_url: string | null
          cover_drive_url: string | null
          cover_path: string | null
          cpf: string
          created_at: string
          email: string
          full_name: string
          genres: string[]
          has_videoclip: boolean
          id: string
          instruments: string[]
          isrc: string | null
          lyrics: string | null
          lyrics_drive_url: string | null
          moods: string[]
          photos_drive_url: string | null
          release_name: string
          release_type: Database["public"]["Enums"]["release_type"]
          royalties: string
          status: Database["public"]["Enums"]["release_status"]
          technical_sheet: string
          tracklist: string | null
          updated_at: string
        }
        Insert: {
          about_artist: string
          about_release: string
          artist_name: string
          audio_drive_url?: string | null
          cover_drive_url?: string | null
          cover_path?: string | null
          cpf: string
          created_at?: string
          email: string
          full_name: string
          genres?: string[]
          has_videoclip?: boolean
          id?: string
          instruments?: string[]
          isrc?: string | null
          lyrics?: string | null
          lyrics_drive_url?: string | null
          moods?: string[]
          photos_drive_url?: string | null
          release_name: string
          release_type: Database["public"]["Enums"]["release_type"]
          royalties: string
          status?: Database["public"]["Enums"]["release_status"]
          technical_sheet: string
          tracklist?: string | null
          updated_at?: string
        }
        Update: {
          about_artist?: string
          about_release?: string
          artist_name?: string
          audio_drive_url?: string | null
          cover_drive_url?: string | null
          cover_path?: string | null
          cpf?: string
          created_at?: string
          email?: string
          full_name?: string
          genres?: string[]
          has_videoclip?: boolean
          id?: string
          instruments?: string[]
          isrc?: string | null
          lyrics?: string | null
          lyrics_drive_url?: string | null
          moods?: string[]
          photos_drive_url?: string | null
          release_name?: string
          release_type?: Database["public"]["Enums"]["release_type"]
          royalties?: string
          status?: Database["public"]["Enums"]["release_status"]
          technical_sheet?: string
          tracklist?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          active: boolean
          created_at: string
          id: string
          is_super: boolean
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          is_super?: boolean
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          is_super?: boolean
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
      increment_beat_plays: { Args: { _beat_id: string }; Returns: number }
      is_admin_active: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin"
      beat_status: "rascunho" | "ativo" | "vendido"
      lead_status:
        | "novo"
        | "contatado"
        | "negociacao"
        | "pago"
        | "entregue"
        | "perdido"
      producer_status: "ativa" | "inativa"
      purchase_payment_method: "pix" | "link"
      purchase_status:
        | "aguardando_pagamento"
        | "comprovante_recebido"
        | "pagamento_confirmado"
        | "arquivos_enviados"
        | "cancelado"
      release_audio_format: "wav" | "mp3"
      release_status: "recebido" | "em_analise" | "aprovado" | "distribuido"
      release_type: "single" | "ep" | "album"
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
      app_role: ["admin"],
      beat_status: ["rascunho", "ativo", "vendido"],
      lead_status: [
        "novo",
        "contatado",
        "negociacao",
        "pago",
        "entregue",
        "perdido",
      ],
      producer_status: ["ativa", "inativa"],
      purchase_payment_method: ["pix", "link"],
      purchase_status: [
        "aguardando_pagamento",
        "comprovante_recebido",
        "pagamento_confirmado",
        "arquivos_enviados",
        "cancelado",
      ],
      release_audio_format: ["wav", "mp3"],
      release_status: ["recebido", "em_analise", "aprovado", "distribuido"],
      release_type: ["single", "ep", "album"],
    },
  },
} as const
