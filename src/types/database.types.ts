export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "SUPER_ADMIN" | "OWNER" | "MANAGER" | "KITCHEN";
export type OrderStatus =
  | "PENDING"
  | "ACCEPTED"
  | "PREPARING"
  | "READY"
  | "COMPLETED"
  | "CANCELLED"
  | "REJECTED";
export type PaymentStatus = "UNPAID" | "PAID" | "REFUNDED";
export type ActorType = "CUSTOMER" | "STAFF" | "SYSTEM";
export type InvitationStatus = "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";
export type SubscriptionStatus = "ACTIVE" | "PAST_DUE" | "CANCELLED" | "TRIAL";

export interface Database {
  public: {
    Tables: {
      subscription_plans: {
        Row: {
          id: string;
          name: string;
          code: string;
          description: string | null;
          max_tables: number;
          price_paise: number;
          billing_period: string;
          features: Json;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          code: string;
          description?: string | null;
          max_tables?: number;
          price_paise?: number;
          billing_period?: string;
          features?: Json;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          code?: string;
          description?: string | null;
          max_tables?: number;
          price_paise?: number;
          billing_period?: string;
          features?: Json;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      restaurants: {
        Row: {
          id: string;
          name: string;
          slug: string;
          is_active: boolean;
          currency: string;
          gst_number: string | null;
          fssai_license: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          is_active?: boolean;
          currency?: string;
          gst_number?: string | null;
          fssai_license?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          is_active?: boolean;
          currency?: string;
          gst_number?: string | null;
          fssai_license?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      restaurant_branding: {
        Row: {
          restaurant_id: string;
          logo_url: string | null;
          banner_url: string | null;
          primary_color: string;
          tagline: string | null;
          support_phone: string | null;
          support_email: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          restaurant_id: string;
          logo_url?: string | null;
          banner_url?: string | null;
          primary_color?: string;
          tagline?: string | null;
          support_phone?: string | null;
          support_email?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          restaurant_id?: string;
          logo_url?: string | null;
          banner_url?: string | null;
          primary_color?: string;
          tagline?: string | null;
          support_phone?: string | null;
          support_email?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      restaurant_subscriptions: {
        Row: {
          id: string;
          restaurant_id: string;
          plan_id: string;
          status: SubscriptionStatus;
          current_period_start: string;
          current_period_end: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          plan_id: string;
          status?: SubscriptionStatus;
          current_period_start?: string;
          current_period_end?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          plan_id?: string;
          status?: SubscriptionStatus;
          current_period_start?: string;
          current_period_end?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      restaurant_users: {
        Row: {
          id: string;
          restaurant_id: string;
          user_id: string;
          role: UserRole;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          user_id: string;
          role: UserRole;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          user_id?: string;
          role?: UserRole;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      restaurant_invitations: {
        Row: {
          id: string;
          restaurant_id: string;
          email: string;
          role: UserRole;
          token: string;
          status: InvitationStatus;
          invited_by: string | null;
          expires_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          email: string;
          role: UserRole;
          token: string;
          status?: InvitationStatus;
          invited_by?: string | null;
          expires_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          email?: string;
          role?: UserRole;
          token?: string;
          status?: InvitationStatus;
          invited_by?: string | null;
          expires_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      restaurant_tables: {
        Row: {
          id: string;
          restaurant_id: string;
          table_number: string;
          capacity: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          table_number: string;
          capacity?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          table_number?: string;
          capacity?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      table_qr_tokens: {
        Row: {
          id: string;
          restaurant_id: string;
          table_id: string;
          token: string;
          is_revoked: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          table_id: string;
          token: string;
          is_revoked?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          table_id?: string;
          token?: string;
          is_revoked?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      menu_categories: {
        Row: {
          id: string;
          restaurant_id: string;
          name: string;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          name: string;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          name?: string;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      menu_items: {
        Row: {
          id: string;
          restaurant_id: string;
          category_id: string;
          name: string;
          description: string | null;
          price_paise: number;
          image_url: string | null;
          is_veg: boolean;
          is_available: boolean;
          tax_rate_percentage: number;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          category_id: string;
          name: string;
          description?: string | null;
          price_paise: number;
          image_url?: string | null;
          is_veg?: boolean;
          is_available?: boolean;
          tax_rate_percentage?: number;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          category_id?: string;
          name?: string;
          description?: string | null;
          price_paise?: number;
          image_url?: string | null;
          is_veg?: boolean;
          is_available?: boolean;
          tax_rate_percentage?: number;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      menu_item_images: {
        Row: {
          id: string;
          restaurant_id: string;
          menu_item_id: string;
          image_url: string;
          alt_text: string | null;
          is_primary: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          menu_item_id: string;
          image_url: string;
          alt_text?: string | null;
          is_primary?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          menu_item_id?: string;
          image_url?: string;
          alt_text?: string | null;
          is_primary?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          restaurant_id: string;
          table_id: string;
          order_number: string;
          order_status: OrderStatus;
          payment_status: PaymentStatus;
          subtotal_paise: number;
          tax_paise: number;
          total_paise: number;
          guest_tracking_token: string;
          special_instructions: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          table_id: string;
          order_number: string;
          order_status?: OrderStatus;
          payment_status?: PaymentStatus;
          subtotal_paise: number;
          tax_paise: number;
          total_paise: number;
          guest_tracking_token: string;
          special_instructions?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          table_id?: string;
          order_number?: string;
          order_status?: OrderStatus;
          payment_status?: PaymentStatus;
          subtotal_paise?: number;
          tax_paise?: number;
          total_paise?: number;
          guest_tracking_token?: string;
          special_instructions?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          menu_item_id: string | null;
          item_name_snapshot: string;
          unit_price_paise: number;
          quantity: number;
          line_total_paise: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          menu_item_id?: string | null;
          item_name_snapshot: string;
          unit_price_paise: number;
          quantity: number;
          line_total_paise: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          menu_item_id?: string | null;
          item_name_snapshot?: string;
          unit_price_paise?: number;
          quantity?: number;
          line_total_paise?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      order_idempotency_keys: {
        Row: {
          id: string;
          restaurant_id: string;
          idempotency_key: string;
          order_id: string;
          request_hash: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          idempotency_key: string;
          order_id: string;
          request_hash: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          idempotency_key?: string;
          order_id?: string;
          request_hash?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      order_status_events: {
        Row: {
          id: string;
          order_id: string;
          previous_status: OrderStatus | null;
          new_status: OrderStatus;
          actor_type: ActorType;
          actor_id: string | null;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          previous_status?: OrderStatus | null;
          new_status: OrderStatus;
          actor_type: ActorType;
          actor_id?: string | null;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          previous_status?: OrderStatus | null;
          new_status?: OrderStatus;
          actor_type?: ActorType;
          actor_id?: string | null;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          restaurant_id: string | null;
          user_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          details: Json | null;
          ip_address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id?: string | null;
          user_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          details?: Json | null;
          ip_address?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string | null;
          user_id?: string | null;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          details?: Json | null;
          ip_address?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_order_atomic: {
        Args: {
          p_restaurant_id: string;
          p_table_id: string;
          p_idempotency_key: string;
          p_request_hash: string;
          p_guest_tracking_token: string;
          p_items: Json;
          p_special_instructions?: string | null;
        };
        Returns: Json;
      };
      has_restaurant_role: {
        Args: {
          p_restaurant_id: string;
          p_allowed_roles: UserRole[];
        };
        Returns: boolean;
      };
      is_super_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
    Enums: {
      user_role: UserRole;
      order_status: OrderStatus;
      payment_status: PaymentStatus;
      actor_type: ActorType;
      invitation_status: InvitationStatus;
      subscription_status: SubscriptionStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}
