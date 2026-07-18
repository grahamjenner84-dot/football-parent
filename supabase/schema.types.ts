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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          created_at: string
          id: string
          instagram_access_token: string | null
          instagram_account_id: string | null
          name: string
          niche: string
          token_expires_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          instagram_access_token?: string | null
          instagram_account_id?: string | null
          name: string
          niche: string
          token_expires_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          instagram_access_token?: string | null
          instagram_account_id?: string | null
          name?: string
          niche?: string
          token_expires_at?: string | null
        }
        Relationships: []
      }
      ai_suggestions: {
        Row: {
          account_id: string
          based_on_post_ids: string[]
          generated_at: string
          id: string
          status: Database["public"]["Enums"]["ai_suggestion_status"]
          suggestion_text: string
        }
        Insert: {
          account_id: string
          based_on_post_ids?: string[]
          generated_at?: string
          id?: string
          status?: Database["public"]["Enums"]["ai_suggestion_status"]
          suggestion_text: string
        }
        Update: {
          account_id?: string
          based_on_post_ids?: string[]
          generated_at?: string
          id?: string
          status?: Database["public"]["Enums"]["ai_suggestion_status"]
          suggestion_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_suggestions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      content_queue: {
        Row: {
          account_id: string
          content_type: Database["public"]["Enums"]["content_type"]
          created_at: string
          id: string
          priority: number
          source: Database["public"]["Enums"]["content_source"]
          status: Database["public"]["Enums"]["content_status"]
          topic: string
        }
        Insert: {
          account_id: string
          content_type: Database["public"]["Enums"]["content_type"]
          created_at?: string
          id?: string
          priority?: number
          source?: Database["public"]["Enums"]["content_source"]
          status?: Database["public"]["Enums"]["content_status"]
          topic: string
        }
        Update: {
          account_id?: string
          content_type?: Database["public"]["Enums"]["content_type"]
          created_at?: string
          id?: string
          priority?: number
          source?: Database["public"]["Enums"]["content_source"]
          status?: Database["public"]["Enums"]["content_status"]
          topic?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_queue_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      hook_library: {
        Row: {
          account_id: string
          created_at: string
          hook_text: string
          id: string
          post_id: string | null
          style_tag: string | null
        }
        Insert: {
          account_id: string
          created_at?: string
          hook_text: string
          id?: string
          post_id?: string | null
          style_tag?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string
          hook_text?: string
          id?: string
          post_id?: string | null
          style_tag?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hook_library_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hook_library_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_metrics: {
        Row: {
          comments: number | null
          id: string
          impressions: number | null
          likes: number | null
          post_id: string
          pulled_at: string
          reach: number | null
          saves: number | null
          shares: number | null
          views: number | null
        }
        Insert: {
          comments?: number | null
          id?: string
          impressions?: number | null
          likes?: number | null
          post_id: string
          pulled_at?: string
          reach?: number | null
          saves?: number | null
          shares?: number | null
          views?: number | null
        }
        Update: {
          comments?: number | null
          id?: string
          impressions?: number | null
          likes?: number | null
          post_id?: string
          pulled_at?: string
          reach?: number | null
          saves?: number | null
          shares?: number | null
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "post_metrics_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_slides: {
        Row: {
          alt_text: string | null
          id: string
          image_url: string | null
          post_id: string
          slide_order: number
          text_content: string | null
          video_url: string | null
        }
        Insert: {
          alt_text?: string | null
          id?: string
          image_url?: string | null
          post_id: string
          slide_order: number
          text_content?: string | null
          video_url?: string | null
        }
        Update: {
          alt_text?: string | null
          id?: string
          image_url?: string | null
          post_id?: string
          slide_order?: number
          text_content?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_slides_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          account_id: string
          caption: string | null
          content_queue_id: string | null
          created_at: string
          format: Database["public"]["Enums"]["post_format"]
          hook_text: string | null
          id: string
          ig_media_id: string | null
          published_at: string | null
          scheduled_time: string | null
          status: Database["public"]["Enums"]["content_status"]
        }
        Insert: {
          account_id: string
          caption?: string | null
          content_queue_id?: string | null
          created_at?: string
          format: Database["public"]["Enums"]["post_format"]
          hook_text?: string | null
          id?: string
          ig_media_id?: string | null
          published_at?: string | null
          scheduled_time?: string | null
          status?: Database["public"]["Enums"]["content_status"]
        }
        Update: {
          account_id?: string
          caption?: string | null
          content_queue_id?: string | null
          created_at?: string
          format?: Database["public"]["Enums"]["post_format"]
          hook_text?: string | null
          id?: string
          ig_media_id?: string | null
          published_at?: string | null
          scheduled_time?: string | null
          status?: Database["public"]["Enums"]["content_status"]
        }
        Relationships: [
          {
            foreignKeyName: "posts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_content_queue_id_fkey"
            columns: ["content_queue_id"]
            isOneToOne: false
            referencedRelation: "content_queue"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      ai_suggestion_status: "pending" | "applied" | "dismissed"
      content_source: "gsc" | "performance_feedback" | "manual" | "chat"
      content_status:
        | "draft"
        | "pending_qc"
        | "pending_approval"
        | "approved"
        | "rejected"
        | "scheduled"
        | "published"
        | "failed"
      content_type: "joke" | "education" | "interview"
      post_format: "carousel" | "reel"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      ai_suggestion_status: ["pending", "applied", "dismissed"],
      content_source: ["gsc", "performance_feedback", "manual", "chat"],
      content_status: [
        "draft",
        "pending_qc",
        "pending_approval",
        "approved",
        "rejected",
        "scheduled",
        "published",
        "failed",
      ],
      content_type: ["joke", "education", "interview"],
      post_format: ["carousel", "reel"],
    },
  },
} as const
