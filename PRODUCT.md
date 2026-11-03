# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Engineering teams, internal operators, knowledge workers, and technical administrators deploying private, high-trust AI assistants over internal company documentation, technical wikis, and enterprise knowledge repositories.

## Product Purpose

An enterprise-grade, high-trust internal knowledge assistant platform featuring strict role-based access control (RLS), sub-50ms pgvector HNSW search, and verifiable document citations, paired with an independent administration studio console.

## Positioning

High-trust, self-hosted enterprise RAG with zero vendor lock-in, strict organizational data isolation, and a dedicated standalone studio on port 3333 for infrastructure, inference, and ingestion management.

## Operating Context

Next.js 16.0.10 + React 19.2.1 App Router on port 3000 for the internal assistant interface; Supabase (PostgreSQL + pgvector HNSW, auth, realtime, RLS); Vercel AI SDK 6 with OpenRouter/Groq/OpenAI routing; Standalone Studio SPA on port 3333 (backed by `scripts/config-server.js` Express API) for configuration and pipeline telemetry.

## Capabilities and Constraints

Capabilities: HNSW vector search (<50ms queries), single-tenant shared-KB and multi-tenant org isolation modes, multi-format document parsing (PDF, DOCX, TXT, EPUB), source citations with direct context passages, RAG behavior modes (Strict/Balanced/Flexible), MCP tool execution, Nango cloud connectors, and Firecrawl web scraping.

Constraints: Complete departure from the legacy "ChatRag" moniker and assets. The archaic 17,000-line static HTML config page on port 3333 is designated for architectural replacement with a clean, modern Vite/React SPA studio. Config contracts across `.env.local` and `scripts/config-server.js` must remain synchronized.

## Brand Commitments

Full rebrand locked: **Pulsar** (Pulsar Enterprise Knowledge Platform & Pulsar Studio). Abandon Carlos Marcial and "ChatRag" branding, logos, and template artifacts. Visual system anchored in the Peter Saville Factory Records aesthetic (FAC-01 through FAC-23 catalog sequencing, matte black canvas, stacked pulsar frequency telemetry, electric cyan accents).

## Evidence on Hand

- `src/app/` (Next.js 16 App Router application on port 3000)
- `scripts/config-server.js` (Express API server handling `.env.local` mutations and document pipelines)
- `supabase/single-tenant-setup.sql` & `supabase/multi-tenant-setup.sql` (Database schemas and RLS policies)
- `.impeccable/surface-briefs/settings.md` (Surface brief)

## Product Principles

1. High-trust & privacy first — internal enterprise data stays strictly isolated under verified RLS boundaries.
2. Sub-50ms retrieval performance — pgvector HNSW index optimization is a non-negotiable differentiator.
3. Clean decoupling — the end-user assistant (:3000) and the administrative studio (:3333) operate as distinct, focused surfaces.
4. Zero starter-kit residue — eliminate all legacy template baggage in favor of production-grade engineering.

## Accessibility & Inclusion

WCAG AA compliance required across all studio and assistant controls (minimum 4.5:1 text contrast, accessible keyboard tab navigation, and clear semantic form labeling).
