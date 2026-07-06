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
      beat_types: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string
          id: string
          inclui_stems: boolean
          link_pagamento: string
          nome: string
          ordem: number
          slug: string
          updated_at: string
          valor_padrao: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string
          id?: string
          inclui_stems?: boolean
          link_pagamento?: string
          nome: string
          ordem?: number
          slug: string
          updated_at?: string
          valor_padrao?: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string
          id?: string
          inclui_stems?: boolean
          link_pagamento?: string
          nome?: string
          ordem?: number
          slug?: string
          updated_at?: string
          valor_padrao?: number
        }
        Relationships: []
      }
      beats: {
        Row: {
          beat_type_id: string | null
          bpm: number | null
          capa_path: string | null
          capa_url: string | null
          created_at: string
          descricao: string | null
          genero: string | null
          id: string
          license_path: string | null
          mood: string | null
          nome: string
          plays_count: number
          preco: number | null
          preview_path: string | null
          preview_url: string | null
          produtora_id: string
          reservation_expires_at: string | null
          reserved_at: string | null
          reserved_purchase_id: string | null
          slug: string
          status: Database["public"]["Enums"]["beat_status"]
          stems_path: string | null
          stems_url: string | null
          tipo: Database["public"]["Enums"]["beat_tipo"]
          tom: string | null
          updated_at: string
          wav_path: string | null
          wav_url: string | null
        }
        Insert: {
          beat_type_id?: string | null
          bpm?: number | null
          capa_path?: string | null
          capa_url?: string | null
          created_at?: string
          descricao?: string | null
          genero?: string | null
          id?: string
          license_path?: string | null
          mood?: string | null
          nome: string
          plays_count?: number
          preco?: number | null
          preview_path?: string | null
          preview_url?: string | null
          produtora_id: string
          reservation_expires_at?: string | null
          reserved_at?: string | null
          reserved_purchase_id?: string | null
          slug: string
          status?: Database["public"]["Enums"]["beat_status"]
          stems_path?: string | null
          stems_url?: string | null
          tipo?: Database["public"]["Enums"]["beat_tipo"]
          tom?: string | null
          updated_at?: string
          wav_path?: string | null
          wav_url?: string | null
        }
        Update: {
          beat_type_id?: string | null
          bpm?: number | null
          capa_path?: string | null
          capa_url?: string | null
          created_at?: string
          descricao?: string | null
          genero?: string | null
          id?: string
          license_path?: string | null
          mood?: string | null
          nome?: string
          plays_count?: number
          preco?: number | null
          preview_path?: string | null
          preview_url?: string | null
          produtora_id?: string
          reservation_expires_at?: string | null
          reserved_at?: string | null
          reserved_purchase_id?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["beat_status"]
          stems_path?: string | null
          stems_url?: string | null
          tipo?: Database["public"]["Enums"]["beat_tipo"]
          tom?: string | null
          updated_at?: string
          wav_path?: string | null
          wav_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "beats_beat_type_id_fkey"
            columns: ["beat_type_id"]
            isOneToOne: false
            referencedRelation: "beat_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beats_produtora_id_fkey"
            columns: ["produtora_id"]
            isOneToOne: false
            referencedRelation: "producers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beats_reserved_purchase_id_fkey"
            columns: ["reserved_purchase_id"]
            isOneToOne: false
            referencedRelation: "purchase_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      feedback: {
        Row: {
          area: Database["public"]["Enums"]["feedback_area"] | null
          contact_email: string | null
          contact_name: string | null
          contact_whatsapp: string | null
          created_at: string
          id: string
          internal_notes: string | null
          message: string
          origin: Database["public"]["Enums"]["feedback_origin"]
          purchase_request_id: string | null
          rating: number | null
          release_id: string | null
          status: Database["public"]["Enums"]["feedback_status"]
          type: Database["public"]["Enums"]["feedback_type"]
          updated_at: string
          user_agent: string | null
          wants_reply: boolean
        }
        Insert: {
          area?: Database["public"]["Enums"]["feedback_area"] | null
          contact_email?: string | null
          contact_name?: string | null
          contact_whatsapp?: string | null
          created_at?: string
          id?: string
          internal_notes?: string | null
          message: string
          origin?: Database["public"]["Enums"]["feedback_origin"]
          purchase_request_id?: string | null
          rating?: number | null
          release_id?: string | null
          status?: Database["public"]["Enums"]["feedback_status"]
          type: Database["public"]["Enums"]["feedback_type"]
          updated_at?: string
          user_agent?: string | null
          wants_reply?: boolean
        }
        Update: {
          area?: Database["public"]["Enums"]["feedback_area"] | null
          contact_email?: string | null
          contact_name?: string | null
          contact_whatsapp?: string | null
          created_at?: string
          id?: string
          internal_notes?: string | null
          message?: string
          origin?: Database["public"]["Enums"]["feedback_origin"]
          purchase_request_id?: string | null
          rating?: number | null
          release_id?: string | null
          status?: Database["public"]["Enums"]["feedback_status"]
          type?: Database["public"]["Enums"]["feedback_type"]
          updated_at?: string
          user_agent?: string | null
          wants_reply?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "feedback_purchase_request_id_fkey"
            columns: ["purchase_request_id"]
            isOneToOne: false
            referencedRelation: "purchase_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
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
          cpf: string | null
          created_at: string
          email_comercial: string | null
          email_royalties: string | null
          foto_perfil_path: string | null
          foto_perfil_url: string | null
          id: string
          instagram: string | null
          nome_artistico: string
          nome_artistico_creditos: string | null
          nome_civil: string | null
          slug: string
          spotify: string | null
          status: Database["public"]["Enums"]["producer_status"]
          texto_creditos: string | null
          texto_registro: string | null
          texto_royalties: string | null
          updated_at: string
        }
        Insert: {
          bio?: string | null
          cidade?: string | null
          cpf?: string | null
          created_at?: string
          email_comercial?: string | null
          email_royalties?: string | null
          foto_perfil_path?: string | null
          foto_perfil_url?: string | null
          id?: string
          instagram?: string | null
          nome_artistico: string
          nome_artistico_creditos?: string | null
          nome_civil?: string | null
          slug: string
          spotify?: string | null
          status?: Database["public"]["Enums"]["producer_status"]
          texto_creditos?: string | null
          texto_registro?: string | null
          texto_royalties?: string | null
          updated_at?: string
        }
        Update: {
          bio?: string | null
          cidade?: string | null
          cpf?: string | null
          created_at?: string
          email_comercial?: string | null
          email_royalties?: string | null
          foto_perfil_path?: string | null
          foto_perfil_url?: string | null
          id?: string
          instagram?: string | null
          nome_artistico?: string
          nome_artistico_creditos?: string | null
          nome_civil?: string | null
          slug?: string
          spotify?: string | null
          status?: Database["public"]["Enums"]["producer_status"]
          texto_creditos?: string | null
          texto_registro?: string | null
          texto_royalties?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      purchase_deliveries: {
        Row: {
          arquivos: Json
          created_at: string
          enviado_em: string
          enviado_email: boolean
          enviado_por: string | null
          enviado_whatsapp: boolean
          id: string
          observacao: string | null
          purchase_id: string
          recipient_email: string | null
          recipient_whatsapp: string | null
          tipo: string
        }
        Insert: {
          arquivos?: Json
          created_at?: string
          enviado_em?: string
          enviado_email?: boolean
          enviado_por?: string | null
          enviado_whatsapp?: boolean
          id?: string
          observacao?: string | null
          purchase_id: string
          recipient_email?: string | null
          recipient_whatsapp?: string | null
          tipo?: string
        }
        Update: {
          arquivos?: Json
          created_at?: string
          enviado_em?: string
          enviado_email?: boolean
          enviado_por?: string | null
          enviado_whatsapp?: boolean
          id?: string
          observacao?: string | null
          purchase_id?: string
          recipient_email?: string | null
          recipient_whatsapp?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_deliveries_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchase_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_requests: {
        Row: {
          admin_notes: string | null
          beat_id: string
          continuation_token: string
          created_at: string
          delivered_at: string | null
          email: string
          forma_pagamento: Database["public"]["Enums"]["purchase_payment_method"]
          id: string
          instagram: string | null
          license_accepted: boolean | null
          license_accepted_at: string | null
          license_snapshot: Json | null
          license_version: string | null
          nome_artistico: string | null
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
          delivered_at?: string | null
          email: string
          forma_pagamento: Database["public"]["Enums"]["purchase_payment_method"]
          id?: string
          instagram?: string | null
          license_accepted?: boolean | null
          license_accepted_at?: string | null
          license_snapshot?: Json | null
          license_version?: string | null
          nome_artistico?: string | null
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
          delivered_at?: string | null
          email?: string
          forma_pagamento?: Database["public"]["Enums"]["purchase_payment_method"]
          id?: string
          instagram?: string | null
          license_accepted?: boolean | null
          license_accepted_at?: string | null
          license_snapshot?: Json | null
          license_version?: string | null
          nome_artistico?: string | null
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
          ai_music_details: string | null
          ai_on_cover: boolean
          ai_on_music: boolean
          artist_name: string
          audio_drive_url: string | null
          cover_drive_url: string | null
          cover_path: string | null
          cpf: string
          created_at: string
          email: string
          faixa_foco: string | null
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
          suggested_release_date: string | null
          technical_sheet: string
          tracklist: string | null
          updated_at: string
          whatsapp: string
        }
        Insert: {
          about_artist: string
          about_release: string
          ai_music_details?: string | null
          ai_on_cover?: boolean
          ai_on_music?: boolean
          artist_name: string
          audio_drive_url?: string | null
          cover_drive_url?: string | null
          cover_path?: string | null
          cpf: string
          created_at?: string
          email: string
          faixa_foco?: string | null
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
          suggested_release_date?: string | null
          technical_sheet: string
          tracklist?: string | null
          updated_at?: string
          whatsapp?: string
        }
        Update: {
          about_artist?: string
          about_release?: string
          ai_music_details?: string | null
          ai_on_cover?: boolean
          ai_on_music?: boolean
          artist_name?: string
          audio_drive_url?: string | null
          cover_drive_url?: string | null
          cover_path?: string | null
          cpf?: string
          created_at?: string
          email?: string
          faixa_foco?: string | null
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
          suggested_release_date?: string | null
          technical_sheet?: string
          tracklist?: string | null
          updated_at?: string
          whatsapp?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
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
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      expire_beat_reservations: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_beat_plays: { Args: { _beat_id: string }; Returns: number }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "admin"
      beat_status: "rascunho" | "ativo" | "vendido" | "reservado"
      beat_tipo: "fechado" | "aberto"
      feedback_area:
        | "catalogo"
        | "compra"
        | "pagamento"
        | "comprovante"
        | "entrega"
        | "lancamentos"
        | "backoffice"
        | "outro"
      feedback_origin: "geral" | "pos_compra" | "pos_lancamento"
      feedback_status:
        | "novo"
        | "em_analise"
        | "respondido"
        | "resolvido"
        | "arquivado"
      feedback_type: "sugestao" | "problema" | "duvida" | "suporte" | "elogio"
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
      beat_status: ["rascunho", "ativo", "vendido", "reservado"],
      beat_tipo: ["fechado", "aberto"],
      feedback_area: [
        "catalogo",
        "compra",
        "pagamento",
        "comprovante",
        "entrega",
        "lancamentos",
        "backoffice",
        "outro",
      ],
      feedback_origin: ["geral", "pos_compra", "pos_lancamento"],
      feedback_status: [
        "novo",
        "em_analise",
        "respondido",
        "resolvido",
        "arquivado",
      ],
      feedback_type: ["sugestao", "problema", "duvida", "suporte", "elogio"],
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
