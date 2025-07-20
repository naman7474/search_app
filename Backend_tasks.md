1. Shopify product-sync pipeline
T-1 Create/extend “Shopify ingest service”
- Re-use app/lib/indexing/product-indexer.server.ts.
- Add a “Shopify fetcher” layer that:
  - Paginates over REST Admin /products.json?fields=… (incl. images, variants, options).
  - Converts raw records into ShopifyProduct interface expected by indexProduct.
- Wire it to the existing webhooks (webhooks.products.{create|update|delete}.tsx) and a manual “Full sync” endpoint (e.g. POST /api.index).
T-2 Store original JSON blobs for audit/debug
  - Create raw_shopify_products table: id, shop_domain, shopify_product_id, payload JSONB, fetched_at.
T-3 Incremental change detection
- Before re-indexing, hash the important fields and skip unchanged products (saves OpenAI embedding calls).

2. Search API (text + voice)
T-4 Unify /api.search to accept both text and voice
- Extend the existing route to accept audio/* (webm) via multipart.
Add small service (server-side) that calls OpenAI Whisper (or AssemblyAI) → returns transcript → forward rest of flow to existing hybridSearch.
T-5 Expand keyword matching fields
performKeywordSearch currently ORs over title/description/vendor/type.
Add tags, variant sku, option values; update OR builder accordingly.
T-6 Pagination & sorting
hybridSearch returns only top-N. Add cursor/offset support and expose sort=price_asc|price_desc|relevance.

3. Search result delivery
T-7 Create typed response DTO
Move the ProductCandidate type to a shared types.ts and expose only the fields that UI needs (avoid leaking internal similarity scores unless requested with debug=true).
T-8 Caching layer
app/lib/cache/search-cache.server.ts exists – plug it into hybridSearch so identical queries (query + filters) short-circuit to Redis.

4. Analytics & attribution
stores                  (id, domain, plan, created_at…)
search_queries          (id, store_id, raw_query, created_at)
processed_queries       (id, search_query_id, nlp_json, created_at)
search_results          (id, processed_query_id, product_id, rank, served_at)
click_events            (id, search_result_id, clicked_at)
purchase_attributions   (id, click_event_id, order_id, purchased_product_id, created_at)
T-9 Build server-side logging helpers
logSearch, logClick, logPurchase utilities.
Expose logging endpoints the front-end can fire (POST /api.analytics exists but is skeletal).
T-10 Shopify Order webhook
Subscribe to orders/create → look up last click by customer/session → populate purchase_attributions (“same vs. different product”).

5. Operations & quality
T-14 Monitoring & alerting
Supabase log polling or a simple cron that emails on high error rates / failed embeddings.
T-15 Automated tests
Add unit tests for reciprocalRankFusion, calculatePriceRange, and an integration test for end-to-end “search → click → order” analytics flow.
T-16 Documentation
Extend README.md with a “Data flow” diagram and “How to reindex” guide.

6. The “Add to Cart” buttons render correctly but the click handler throws a runtime error before the network call is even attempted.
What’s happening:
1. Each card’s button is rendered with
   onclick="addToCart('123', 'Product Title')"
(see product grid markup in app/routes/search.tsx, around line 260).
2. The handler is defined later in the same file as
   function addToCart(productId, productTitle) {
     const button = event.target;      // ← relies on `event`
     …
   }
3. Because event isn’t passed in, inside the function event is undefined.
The very first statement (event.target) therefore throws a ReferenceError, aborting execution and the rest of the logic (variant lookup → /cart/add.js) never runs.
Why it sometimes worked during local tests
Some browsers (very old Chrome / IE) used to expose a global window.event, which would make this mistake less obvious. Modern browsers do not.
Fix
Use this instead of event:
    onclick="addToCart(this, '123', 'Product Title')"
    function addToCart(buttonEl, productId, productTitle) {
  const button = buttonEl;
  …
    }

7. Codebase cleanup & search unification
T-17 Consolidate search implementations
- Merge `searchProducts` and `hybridSearch` into a single `searchService` that can run strategies: `vector`, `keyword`, `hybrid`.
- Expose config flag (env or per-shop) to choose strategy; default to `hybrid`.
- Deprecate `/apps/xpertsearch/api.search` fallback differences; both the API and Liquid page should call the same service.

T-18 Extract shared helpers
- Move `escapeHtml`, `generateFacets`, price-range calculators, etc. into `app/lib/utils/`.
- Add unit tests for helpers.

T-19 Eliminate inline JS handlers
- Replace `onclick="addToCart(...)"` & similar with event listeners bound in a dedicated ES module (`search-page.js`).
- Pass the button element explicitly (fixes the global `event` bug) or use `e.currentTarget`.

T-20 Strengthen Quick-View & Add-to-Cart
- Handle network failures & show retry without leaking internal errors.
- Prefetch first available variant ID during initial product fetch to remove extra API round-trip.

T-21 Accessibility & SEO
- Make product cards real `<a>` elements for keyboard navigation; use `aria-label` for action buttons.
- Ensure modals trap focus and announce via `aria-modal`.

T-22 Error resilience
- Wrap Supabase calls with circuit-breaker / retry helper.
- Log errors to Sentry.

T-23 Schema / data consistency
- Consolidate `price_min`/`price_max` and `price_range` into one canonical representation.
- Add DB constraints for non-negative prices & inventory.

T-24 CI / Quality gates
- ESLint + Prettier pre-commit hooks.
- Vitest unit tests must pass; run in GitHub Actions.

T-25 Documentation
- Create `docs/search_flow.md` explaining end-to-end request → response path.
- Add "How to contribute" section outlining code style and module boundaries.

8. Production-readiness hardening
T-26 Security & compliance
- Enforce HMAC / signature verification on all webhooks & App Proxy requests.
- Implement Shopify JWT session validation for private API endpoints.
- Add Supabase RLS policies for every table (`products`, `product_variants`, `raw_shopify_products`, analytics tables).
- Run `mcp_supabase_get_advisors` weekly and fail CI if critical issues are found.
- Store secrets in environment variables or Vault – never commit tokens.
- Provide GDPR endpoints: customer data wipe & export.

T-27 Rate-limiting & abuse prevention
- Centralize rate-limiting middleware (Redis backed) with per-shop + IP buckets.
- Add exponential back-off on embedding RPC calls.

T-28 Observability
- Integrate Sentry (errors) and OpenTelemetry (traces) for all server routes.
- Export Supabase query stats to Grafana dashboard.
- Create `/health` route to check DB, Redis, OpenAI quotas.

T-29 Background processing & resilience
- Move embedding generation and large re-index jobs to a queue worker (Supabase Edge Functions or Resend + cron).
- Implement retry with dead-letter queue for failed embeddings.

T-30 Automated backups & migrations
- Enable daily Postgres backups.
- Add `supabase migration:lint` in CI to catch breaking changes.
- Provide rollback docs (`supabase reset_branch`).

T-31 Performance & cost controls
- Cache search results (query + filter hash) in Redis for 5 min.
- Cache embeddings for identical queries in Supabase `query_embeddings` table.
- Use pruning job to delete analytics >180 days old.

T-32 Load & stress testing
- Create k6 scripts to simulate 100 RPS search traffic; include cart‐adds.
- Gate production deploy on <250 ms P95 search latency.

T-33 Documentation polish
- Update `README` with env-setup, “zero-downtime deploy” guide, and FAQ.
- Add architecture diagram (Mermaid) linking services & data stores.

T-34 Staging & feature flags
- Use Supabase branch `staging` with preview URLs.
- Feature flag (Supabase `config` table) for new hybrid ranking model.

T-35 Incident response runbook
- On-call rotation, SLAs, escalation contacts.
- Include quick commands for pausing project, restoring from backup, and rolling back embeds.

 
