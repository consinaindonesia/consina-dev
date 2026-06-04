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
      activity_log: {
        Row: {
          action: string
          admin_user_id: string | null
          after: Json | null
          before: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_user_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_log_archive: {
        Row: {
          action: string
          admin_user_id: string | null
          after: Json | null
          before: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_user_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          browser_notifications_enabled: boolean
          created_at: string
          email: string
          full_name: string | null
          id: string
          notification_email_scope: string
          preferred_language: string
          quiet_hours_end: number | null
          quiet_hours_start: number | null
          role: string
          whatsapp_notifications_enabled: boolean
          whatsapp_phone: string | null
        }
        Insert: {
          browser_notifications_enabled?: boolean
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          notification_email_scope?: string
          preferred_language?: string
          quiet_hours_end?: number | null
          quiet_hours_start?: number | null
          role?: string
          whatsapp_notifications_enabled?: boolean
          whatsapp_phone?: string | null
        }
        Update: {
          browser_notifications_enabled?: boolean
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          notification_email_scope?: string
          preferred_language?: string
          quiet_hours_end?: number | null
          quiet_hours_start?: number | null
          role?: string
          whatsapp_notifications_enabled?: boolean
          whatsapp_phone?: string | null
        }
        Relationships: []
      }
      attributes: {
        Row: {
          created_at: string
          id: string
          name_en: string
          name_id: string
          options: Json
          slug: string
          type: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name_en: string
          name_id: string
          options?: Json
          slug: string
          type: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name_en?: string
          name_id?: string
          options?: Json
          slug?: string
          type?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      brand_glossary: {
        Row: {
          created_at: string
          id: string
          never_translate: boolean
          notes: string | null
          term_en: string
          term_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          never_translate?: boolean
          notes?: string | null
          term_en: string
          term_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          never_translate?: boolean
          notes?: string | null
          term_en?: string
          term_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          description_en: string | null
          description_id: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name_en: string
          name_id: string
          parent_category_id: string | null
          slug: string
          sort_order: number
        }
        Insert: {
          description_en?: string | null
          description_id?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name_en: string
          name_id: string
          parent_category_id?: string | null
          slug: string
          sort_order?: number
        }
        Update: {
          description_en?: string | null
          description_id?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name_en?: string
          name_id?: string
          parent_category_id?: string | null
          slug?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_category_id_fkey"
            columns: ["parent_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      category_attributes: {
        Row: {
          attribute_id: string
          category_id: string
          id: string
          is_required: boolean
          sort_order: number
        }
        Insert: {
          attribute_id: string
          category_id: string
          id?: string
          is_required?: boolean
          sort_order?: number
        }
        Update: {
          attribute_id?: string
          category_id?: string
          id?: string
          is_required?: boolean
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "category_attributes_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "attributes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_attributes_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      category_size_guides: {
        Row: {
          category_id: string
          created_at: string
          size_guide_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          size_guide_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          size_guide_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_size_guides_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: true
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_size_guides_size_guide_id_fkey"
            columns: ["size_guide_id"]
            isOneToOne: false
            referencedRelation: "size_guides"
            referencedColumns: ["id"]
          },
        ]
      }
      category_slug_redirects: {
        Row: {
          category_id: string | null
          created_at: string
          new_slug: string
          old_slug: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          new_slug: string
          old_slug: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          new_slug?: string
          old_slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_slug_redirects_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_inquiries: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          message: string
          subject: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          message: string
          subject: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          message?: string
          subject?: string
        }
        Relationships: []
      }
      customer_addresses: {
        Row: {
          address: string
          city: string
          created_at: string
          id: string
          is_default: boolean
          label: string | null
          phone: string
          postal_code: string | null
          recipient_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address: string
          city: string
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string | null
          phone: string
          postal_code?: string | null
          recipient_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          city?: string
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string | null
          phone?: string
          postal_code?: string | null
          recipient_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      customer_profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          phone: string | null
          preferred_language: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          phone?: string | null
          preferred_language?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          preferred_language?: string
          updated_at?: string
        }
        Relationships: []
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
      gdpr_requests: {
        Row: {
          affected_count: number
          affected_inquiry_ids: string[]
          created_at: string
          customer_email: string
          id: string
          metadata: Json | null
          notes: string | null
          performed_by: string | null
          request_type: string
        }
        Insert: {
          affected_count?: number
          affected_inquiry_ids?: string[]
          created_at?: string
          customer_email: string
          id?: string
          metadata?: Json | null
          notes?: string | null
          performed_by?: string | null
          request_type: string
        }
        Update: {
          affected_count?: number
          affected_inquiry_ids?: string[]
          created_at?: string
          customer_email?: string
          id?: string
          metadata?: Json | null
          notes?: string | null
          performed_by?: string | null
          request_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "gdpr_requests_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      inquiries: {
        Row: {
          assigned_to: string | null
          closing_notes: string | null
          created_at: string
          customer_city: string | null
          customer_email: string
          customer_name: string
          customer_phone: string | null
          deleted_at: string | null
          first_contacted_at: string | null
          id: string
          lost_reason: string | null
          message: string | null
          notes: string | null
          preferred_store_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          closing_notes?: string | null
          created_at?: string
          customer_city?: string | null
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          deleted_at?: string | null
          first_contacted_at?: string | null
          id?: string
          lost_reason?: string | null
          message?: string | null
          notes?: string | null
          preferred_store_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          closing_notes?: string | null
          created_at?: string
          customer_city?: string | null
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          deleted_at?: string | null
          first_contacted_at?: string | null
          id?: string
          lost_reason?: string | null
          message?: string | null
          notes?: string | null
          preferred_store_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inquiries_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inquiries_preferred_store_id_fkey"
            columns: ["preferred_store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      inquiry_items: {
        Row: {
          id: string
          inquiry_id: string
          notes: string | null
          product_id: string | null
          quantity: number
        }
        Insert: {
          id?: string
          inquiry_id: string
          notes?: string | null
          product_id?: string | null
          quantity?: number
        }
        Update: {
          id?: string
          inquiry_id?: string
          notes?: string | null
          product_id?: string | null
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "inquiry_items_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "inquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inquiry_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      inquiry_notes: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          id: string
          inquiry_id: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          inquiry_id: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          inquiry_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inquiry_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inquiry_notes_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "inquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      notify_when_in_stock: {
        Row: {
          created_at: string
          email: string
          id: string
          notified_at: string | null
          product_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          notified_at?: string | null
          product_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          notified_at?: string | null
          product_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          attributes: Json | null
          created_at: string
          id: string
          line_total_idr: number
          order_id: string
          product_id: string | null
          product_name: string | null
          quantity: number
          size_variant_id: string | null
          sku: string | null
          unit_price_idr: number
          variant_id: string | null
        }
        Insert: {
          attributes?: Json | null
          created_at?: string
          id?: string
          line_total_idr?: number
          order_id: string
          product_id?: string | null
          product_name?: string | null
          quantity?: number
          size_variant_id?: string | null
          sku?: string | null
          unit_price_idr?: number
          variant_id?: string | null
        }
        Update: {
          attributes?: Json | null
          created_at?: string
          id?: string
          line_total_idr?: number
          order_id?: string
          product_id?: string | null
          product_name?: string | null
          quantity?: number
          size_variant_id?: string | null
          sku?: string | null
          unit_price_idr?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_size_variant_id_fkey"
            columns: ["size_variant_id"]
            isOneToOne: false
            referencedRelation: "product_size_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer_address: string | null
          customer_email: string
          customer_name: string
          customer_phone: string
          customer_user_id: string | null
          id: string
          inquiry_id: string | null
          midtrans_transaction_status: string | null
          notes: string | null
          paid_at: string | null
          payment_method: string
          payment_proof_url: string | null
          payment_provider: string
          payment_reference: string | null
          payment_status: string
          refunded_at: string | null
          shipped_at: string | null
          shipping_address: string | null
          shipping_city: string | null
          shipping_idr: number
          shipping_method: string
          shipping_method_id: string | null
          shipping_method_name: string | null
          shipping_postal_code: string | null
          shipping_zone_id: string | null
          status: string
          stock_decremented_at: string | null
          subtotal_idr: number
          total_idr: number
          tracking_carrier: string | null
          tracking_number: string | null
          updated_at: string
          voucher_code: string | null
          voucher_discount_idr: number
        }
        Insert: {
          created_at?: string
          customer_address?: string | null
          customer_email: string
          customer_name: string
          customer_phone: string
          customer_user_id?: string | null
          id?: string
          inquiry_id?: string | null
          midtrans_transaction_status?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string
          payment_proof_url?: string | null
          payment_provider?: string
          payment_reference?: string | null
          payment_status?: string
          refunded_at?: string | null
          shipped_at?: string | null
          shipping_address?: string | null
          shipping_city?: string | null
          shipping_idr?: number
          shipping_method?: string
          shipping_method_id?: string | null
          shipping_method_name?: string | null
          shipping_postal_code?: string | null
          shipping_zone_id?: string | null
          status?: string
          stock_decremented_at?: string | null
          subtotal_idr?: number
          total_idr?: number
          tracking_carrier?: string | null
          tracking_number?: string | null
          updated_at?: string
          voucher_code?: string | null
          voucher_discount_idr?: number
        }
        Update: {
          created_at?: string
          customer_address?: string | null
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          customer_user_id?: string | null
          id?: string
          inquiry_id?: string | null
          midtrans_transaction_status?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string
          payment_proof_url?: string | null
          payment_provider?: string
          payment_reference?: string | null
          payment_status?: string
          refunded_at?: string | null
          shipped_at?: string | null
          shipping_address?: string | null
          shipping_city?: string | null
          shipping_idr?: number
          shipping_method?: string
          shipping_method_id?: string | null
          shipping_method_name?: string | null
          shipping_postal_code?: string | null
          shipping_zone_id?: string | null
          status?: string
          stock_decremented_at?: string | null
          subtotal_idr?: number
          total_idr?: number
          tracking_carrier?: string | null
          tracking_number?: string | null
          updated_at?: string
          voucher_code?: string | null
          voucher_discount_idr?: number
        }
        Relationships: []
      }
      payment_events: {
        Row: {
          created_at: string
          fraud_status: string | null
          id: string
          order_id: string
          provider: string
          raw: Json | null
          signature_key: string | null
          transaction_id: string | null
          transaction_status: string | null
        }
        Insert: {
          created_at?: string
          fraud_status?: string | null
          id?: string
          order_id: string
          provider: string
          raw?: Json | null
          signature_key?: string | null
          transaction_id?: string | null
          transaction_status?: string | null
        }
        Update: {
          created_at?: string
          fraud_status?: string | null
          id?: string
          order_id?: string
          provider?: string
          raw?: Json | null
          signature_key?: string | null
          transaction_id?: string | null
          transaction_status?: string | null
        }
        Relationships: []
      }
      product_categories: {
        Row: {
          category_id: string
          created_at: string
          is_primary: boolean
          product_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          is_primary?: boolean
          product_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          is_primary?: boolean
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_categories_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt_text_en: string | null
          alt_text_id: string | null
          id: string
          image_url: string
          is_primary: boolean
          large_url: string | null
          product_id: string
          sort_order: number
          thumbnail_url: string | null
        }
        Insert: {
          alt_text_en?: string | null
          alt_text_id?: string | null
          id?: string
          image_url: string
          is_primary?: boolean
          large_url?: string | null
          product_id: string
          sort_order?: number
          thumbnail_url?: string | null
        }
        Update: {
          alt_text_en?: string | null
          alt_text_id?: string | null
          id?: string
          image_url?: string
          is_primary?: boolean
          large_url?: string | null
          product_id?: string
          sort_order?: number
          thumbnail_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_option_types: {
        Row: {
          created_at: string
          id: string
          name: string
          product_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          product_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_option_types_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_option_values: {
        Row: {
          created_at: string
          id: string
          option_type_id: string
          sort_order: number
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_type_id: string
          sort_order?: number
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          option_type_id?: string
          sort_order?: number
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_option_values_option_type_id_fkey"
            columns: ["option_type_id"]
            isOneToOne: false
            referencedRelation: "product_option_types"
            referencedColumns: ["id"]
          },
        ]
      }
      product_size_variants: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          option_value_ids: string[]
          original_price_idr: number | null
          price_idr: number | null
          product_id: string
          sku: string | null
          sort_order: number
          stock: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          option_value_ids?: string[]
          original_price_idr?: number | null
          price_idr?: number | null
          product_id: string
          sku?: string | null
          sort_order?: number
          stock?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          option_value_ids?: string[]
          original_price_idr?: number | null
          price_idr?: number | null
          product_id?: string
          sku?: string | null
          sort_order?: number
          stock?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_size_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          color_hex: string
          color_name: string
          created_at: string
          id: string
          image_url: string | null
          product_id: string
          sort_order: number
          stock: number | null
          updated_at: string
        }
        Insert: {
          color_hex: string
          color_name: string
          created_at?: string
          id?: string
          image_url?: string | null
          product_id: string
          sort_order?: number
          stock?: number | null
          updated_at?: string
        }
        Update: {
          color_hex?: string
          color_name?: string
          created_at?: string
          id?: string
          image_url?: string | null
          product_id?: string
          sort_order?: number
          stock?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          ai_translated_fields: string[]
          attributes: Json
          capacity: string | null
          category_id: string | null
          created_at: string
          description_en: string | null
          description_id: string | null
          discount_percent: number | null
          id: string
          images: string[]
          is_active: boolean
          is_featured: boolean
          is_on_sale: boolean
          name_en: string
          name_id: string
          original_price_idr: number | null
          price_idr: number
          sale_price_idr: number | null
          seo_description: string | null
          seo_title: string | null
          short_description_en: string | null
          short_description_id: string | null
          size_guide_id: string | null
          sku: string
          slug: string | null
          stock: number
          stock_status: string
          updated_at: string
          weight_grams: number | null
        }
        Insert: {
          ai_translated_fields?: string[]
          attributes?: Json
          capacity?: string | null
          category_id?: string | null
          created_at?: string
          description_en?: string | null
          description_id?: string | null
          discount_percent?: number | null
          id?: string
          images?: string[]
          is_active?: boolean
          is_featured?: boolean
          is_on_sale?: boolean
          name_en: string
          name_id: string
          original_price_idr?: number | null
          price_idr?: number
          sale_price_idr?: number | null
          seo_description?: string | null
          seo_title?: string | null
          short_description_en?: string | null
          short_description_id?: string | null
          size_guide_id?: string | null
          sku: string
          slug?: string | null
          stock?: number
          stock_status?: string
          updated_at?: string
          weight_grams?: number | null
        }
        Update: {
          ai_translated_fields?: string[]
          attributes?: Json
          capacity?: string | null
          category_id?: string | null
          created_at?: string
          description_en?: string | null
          description_id?: string | null
          discount_percent?: number | null
          id?: string
          images?: string[]
          is_active?: boolean
          is_featured?: boolean
          is_on_sale?: boolean
          name_en?: string
          name_id?: string
          original_price_idr?: number | null
          price_idr?: number
          sale_price_idr?: number | null
          seo_description?: string | null
          seo_title?: string | null
          short_description_en?: string | null
          short_description_id?: string | null
          size_guide_id?: string | null
          sku?: string
          slug?: string | null
          stock?: number
          stock_status?: string
          updated_at?: string
          weight_grams?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_size_guide_id_fkey"
            columns: ["size_guide_id"]
            isOneToOne: false
            referencedRelation: "size_guides"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_methods: {
        Row: {
          code: string | null
          created_at: string
          id: string
          is_active: boolean
          multiplier: number
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          multiplier?: number
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          multiplier?: number
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      shipping_zones: {
        Row: {
          base_cost_idr: number
          cities: string[]
          created_at: string
          delivery_days_max: number
          delivery_days_min: number
          id: string
          is_active: boolean
          is_default: boolean
          per_kg_cost_idr: number
          region_name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          base_cost_idr?: number
          cities?: string[]
          created_at?: string
          delivery_days_max?: number
          delivery_days_min?: number
          id?: string
          is_active?: boolean
          is_default?: boolean
          per_kg_cost_idr?: number
          region_name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          base_cost_idr?: number
          cities?: string[]
          created_at?: string
          delivery_days_max?: number
          delivery_days_min?: number
          id?: string
          is_active?: boolean
          is_default?: boolean
          per_kg_cost_idr?: number
          region_name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      size_guides: {
        Row: {
          created_at: string
          description: string | null
          headers: Json
          id: string
          name: string
          rows: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          headers?: Json
          id?: string
          name: string
          rows?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          headers?: Json
          id?: string
          name?: string
          rows?: Json
          updated_at?: string
        }
        Relationships: []
      }
      store_stock: {
        Row: {
          created_at: string
          id: string
          last_updated_at: string
          product_id: string
          stock_quantity: number | null
          store_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_updated_at?: string
          product_id: string
          stock_quantity?: number | null
          store_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_updated_at?: string
          product_id?: string
          stock_quantity?: number | null
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_stock_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_stock_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          description_en: string | null
          description_id: string | null
          email: string | null
          id: string
          image_url: string | null
          is_active: boolean
          latitude: number | null
          longitude: number | null
          name: string
          opening_hours: Json | null
          phone: string | null
          province: string | null
          region: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          description_en?: string | null
          description_id?: string | null
          email?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name: string
          opening_hours?: Json | null
          phone?: string | null
          province?: string | null
          region?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          description_en?: string | null
          description_id?: string | null
          email?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name?: string
          opening_hours?: Json | null
          phone?: string | null
          province?: string | null
          region?: string | null
          updated_at?: string
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
      voucher_codes: {
        Row: {
          code: string
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          min_spend_idr: number
          updated_at: string
          usage_limit: number | null
          used_count: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          discount_type: string
          discount_value: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          min_spend_idr?: number
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          min_spend_idr?: number
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
        }
        Relationships: []
      }
      wishlists: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      anonymize_customer_email: {
        Args: { _email: string }
        Returns: {
          inquiry_id: string
        }[]
      }
      current_admin_role: { Args: never; Returns: string }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      is_admin: { Args: never; Returns: boolean }
      is_admin_or_editor: { Args: never; Returns: boolean }
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
      run_data_retention: { Args: never; Returns: Json }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
