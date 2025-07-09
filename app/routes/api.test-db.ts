import { json } from "@remix-run/node";
import { supabase } from "../lib/supabase.server";

export const loader = async () => {
  try {
    // Test basic connectivity
    const { data: testData, error: testError } = await supabase
      .from('products')
      .select('id, title, shop_domain')
      .limit(5);
    
    if (testError) {
      return json({
        success: false,
        error: "Database connection failed",
        details: testError.message,
        env_check: {
          hasUrl: !!process.env.SUPABASE_URL,
          hasAnonKey: !!process.env.SUPABASE_ANON_KEY,
          hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY
        }
      });
    }
    
    // Count total products
    const { count, error: countError } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });
    
    return json({
      success: true,
      message: "Database connection successful",
      product_count: count || 0,
      sample_products: testData || [],
      env_check: {
        hasUrl: !!process.env.SUPABASE_URL,
        hasAnonKey: !!process.env.SUPABASE_ANON_KEY,
        hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      }
    });
    
  } catch (error) {
    return json({
      success: false,
      error: "Unexpected error",
      message: error instanceof Error ? error.message : "Unknown error",
      env_check: {
        hasUrl: !!process.env.SUPABASE_URL,
        hasAnonKey: !!process.env.SUPABASE_ANON_KEY,
        hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      }
    });
  }
}; 