# Frontend Tasks & Improvement Backlog

This document tracks all pending work to bring the **AI Search App** storefront experience to production-ready quality.  Tasks are grouped by theme, numbered for easy reference, and kept <150 chars per bullet for grep-ability.

---

## 0. Integrate Conversational Search and Voice Search.
F-43 Integrate Voice Search in the search modal.
F-44 Integrate Conversational Search in the search page.

## 1. Architecture & Code Organization
F-1 Adopt **feature-folder** structure (`components/`, `pages/`, `hooks/`, `services/`).
F-2 Extract common utilities (formatting, fetch wrappers) into `app/lib/frontend-utils`.
F-3 Convert inline-script Liquid into ES modules built via Vite → `/public/assets/*`.
F-4 Enable absolute imports with `tsconfig` paths (`@components/*`, `@hooks/*`).
F-5 Ship type-safe data contracts shared with backend via `app/types/`.

## 2. Design System & UI Consistency
F-6 Replace ad-hoc CSS with Tailwind or our `theme.css` tokens.
F-7 Build **UI kit**: Button, Modal, Badge, Skeleton, Spinner, Toast, etc.
F-8 Create Storybook and document use cases & a11y states.

## 3. Search & Product Listing Experience
F-9 Unify search logic – consume the single backend `searchService`.
F-10 Implement **React Query** (or SWR) for caches, polling, and optimistic UI.
F-11 Add infinite scroll with intersection observer; keep SEO fallback links.
F-12 Progressive enhancement: server-render first page, hydrate facets client-side.
F-13 Debounced auto-suggest (top keywords, products) hitting `/api.suggest`.
F-14 Track impressions & CTR via `POST /api.analytics` (T-9 backend).

## 4. Cart & Checkout Flow
F-15 Fix global `event` misuse (done server side); move to `useAddToCart` hook.
F-16 Prefetch default variant IDs via GraphQL bulk query; remove extra call.
F-17 Expose cart drawer component that reuses Shopify theme-cart state.
F-18 Add optimistic UI & rollback on `/cart/add.js` failure.

## 5. Performance & Core Web Vitals
F-19 Set `priority` + `sizes` on first 3 images, lazy-load rest.
F-20 Use `<link rel="prefetch" as="fetch">` for next search page batch.
F-21 Strip unused CSS (PurgeCSS) and split vendor chunks.
F-22 Measure with Lighthouse CI; budget: LCP <2.5 s, FID <100 ms.

## 6. Accessibility (WCAG 2.1 AA)
F-23 Ensure focus traps in modals; close on ESC.
F-24 Provide `<aria-live>` region for cart notifications.
F-25 Add keyboard shortcuts: `/` to focus search, `?` for help.
F-26 Validate colors: contrast ratio ≥4.5:1 (Dark mode optional).

## 7. Internationalization & Localization
F-27 Move all copy to `locales/en.json` (or i18next resources).
F-28 Detect storefront language & load translations dynamically.
F-29 Format currency & dates with `Intl` APIs.

## 8. Analytics & Experimentation
F-30 Integrate Google Analytics 4.
F-31 Add event helpers (`trackSearch`, `trackAddToCart`).


## 9. Error Handling & Observability
F-33 Global error boundary with user-friendly messages.
F-34 Log frontend errors to Sentry with release + build SHA.
F-35 Implement retry + exponential back-off on transient fetch errors.

## 10. Continuous Integration & Quality Gates
F-36 ESLint + Prettier pre-commit hook via Husky.
F-37 Vitest + React Testing Library coverage ≥80 % lines.
F-38 Playwright e2e: search → add to cart → mini-cart count update.
F-39 Lighthouse CI budget enforcement in PR workflow.

## 11. Documentation
F-40 `docs/frontend_setup.md`: install, dev, build, deploy.
F-41 Storybook deploy on Netlify preview per PR.
F-42 ADR explaining choice of Remix + Shop App Proxy.



> Keep this file alphabetically ordered within each section when adding new tasks. 