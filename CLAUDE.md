# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development
- `npm run dev` - Start development server using Shopify CLI
- `npm run build` - Build the application for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint for code quality checks

### Database Operations
- `npm run setup` - Generate Prisma client and run migrations
- `npm run setup-billing` - Initialize billing tables and plans
- `npx prisma generate` - Generate Prisma client
- `npx prisma migrate deploy` - Apply database migrations

### Shopify Commands
- `npm run deploy` - Deploy app to Shopify
- `npm run config:link` - Link app configuration
- `npm run generate` - Generate Shopify app artifacts

### Testing
No specific test commands are configured. Check if tests exist before assuming testing approach.

## Architecture Overview

This is a Shopify app built with Remix that provides AI-powered search functionality for e-commerce stores.

### Tech Stack
- **Framework**: Remix with TypeScript
- **Database**: SQLite (dev) with Prisma ORM
- **Vector Database**: Supabase with pgvector extension
- **AI/ML**: Google Gemini API (primary), OpenAI (fallback)
- **UI**: Shopify Polaris components
- **Caching**: Redis for search results

### Core Components

#### AI Pipeline (`app/lib/ai/`)
- `query-understanding.server.ts` - Parses natural language queries using LLMs
- `embedding.server.ts` - Generates vector embeddings for semantic search
- `ranking.server.ts` - Re-ranks search results using AI
- `query-pipeline.server.ts` - Orchestrates the full AI search pipeline
- `conversation.server.ts` - Handles conversational search interactions

#### Search Engine (`app/lib/search/`)
- `unified-search.server.ts` - Main search orchestrator
- `hybrid-search.server.ts` - Combines keyword and vector search
- `cached-hybrid-search.server.ts` - Adds caching layer
- `search.server.ts` - Core search utilities

#### Data Layer
- `app/lib/supabase.server.ts` - Supabase client for vector operations
- `app/lib/vector-db/weaviate.server.ts` - Alternative vector database
- `prisma/schema.prisma` - Local SQLite schema for sessions/billing

#### External Integrations
- `app/lib/shopify/` - Shopify API integration and GraphQL fetching
- `app/lib/indexing/product-indexer.server.ts` - Product catalog indexing
- `app/lib/billing/` - Subscription and usage tracking

### Key Patterns

#### Type Safety
- All search interfaces defined in `app/lib/types/search.types.ts`
- DTOs separate internal data from API responses
- Comprehensive TypeScript configuration

#### Error Handling
- Server-side validation using Zod
- Graceful fallbacks for AI service failures
- Debug mode available for troubleshooting

#### Performance
- Redis caching for frequent queries
- Batch processing for product indexing
- Vector similarity search optimized with pgvector

## Environment Setup

Required environment variables (see setup.md for complete list):
- `SHOPIFY_API_KEY` / `SHOPIFY_API_SECRET` - Shopify app credentials
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` - Vector database connection
- `GOOGLE_AI_API_KEY` - Primary AI service (Gemini)
- `OPENAI_API_KEY` - Fallback AI service
- `REDIS_URL` - Caching layer

## Common Workflows

### Adding New Search Features
1. Update types in `search.types.ts`
2. Modify query pipeline in `app/lib/ai/query-pipeline.server.ts`
3. Update search orchestrator in `unified-search.server.ts`
4. Add API endpoint in `app/routes/api.search.ts`

### Database Changes
1. Modify `prisma/schema.prisma`
2. Run `npx prisma migrate dev` (dev) or `npx prisma migrate deploy` (prod)
3. Update types and queries as needed

### Webhook Integration
Product sync webhooks are in `app/routes/webhooks.products.*` and handle:
- Product creation/updates/deletion
- Automatic re-indexing of changed products

## File Organization

### API Routes (`app/routes/`)
- `api.search.ts` - Main search endpoint
- `api.conversation.ts` - Conversational search
- `api.product-*.ts` - Product data endpoints
- `webhooks.*.tsx` - Shopify webhook handlers

### UI Components
- `app/components/ConversationalSearch.tsx` - Main search interface
- Extension UI in `extensions/ai-search-ui/` for storefront integration

### Configuration Files
- `shopify.app.toml` - Shopify app configuration
- `vite.config.ts` - Build configuration
- `tsconfig.json` - TypeScript settings