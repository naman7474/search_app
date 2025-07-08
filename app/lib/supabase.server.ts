import { createClient } from '@supabase/supabase-js';

if (!process.env.SUPABASE_URL) {
  throw new Error('Missing env var: SUPABASE_URL');
}

if (!process.env.SUPABASE_ANON_KEY) {
  throw new Error('Missing env var: SUPABASE_ANON_KEY');
}

// Create Supabase client for server-side operations
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
    },
  }
);

// Service role client for admin operations (when we have the service role key)
export const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )
  : null;

export type Database = {
  public: {
    Tables: {
      products: {
        Row: {
          id: string;
          shopify_product_id: number;
          title: string;
          description: string | null;
          handle: string | null;
          product_type: string | null;
          vendor: string | null;
          tags: string[] | null;
          price_min: number | null;
          price_max: number | null;
          available: boolean | null;
          image_url: string | null;
          created_at: string;
          updated_at: string;
          shop_domain: string;
          embedding: number[] | null;
          metadata: any;
        };
        Insert: {
          id?: string;
          shopify_product_id: number;
          title: string;
          description?: string | null;
          handle?: string | null;
          product_type?: string | null;
          vendor?: string | null;
          tags?: string[] | null;
          price_min?: number | null;
          price_max?: number | null;
          available?: boolean | null;
          image_url?: string | null;
          created_at?: string;
          updated_at?: string;
          shop_domain: string;
          embedding?: number[] | null;
          metadata?: any;
        };
        Update: {
          id?: string;
          shopify_product_id?: number;
          title?: string;
          description?: string | null;
          handle?: string | null;
          product_type?: string | null;
          vendor?: string | null;
          tags?: string[] | null;
          price_min?: number | null;
          price_max?: number | null;
          available?: boolean | null;
          image_url?: string | null;
          created_at?: string;
          updated_at?: string;
          shop_domain?: string;
          embedding?: number[] | null;
          metadata?: any;
        };
      };
      product_variants: {
        Row: {
          id: string;
          product_id: string;
          shopify_variant_id: number;
          title: string | null;
          price: number | null;
          compare_at_price: number | null;
          sku: string | null;
          barcode: string | null;
          inventory_quantity: number | null;
          available: boolean | null;
          image_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          shopify_variant_id: number;
          title?: string | null;
          price?: number | null;
          compare_at_price?: number | null;
          sku?: string | null;
          barcode?: string | null;
          inventory_quantity?: number | null;
          available?: boolean | null;
          image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          shopify_variant_id?: number;
          title?: string | null;
          price?: number | null;
          compare_at_price?: number | null;
          sku?: string | null;
          barcode?: string | null;
          inventory_quantity?: number | null;
          available?: boolean | null;
          image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      search_queries: {
        Row: {
          id: string;
          shop_domain: string;
          query_text: string;
          processed_query: string | null;
          filters: any;
          results_count: number | null;
          clicked_product_ids: number[] | null;
          created_at: string;
          session_id: string | null;
          user_agent: string | null;
        };
        Insert: {
          id?: string;
          shop_domain: string;
          query_text: string;
          processed_query?: string | null;
          filters?: any;
          results_count?: number | null;
          clicked_product_ids?: number[] | null;
          created_at?: string;
          session_id?: string | null;
          user_agent?: string | null;
        };
        Update: {
          id?: string;
          shop_domain?: string;
          query_text?: string;
          processed_query?: string | null;
          filters?: any;
          results_count?: number | null;
          clicked_product_ids?: number[] | null;
          created_at?: string;
          session_id?: string | null;
          user_agent?: string | null;
        };
      };
    };
  };
}; 