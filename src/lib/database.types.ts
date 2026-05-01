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
      categories: {
        Row: {
          created_at: string | null
          id: string
          name: string
          slug: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          budget: string | null
          created_at: string | null
          email: string
          id: string
          ip_address: unknown
          message: string
          name: string
          read: boolean | null
          replied: boolean | null
          type: Database["public"]["Enums"]["message_type"]
          user_agent: string | null
        }
        Insert: {
          budget?: string | null
          created_at?: string | null
          email: string
          id?: string
          ip_address?: unknown
          message: string
          name: string
          read?: boolean | null
          replied?: boolean | null
          type?: Database["public"]["Enums"]["message_type"]
          user_agent?: string | null
        }
        Update: {
          budget?: string | null
          created_at?: string | null
          email?: string
          id?: string
          ip_address?: unknown
          message?: string
          name?: string
          read?: boolean | null
          replied?: boolean | null
          type?: Database["public"]["Enums"]["message_type"]
          user_agent?: string | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          amount_shipping_cents: number | null
          amount_subtotal_cents: number | null
          amount_tax_cents: number | null
          amount_total_cents: number
          carrier: string | null
          created_at: string | null
          currency: string
          customer_email: string
          customer_name: string | null
          customer_phone: string | null
          delivered_at: string | null
          id: string
          notes: string | null
          paid_at: string | null
          product_id: string | null
          shipped_at: string | null
          shipping_address: Json | null
          status: Database["public"]["Enums"]["order_status"]
          stripe_payment_intent: string | null
          stripe_session_id: string
          tracking_number: string | null
          tracking_url: string | null
        }
        Insert: {
          amount_shipping_cents?: number | null
          amount_subtotal_cents?: number | null
          amount_tax_cents?: number | null
          amount_total_cents: number
          carrier?: string | null
          created_at?: string | null
          currency?: string
          customer_email: string
          customer_name?: string | null
          customer_phone?: string | null
          delivered_at?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          product_id?: string | null
          shipped_at?: string | null
          shipping_address?: Json | null
          status?: Database["public"]["Enums"]["order_status"]
          stripe_payment_intent?: string | null
          stripe_session_id: string
          tracking_number?: string | null
          tracking_url?: string | null
        }
        Update: {
          amount_shipping_cents?: number | null
          amount_subtotal_cents?: number | null
          amount_tax_cents?: number | null
          amount_total_cents?: number
          carrier?: string | null
          created_at?: string | null
          currency?: string
          customer_email?: string
          customer_name?: string | null
          customer_phone?: string | null
          delivered_at?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          product_id?: string | null
          shipped_at?: string | null
          shipping_address?: Json | null
          status?: Database["public"]["Enums"]["order_status"]
          stripe_payment_intent?: string | null
          stripe_session_id?: string
          tracking_number?: string | null
          tracking_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_slug: string | null
          created_at: string | null
          currency: string
          description: string | null
          dimensions: string | null
          id: string
          images: Json
          is_new: boolean | null
          name: string
          price_cents: number
          published_at: string | null
          slug: string
          status: Database["public"]["Enums"]["product_status"]
          stripe_payment_link: string | null
          stripe_price_id: string | null
          stripe_product_id: string | null
          technique: string | null
          updated_at: string | null
          year_created: number | null
        }
        Insert: {
          category_slug?: string | null
          created_at?: string | null
          currency?: string
          description?: string | null
          dimensions?: string | null
          id?: string
          images?: Json
          is_new?: boolean | null
          name: string
          price_cents: number
          published_at?: string | null
          slug: string
          status?: Database["public"]["Enums"]["product_status"]
          stripe_payment_link?: string | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          technique?: string | null
          updated_at?: string | null
          year_created?: number | null
        }
        Update: {
          category_slug?: string | null
          created_at?: string | null
          currency?: string
          description?: string | null
          dimensions?: string | null
          id?: string
          images?: Json
          is_new?: boolean | null
          name?: string
          price_cents?: number
          published_at?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["product_status"]
          stripe_payment_link?: string | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          technique?: string | null
          updated_at?: string | null
          year_created?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_slug_fkey"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["slug"]
          },
        ]
      }
    }
    Views: {
      products_public: {
        Row: {
          category_slug: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          dimensions: string | null
          id: string | null
          images: Json | null
          is_new: boolean | null
          name: string | null
          price_cents: number | null
          published_at: string | null
          slug: string | null
          status: Database["public"]["Enums"]["product_status"] | null
          stripe_payment_link: string | null
          technique: string | null
          year_created: number | null
        }
        Insert: {
          category_slug?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          dimensions?: string | null
          id?: string | null
          images?: Json | null
          is_new?: boolean | null
          name?: string | null
          price_cents?: number | null
          published_at?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["product_status"] | null
          stripe_payment_link?: string | null
          technique?: string | null
          year_created?: number | null
        }
        Update: {
          category_slug?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          dimensions?: string | null
          id?: string | null
          images?: Json | null
          is_new?: boolean | null
          name?: string | null
          price_cents?: number | null
          published_at?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["product_status"] | null
          stripe_payment_link?: string | null
          technique?: string | null
          year_created?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_slug_fkey"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["slug"]
          },
        ]
      }
    }
    Functions: {
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      message_type: "general" | "commission" | "collab"
      order_status:
        | "pending"
        | "paid"
        | "shipped"
        | "delivered"
        | "refunded"
        | "failed"
        | "cancelled"
      product_status: "available" | "reserved" | "sold" | "draft"
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
      message_type: ["general", "commission", "collab"],
      order_status: [
        "pending",
        "paid",
        "shipped",
        "delivered",
        "refunded",
        "failed",
        "cancelled",
      ],
      product_status: ["available", "reserved", "sold", "draft"],
    },
  },
} as const
<claude-code-hint v="1" type="plugin" value="supabase@claude-plugins-official" />
