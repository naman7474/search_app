# AI Search for Shopify - Setup Guide

## Quick Start

This AI-powered search app transforms your Shopify store's search experience using advanced language models and vector search technology.

## Prerequisites

1. **Shopify Partner Account** with app development enabled
2. **Supabase Account** (free tier available)
3. **AI API Access** - Either Google Gemini or OpenAI (or both)

## Environment Variables Setup

Create a `.env` file in your project root with these variables:

```bash
# Shopify App Configuration
SHOPIFY_API_KEY=your_shopify_api_key_here
SHOPIFY_API_SECRET=your_shopify_api_secret_here
SCOPES=read_products,write_products,read_analytics

# Database Configuration (Supabase)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# AI/ML API Keys
GOOGLE_AI_API_KEY=your_google_ai_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# App Configuration
NODE_ENV=development
SHOPIFY_APP_URL=https://your-app-domain.com
SHOPIFY_APP_SESSION_SECRET=your_32_character_session_secret_here
```

## Step-by-Step Setup

### 1. Supabase Database Setup

The database is already configured! Your Supabase project includes:
- ✅ Products table with vector embeddings
- ✅ Product variants table
- ✅ Search analytics tables
- ✅ Vector similarity search indexes

**Project ID:** `tchkuhakhwlmhdlohbqm`

### 2. AI API Configuration

#### Google Gemini (Recommended)
1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Create an API key
3. Add to your `.env` as `GOOGLE_AI_API_KEY`

#### OpenAI (Fallback)
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Create an API key
3. Add to your `.env` as `OPENAI_API_KEY`

### 3. Shopify App Setup

1. Create a new app in your Shopify Partner dashboard
2. Set the app URL to your deployed app
3. Configure these webhooks:
   - `products/create` → `/webhooks/products/create`
   - `products/update` → `/webhooks/products/update`
   - `products/delete` → `/webhooks/products/delete`

### 4. Deployment

Deploy to your preferred platform:

#### Shopify Oxygen (Recommended)
```bash
npm run deploy
```

#### Other Platforms
Make sure to set all environment variables in your hosting platform.

## Using the App

### 1. Install & Sync Products

1. Install the app on a test store
2. Click "Sync Products" to index your catalog
3. Wait for processing to complete

### 2. Test AI Search

Try these natural language queries:
- "red dress under $100"
- "gaming laptop for students"
- "cozy reading chair"
- "gifts for 4 year old boy"

### 3. Monitor Performance

The dashboard shows:
- Search analytics
- Product indexing stats
- Top queries
- Click-through rates

## Features

### 🧠 AI Query Understanding
- Parses natural language queries
- Extracts filters and intent
- Handles conversational search

### 🔍 Semantic Search
- Vector-based product matching
- Finds products by meaning, not just keywords
- Handles synonyms and related terms

### 🎯 AI-Powered Ranking
- Reranks results for relevance
- Considers availability and user intent
- Continuously improves with usage

### 📊 Analytics Dashboard
- Real-time search metrics
- Popular query tracking
- Performance insights

## API Endpoints

- `GET /api/search` - Perform AI search
- `GET /api/index` - Manage product indexing
- `GET /api/analytics` - Get search analytics
- `POST /api/search` - Track click events

## Troubleshooting

### No Search Results
1. Check if products are indexed: Dashboard → Indexing Status
2. Verify AI API keys are valid
3. Run product sync manually

### Slow Search Performance
1. Check AI API latency
2. Verify database indexes are created
3. Consider implementing caching

### Webhook Issues
1. Verify webhook URLs in Shopify
2. Check webhook authentication
3. Monitor app logs for errors

## Support

For technical support:
1. Check the app logs first
2. Verify all environment variables
3. Test API connections individually

## Production Checklist

- [ ] All environment variables configured
- [ ] Database migrations applied
- [ ] Webhooks configured in Shopify
- [ ] AI API keys tested
- [ ] Product sync completed
- [ ] Search functionality tested
- [ ] Analytics dashboard accessible

## Performance Tips

1. **Batch Processing**: Sync products in batches for large catalogs
2. **Caching**: Enable Redis for frequently searched queries
3. **Monitoring**: Set up error tracking with Sentry
4. **Rate Limiting**: Monitor AI API usage to avoid limits

## Security Notes

- Store API keys securely in environment variables
- Use service role keys only on server-side
- Enable Row Level Security in Supabase
- Monitor access logs regularly

Your AI-powered search app is ready to transform your customers' shopping experience! 🚀 