# Architecture

## Overview
BIA OPS is organized as a small monorepo with three active domains:

- `apps/web`: client and internal web UI
- `apps/api`: application API and background work
- `packages/database`: Supabase schema, migration and RLS layer

The database is the system of record for clients, campaigns, metrics, alerts, reports and access tokens. The app layer should treat Supabase as the source of truth for domain data and use the API only for orchestration, integrations and background jobs.

## Data Model
The schema mirrors the shared domain types in `packages/shared/src/index.ts`.

Core tables:

- `profiles`: application users mapped to `auth.users`
- `clients`: account record for each customer
- `client_access_tokens`: hashed access tokens for client portal entry
- `campaigns`: Meta, Google and TikTok campaigns
- `metric_daily`: daily performance metrics
- `alerts`: automated performance alerts
- `action_logs`: expert actions and audit trail
- `creatives`: creative performance snapshots
- `reports` and `report_top_creatives`: reporting layer
- `chat_messages`: client, AI and expert conversations
- `onboarding_checklists`: onboarding progress
- `revenue_tracking`: finance and retention reporting

## Auth And Access
The schema uses Supabase Auth for authenticated users and RLS for data isolation.

- A trigger on `auth.users` creates or updates the matching row in `profiles`
- `profiles.role` stores `ceo`, `expert` or `client`
- `clients.user_id` links a client account owner to their account
- `clients.assigned_expert_id` links the expert responsible for the account
- `client_access_tokens` stores only token hashes; raw tokens are returned once by a security definer function

Recommended access patterns:

- CEO users can manage all operational data
- Experts can manage the clients assigned to them
- Clients can read their own account data and submit portal messages through the API layer

## Database Rules
The migration adds:

- enums for all controlled values
- foreign keys and check constraints
- indexes for the common filters used by the dashboard and background jobs
- `updated_at` triggers on mutable tables
- row-level security policies on every user-facing table

## Deploy Flow
Production deploys follow a simple chain:

1. GitHub Actions deploys over SSH
2. The VPS updates the checked-out repository in `APP_DIR`
3. Dependencies are installed and the app is built
4. PM2 reloads the existing process or starts it if it does not exist
5. Nginx continues to proxy traffic to the app ports

This keeps the server stateless enough to be rebuilt from Git history while still being simple to operate.
