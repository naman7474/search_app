import { setupBillingTables } from '../lib/billing/setup-billing-tables.server';

async function main() {
  try {
    console.log('🚀 Starting billing setup...');
    await setupBillingTables();
    console.log('✅ Billing setup completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Billing setup failed:', error);
    console.log('\n📋 Manual Setup Instructions:');
    console.log('1. Open your Supabase dashboard');
    console.log('2. Go to the SQL editor');
    console.log('3. Copy and paste the content from supabase_billing_tables.sql');
    console.log('4. Execute the SQL script');
    process.exit(1);
  }
}

main(); 