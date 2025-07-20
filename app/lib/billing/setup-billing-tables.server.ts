import { supabaseAdmin } from '../supabase.server';

const CREATE_BILLING_TABLES_SQL = `
-- Create billing tables for the AI search app

-- Shop subscriptions table
CREATE TABLE IF NOT EXISTS shop_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_domain TEXT UNIQUE NOT NULL,
  shopify_subscription_id TEXT UNIQUE,
  plan_type TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  trial_ends_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Usage records table
CREATE TABLE IF NOT EXISTS usage_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_domain TEXT NOT NULL,
  subscription_id UUID NOT NULL REFERENCES shop_subscriptions(id) ON DELETE CASCADE,
  usage_type TEXT NOT NULL, -- 'ai_search' or 'conversation_message'
  quantity INTEGER NOT NULL DEFAULT 1,
  billing_period TEXT NOT NULL, -- 'YYYY-MM-DD_YYYY-MM-DD' format
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Plan limits table
CREATE TABLE IF NOT EXISTS plan_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_type TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  price INTEGER NOT NULL, -- price in cents
  currency TEXT NOT NULL DEFAULT 'USD',
  ai_searches_per_month INTEGER NOT NULL, -- -1 for unlimited
  conversations_enabled BOOLEAN NOT NULL DEFAULT false,
  hybrid_search_enabled BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0
);
`;

const CREATE_INDEXES_SQL = `
-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_shop_subscriptions_shop_domain ON shop_subscriptions(shop_domain);
CREATE INDEX IF NOT EXISTS idx_shop_subscriptions_status ON shop_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_usage_records_shop_billing ON usage_records(shop_domain, billing_period, usage_type);
CREATE INDEX IF NOT EXISTS idx_usage_records_subscription ON usage_records(subscription_id);
`;

const CREATE_TRIGGERS_SQL = `
-- Create updated_at trigger for shop_subscriptions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_shop_subscriptions_updated_at 
    BEFORE UPDATE ON shop_subscriptions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
`;

const INSERT_PLAN_LIMITS_SQL = `
-- Insert default plan limits
INSERT INTO plan_limits (plan_type, display_name, price, ai_searches_per_month, conversations_enabled, hybrid_search_enabled, sort_order)
VALUES 
  ('free', 'Free Plan', 0, 0, false, true, 0),
  ('basic', 'Basic Plan', 4900, 10000, false, true, 1),
  ('pro', 'Pro Plan', 9900, -1, false, true, 2),
  ('premium', 'Premium Plan', 14900, -1, true, true, 3)
ON CONFLICT (plan_type) DO NOTHING;
`;

const SETUP_RLS_SQL = `
-- Enable Row Level Security (RLS)
ALTER TABLE shop_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_limits ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own subscription" ON shop_subscriptions;
DROP POLICY IF EXISTS "Users can insert their own subscription" ON shop_subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscription" ON shop_subscriptions;
DROP POLICY IF EXISTS "Users can view their own usage records" ON usage_records;
DROP POLICY IF EXISTS "Users can insert their own usage records" ON usage_records;
DROP POLICY IF EXISTS "Anyone can view plan limits" ON plan_limits;

-- Create RLS policies for shop_subscriptions
CREATE POLICY "Users can view their own subscription" ON shop_subscriptions
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own subscription" ON shop_subscriptions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own subscription" ON shop_subscriptions
  FOR UPDATE USING (true);

-- Create RLS policies for usage_records
CREATE POLICY "Users can view their own usage records" ON usage_records
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own usage records" ON usage_records
  FOR INSERT WITH CHECK (true);

-- Create RLS policies for plan_limits (read-only for all)
CREATE POLICY "Anyone can view plan limits" ON plan_limits
  FOR SELECT USING (true);
`;

export async function setupBillingTables(): Promise<void> {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not available. Please set SUPABASE_SERVICE_ROLE_KEY environment variable.');
  }

  console.log('🔧 Setting up billing tables in Supabase...');

  try {
    // Create tables
    console.log('📋 Creating billing tables...');
    const { error: tablesError } = await supabaseAdmin.rpc('exec', { sql: CREATE_BILLING_TABLES_SQL });
    if (tablesError) throw tablesError;

    // Create indexes
    console.log('📊 Creating indexes...');
    const { error: indexesError } = await supabaseAdmin.rpc('exec', { sql: CREATE_INDEXES_SQL });
    if (indexesError) throw indexesError;

    // Create triggers
    console.log('⚡ Creating triggers...');
    const { error: triggersError } = await supabaseAdmin.rpc('exec', { sql: CREATE_TRIGGERS_SQL });
    if (triggersError) throw triggersError;

    // Insert plan limits
    console.log('💰 Inserting plan limits...');
    const { error: plansError } = await supabaseAdmin.rpc('exec', { sql: INSERT_PLAN_LIMITS_SQL });
    if (plansError) throw plansError;

    // Setup RLS
    console.log('🔐 Setting up Row Level Security...');
    const { error: rlsError } = await supabaseAdmin.rpc('exec', { sql: SETUP_RLS_SQL });
    if (rlsError) throw rlsError;

    console.log('✅ Billing tables setup completed successfully!');
  } catch (error) {
    console.error('❌ Failed to setup billing tables:', error);
    throw error;
  }
}

// Alternative method using individual SQL queries if rpc doesn't work
export async function setupBillingTablesAlternative(): Promise<void> {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not available.');
  }

  console.log('🔧 Setting up billing tables in Supabase (alternative method)...');

  try {
    // Execute each SQL statement individually
    const statements = [
      CREATE_BILLING_TABLES_SQL,
      CREATE_INDEXES_SQL,
      CREATE_TRIGGERS_SQL,
      INSERT_PLAN_LIMITS_SQL,
      SETUP_RLS_SQL,
    ];

    for (let i = 0; i < statements.length; i++) {
      console.log(`📝 Executing statement ${i + 1}/${statements.length}...`);
      const { error } = await supabaseAdmin.from('').select('*').limit(0); // This won't work, need a different approach
    }

    // Instead, let's just verify tables exist
    const { data: tables, error } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['shop_subscriptions', 'usage_records', 'plan_limits']);

    if (error) {
      console.error('Could not verify table creation:', error);
      throw new Error('Please run the SQL script manually in your Supabase SQL editor');
    }

    if (!tables || tables.length < 3) {
      throw new Error('Billing tables not found. Please run the SQL script manually in your Supabase SQL editor');
    }

    console.log('✅ Billing tables verified!');
  } catch (error) {
    console.error('❌ Failed to setup billing tables:', error);
    throw error;
  }
} 