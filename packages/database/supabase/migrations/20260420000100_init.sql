begin;

create extension if not exists citext;

-- ── Enums ────────────────────────────────────────────────────────────────────
create type public.app_user_role as enum ('ceo', 'expert', 'client');
create type public.app_plan_type as enum ('sprint', 'escalado', 'enterprise');
create type public.app_health_status as enum ('green', 'yellow', 'red');
create type public.app_platform as enum ('meta', 'google', 'tiktok');
create type public.app_campaign_status as enum ('active', 'paused', 'learning', 'ended');
create type public.app_alert_severity as enum ('red', 'yellow');
create type public.app_alert_status as enum ('active', 'resolved', 'escalated');
create type public.app_alert_type as enum (
  'roas_drop',
  'cpa_spike',
  'frequency',
  'budget_exhausted',
  'account_inactive',
  'ctr_drop',
  'no_action'
);
create type public.app_creative_status as enum ('winner', 'watch', 'loser');
create type public.app_chat_role as enum ('client', 'ai', 'expert');
create type public.app_report_type as enum ('biweekly', 'monthly', 'custom');
create type public.app_client_status as enum ('pending_onboarding', 'onboarding', 'active', 'paused', 'churned');

-- ── Functions with NO table dependencies ─────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_service_role()
returns boolean
language sql
stable
set search_path = public
as $$
  select coalesce(auth.role(), '') = 'service_role';
$$;

create or replace function public.hash_access_token(p_token text)
returns text
language sql
immutable
set search_path = public
as $$
  select encode(sha256(p_token::bytea), 'hex');
$$;

-- ── TABLE: profiles (must exist before functions that query it) ───────────────
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email citext not null unique,
  role public.app_user_role not null default 'client',
  full_name text not null,
  avatar_url text,
  telegram_chat_id text,
  whatsapp_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Functions that depend on profiles only ───────────────────────────────────
create or replace function public.current_user_role()
returns public.app_user_role
language sql
stable
security definer
set search_path = public
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid();
$$;

create or replace function public.is_ceo()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_service_role() or public.current_user_role() = 'ceo';
$$;

create or replace function public.sync_new_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.app_user_role;
  v_full_name text;
begin
  v_role := case lower(coalesce(new.raw_user_meta_data ->> 'role', ''))
    when 'ceo'    then 'ceo'::public.app_user_role
    when 'expert' then 'expert'::public.app_user_role
    else               'client'::public.app_user_role
  end;

  v_full_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'name', ''),
    split_part(coalesce(new.email, ''), '@', 1)
  );

  insert into public.profiles (
    id, email, role, full_name, avatar_url, telegram_chat_id, whatsapp_number
  ) values (
    new.id,
    new.email,
    v_role,
    v_full_name,
    nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
    nullif(new.raw_user_meta_data ->> 'telegram_chat_id', ''),
    nullif(new.raw_user_meta_data ->> 'whatsapp_number', '')
  )
  on conflict (id) do update set
    email             = excluded.email,
    role              = excluded.role,
    full_name         = excluded.full_name,
    avatar_url        = excluded.avatar_url,
    telegram_chat_id  = excluded.telegram_chat_id,
    whatsapp_number   = excluded.whatsapp_number,
    updated_at        = now();

  return new;
end;
$$;

-- ── TABLE: clients (must exist before can_access_client) ─────────────────────
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  hotmart_order_id text unique,
  plan_type public.app_plan_type not null,
  plan_price numeric(12,2) not null default 0 check (plan_price >= 0),
  billing_date date not null,
  next_billing_date date not null,
  health_status public.app_health_status not null default 'green',
  onboarding_step smallint not null default 0 check (onboarding_step between 0 and 7),
  assigned_expert_id uuid references public.profiles(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
  primary_access_token_id uuid,
  status public.app_client_status not null default 'pending_onboarding',
  business_name text not null,
  contact_name text not null,
  email citext not null unique,
  whatsapp text not null,
  country text not null,
  website text,
  business_type text not null,
  category text not null,
  product_description text not null,
  ideal_client text not null,
  monthly_sales_range text not null,
  monthly_ad_spend_range text not null,
  active_platforms public.app_platform[] not null default '{}'::public.app_platform[],
  current_roas numeric(12,4) not null default 0 check (current_roas >= 0),
  main_goal text not null,
  time_horizon text not null,
  main_problem text not null,
  has_stock boolean not null default false,
  has_meta_access boolean not null default false,
  has_google_access boolean not null default false,
  has_analytics boolean not null default false,
  has_shopify boolean not null default false,
  has_pixel boolean not null default false,
  has_conversion_data boolean not null default false,
  has_catalog boolean not null default false,
  has_creative_assets boolean not null default false,
  previous_agency_experience text not null,
  how_found_us text not null,
  additional_notes text,
  meta_ad_account_id text,
  meta_access_token text,
  last_meta_sync timestamptz
);

-- ── TABLE: client_access_tokens ───────────────────────────────────────────────
create table public.client_access_tokens (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  token_hash text not null unique,
  token_prefix text not null check (char_length(token_prefix) = 8),
  label text,
  last_used_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- FK circular: clients.primary_access_token_id → client_access_tokens
alter table public.clients
  add constraint clients_primary_access_token_fk
  foreign key (primary_access_token_id)
  references public.client_access_tokens(id)
  on delete set null;

-- ── Functions that depend on clients + client_access_tokens ──────────────────
create or replace function public.can_access_client(p_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_ceo()
    or exists (
      select 1
      from public.clients c
      where c.id = p_client_id
        and (c.user_id = auth.uid() or c.assigned_expert_id = auth.uid())
    );
$$;

create or replace function public.create_client_access_token(
  p_client_id uuid,
  p_label text default null,
  p_expires_at timestamptz default null
)
returns table (
  token_id uuid,
  raw_token text,
  token_prefix text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_raw_token text;
  v_token_hash text;
begin
  if not public.is_ceo() then
    raise exception 'insufficient privileges';
  end if;

  if not exists (select 1 from public.clients where id = p_client_id) then
    raise exception 'client not found';
  end if;

  v_raw_token  := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  v_token_hash := public.hash_access_token(v_raw_token);

  insert into public.client_access_tokens (
    client_id, token_hash, token_prefix, label, expires_at, created_by
  ) values (
    p_client_id, v_token_hash, left(v_raw_token, 8), p_label, p_expires_at, auth.uid()
  )
  returning id, token_prefix
  into token_id, token_prefix;

  update public.clients
  set primary_access_token_id = token_id, updated_at = now()
  where id = p_client_id;

  return query select token_id, v_raw_token, token_prefix;
end;
$$;

create or replace function public.revoke_client_access_token(p_token_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_id uuid;
begin
  if not public.is_ceo() then
    raise exception 'insufficient privileges';
  end if;

  update public.client_access_tokens
  set revoked_at = now(), updated_at = now()
  where id = p_token_id
  returning client_id into v_client_id;

  if v_client_id is null then
    raise exception 'token not found';
  end if;

  update public.clients
  set primary_access_token_id = null, updated_at = now()
  where id = v_client_id
    and primary_access_token_id = p_token_id;
end;
$$;

create or replace function public.verify_client_access_token(p_raw_token text)
returns table (token_id uuid, client_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash text := public.hash_access_token(p_raw_token);
begin
  return query
  select t.id, t.client_id
  from public.client_access_tokens t
  where t.token_hash = v_hash
    and t.revoked_at is null
    and (t.expires_at is null or t.expires_at > now())
  limit 1;

  update public.client_access_tokens
  set last_used_at = now(), updated_at = now()
  where token_hash = v_hash
    and revoked_at is null
    and (expires_at is null or expires_at > now());
end;
$$;

-- ── Remaining tables ──────────────────────────────────────────────────────────
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  campaign_name text not null,
  platform public.app_platform not null,
  status public.app_campaign_status not null default 'active',
  objective text not null,
  daily_budget numeric(12,2) not null default 0 check (daily_budget >= 0),
  monthly_budget numeric(12,2) not null default 0 check (monthly_budget >= 0),
  start_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, campaign_name)
);

create table public.metric_daily (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  date date not null,
  spend numeric(12,2) not null default 0 check (spend >= 0),
  impressions bigint not null default 0 check (impressions >= 0),
  reach bigint not null default 0 check (reach >= 0),
  clicks bigint not null default 0 check (clicks >= 0),
  ctr numeric(12,4) not null default 0 check (ctr >= 0),
  cpm numeric(12,4) not null default 0 check (cpm >= 0),
  cpc numeric(12,4) not null default 0 check (cpc >= 0),
  roas numeric(12,4) not null default 0 check (roas >= 0),
  cpa numeric(12,4) not null default 0 check (cpa >= 0),
  conversions integer not null default 0 check (conversions >= 0),
  revenue_generated numeric(12,2) not null default 0 check (revenue_generated >= 0),
  frequency numeric(12,4) not null default 0 check (frequency >= 0),
  quality_ranking text
);

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  severity public.app_alert_severity not null,
  alert_type public.app_alert_type not null,
  metric_affected text not null,
  current_value numeric(14,4) not null,
  benchmark_value numeric(14,4) not null,
  threshold_exceeded text not null,
  suggested_action text not null,
  expert_notes text,
  status public.app_alert_status not null default 'active',
  resolved_by uuid references public.profiles(id) on delete set null
);

create table public.action_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  expert_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  action_type text not null,
  description text not null,
  before_state jsonb,
  after_state jsonb,
  alert_id uuid references public.alerts(id) on delete set null
);

create table public.creatives (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  name text not null,
  thumbnail_url text not null,
  spend numeric(12,2) not null default 0 check (spend >= 0),
  roas numeric(12,4) not null default 0 check (roas >= 0),
  conversions integer not null default 0 check (conversions >= 0),
  status public.app_creative_status not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  period_start date not null,
  period_end date not null,
  report_type public.app_report_type not null,
  total_spend numeric(12,2) not null default 0 check (total_spend >= 0),
  avg_roas numeric(12,4) not null default 0 check (avg_roas >= 0),
  total_reach bigint not null default 0 check (total_reach >= 0),
  total_impressions bigint not null default 0 check (total_impressions >= 0),
  recommendations text not null,
  pdf_url text,
  sent_at timestamptz,
  sent_to_email citext,
  unique (client_id, period_start, period_end, report_type)
);

create table public.report_top_creatives (
  report_id uuid not null references public.reports(id) on delete cascade,
  sort_order smallint not null check (sort_order between 1 and 10),
  creative_id uuid references public.creatives(id) on delete set null,
  name text not null,
  thumbnail_url text not null,
  spend numeric(12,2) not null default 0 check (spend >= 0),
  roas numeric(12,4) not null default 0 check (roas >= 0),
  conversions integer not null default 0 check (conversions >= 0),
  status public.app_creative_status not null,
  created_at timestamptz not null default now(),
  primary key (report_id, sort_order)
);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  role public.app_chat_role not null,
  content text not null,
  escalated_to_expert boolean not null default false,
  expert_notified_at timestamptz,
  meta_context_snapshot jsonb not null default '{}'::jsonb
);

create table public.onboarding_checklists (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null unique references public.clients(id) on delete cascade,
  step_1_briefing boolean not null default false,
  step_1_briefing_at timestamptz,
  step_2_meta_access boolean not null default false,
  step_2_meta_access_at timestamptz,
  step_3_campaign_built boolean not null default false,
  step_3_campaign_built_at timestamptz,
  step_4_creatives_uploaded boolean not null default false,
  step_4_creatives_uploaded_at timestamptz,
  step_5_pixel_verified boolean not null default false,
  step_5_pixel_verified_at timestamptz,
  step_6_campaign_live boolean not null default false,
  step_6_campaign_live_at timestamptz,
  step_7_first_report_sent boolean not null default false,
  step_7_first_report_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.revenue_tracking (
  id uuid primary key default gen_random_uuid(),
  month smallint not null check (month between 1 and 12),
  year smallint not null check (year between 2000 and 3000),
  gross_revenue numeric(14,2) not null default 0,
  hotmart_fee numeric(14,2) not null default 0,
  bianca_commission numeric(14,2) not null default 0,
  tools_cost numeric(14,2) not null default 0,
  expert_salary numeric(14,2) not null default 0,
  net_mario numeric(14,2) not null default 0,
  total_clients integer not null default 0 check (total_clients >= 0),
  new_clients integer not null default 0 check (new_clients >= 0),
  churned_clients integer not null default 0 check (churned_clients >= 0),
  retention_rate numeric(8,4) not null default 0 check (retention_rate >= 0 and retention_rate <= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (month, year)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
create index clients_assigned_expert_id_idx on public.clients (assigned_expert_id);
create index clients_user_id_idx on public.clients (user_id);
create index clients_status_idx on public.clients (status);
create index clients_plan_type_idx on public.clients (plan_type);
create index clients_active_platforms_idx on public.clients using gin (active_platforms);
create index client_access_tokens_client_id_idx on public.client_access_tokens (client_id);
create index client_access_tokens_active_idx on public.client_access_tokens (client_id) where revoked_at is null;
create index campaigns_client_id_idx on public.campaigns (client_id);
create index campaigns_status_idx on public.campaigns (status);
create index campaigns_platform_idx on public.campaigns (platform);
create index metric_daily_client_date_idx on public.metric_daily (client_id, date desc);
create index metric_daily_campaign_idx on public.metric_daily (campaign_id);
create unique index metric_daily_client_date_null_campaign_idx
  on public.metric_daily (client_id, date)
  where campaign_id is null;
create unique index metric_daily_client_date_campaign_idx
  on public.metric_daily (client_id, date, campaign_id)
  where campaign_id is not null;
create index alerts_client_status_idx on public.alerts (client_id, status);
create index alerts_severity_idx on public.alerts (severity);
create index action_logs_client_created_idx on public.action_logs (client_id, created_at desc);
create index action_logs_expert_created_idx on public.action_logs (expert_id, created_at desc);
create index creatives_client_status_idx on public.creatives (client_id, status);
create index creatives_campaign_idx on public.creatives (campaign_id);
create index reports_client_period_idx on public.reports (client_id, period_start desc, period_end desc);
create index report_top_creatives_report_idx on public.report_top_creatives (report_id);
create index chat_messages_client_created_idx on public.chat_messages (client_id, created_at desc);
create index onboarding_checklists_client_idx on public.onboarding_checklists (client_id);
create index revenue_tracking_year_month_idx on public.revenue_tracking (year desc, month desc);

-- ── Triggers ──────────────────────────────────────────────────────────────────
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

create trigger set_clients_updated_at
  before update on public.clients
  for each row execute function public.touch_updated_at();

create trigger set_client_access_tokens_updated_at
  before update on public.client_access_tokens
  for each row execute function public.touch_updated_at();

create trigger set_campaigns_updated_at
  before update on public.campaigns
  for each row execute function public.touch_updated_at();

create trigger set_alerts_updated_at
  before update on public.alerts
  for each row execute function public.touch_updated_at();

create trigger set_action_logs_updated_at
  before update on public.action_logs
  for each row execute function public.touch_updated_at();

create trigger set_creatives_updated_at
  before update on public.creatives
  for each row execute function public.touch_updated_at();

create trigger set_reports_updated_at
  before update on public.reports
  for each row execute function public.touch_updated_at();

create trigger set_chat_messages_updated_at
  before update on public.chat_messages
  for each row execute function public.touch_updated_at();

create trigger set_onboarding_checklists_updated_at
  before update on public.onboarding_checklists
  for each row execute function public.touch_updated_at();

create trigger set_revenue_tracking_updated_at
  before update on public.revenue_tracking
  for each row execute function public.touch_updated_at();

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.sync_new_profile();

-- ── Row Level Security ────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.client_access_tokens enable row level security;
alter table public.campaigns enable row level security;
alter table public.metric_daily enable row level security;
alter table public.alerts enable row level security;
alter table public.action_logs enable row level security;
alter table public.creatives enable row level security;
alter table public.reports enable row level security;
alter table public.report_top_creatives enable row level security;
alter table public.chat_messages enable row level security;
alter table public.onboarding_checklists enable row level security;
alter table public.revenue_tracking enable row level security;

-- ── Policies ──────────────────────────────────────────────────────────────────
create policy profiles_select_own_or_ceo
  on public.profiles for select
  using (id = auth.uid() or public.is_ceo());

create policy profiles_update_own_or_ceo
  on public.profiles for update
  using (id = auth.uid() or public.is_ceo())
  with check (
    public.is_ceo()
    or (
      id = auth.uid()
      and role = public.current_user_role()
      and email = (select p.email from public.profiles p where p.id = auth.uid())
    )
  );

create policy clients_select_access
  on public.clients for select
  using (public.can_access_client(id));

create policy clients_insert_ceo
  on public.clients for insert
  with check (public.is_ceo());

create policy clients_update_access
  on public.clients for update
  using (public.is_ceo() or assigned_expert_id = auth.uid())
  with check (public.is_ceo() or assigned_expert_id = auth.uid());

create policy clients_delete_ceo
  on public.clients for delete
  using (public.is_ceo());

create policy client_access_tokens_select_ceo
  on public.client_access_tokens for select
  using (public.is_ceo());

create policy client_access_tokens_manage_ceo
  on public.client_access_tokens for all
  using (public.is_ceo()) with check (public.is_ceo());

create policy campaigns_select_access
  on public.campaigns for select
  using (public.can_access_client(client_id));

create policy campaigns_write_expert_or_ceo
  on public.campaigns for all
  using (public.is_ceo() or exists (
    select 1 from public.clients c
    where c.id = client_id and c.assigned_expert_id = auth.uid()
  ))
  with check (public.is_ceo() or exists (
    select 1 from public.clients c
    where c.id = client_id and c.assigned_expert_id = auth.uid()
  ));

create policy metric_daily_select_access
  on public.metric_daily for select
  using (public.can_access_client(client_id));

create policy metric_daily_write_expert_or_ceo
  on public.metric_daily for all
  using (public.is_ceo() or exists (
    select 1 from public.clients c
    where c.id = client_id and c.assigned_expert_id = auth.uid()
  ))
  with check (public.is_ceo() or exists (
    select 1 from public.clients c
    where c.id = client_id and c.assigned_expert_id = auth.uid()
  ));

create policy alerts_select_access
  on public.alerts for select
  using (public.can_access_client(client_id));

create policy alerts_write_expert_or_ceo
  on public.alerts for all
  using (public.is_ceo() or exists (
    select 1 from public.clients c
    where c.id = client_id and c.assigned_expert_id = auth.uid()
  ))
  with check (public.is_ceo() or exists (
    select 1 from public.clients c
    where c.id = client_id and c.assigned_expert_id = auth.uid()
  ));

create policy action_logs_select_access
  on public.action_logs for select
  using (public.can_access_client(client_id));

create policy action_logs_write_expert_or_ceo
  on public.action_logs for all
  using (public.is_ceo() or expert_id = auth.uid())
  with check (public.is_ceo() or expert_id = auth.uid());

create policy creatives_select_access
  on public.creatives for select
  using (public.can_access_client(client_id));

create policy creatives_write_expert_or_ceo
  on public.creatives for all
  using (public.is_ceo() or exists (
    select 1 from public.clients c
    where c.id = client_id and c.assigned_expert_id = auth.uid()
  ))
  with check (public.is_ceo() or exists (
    select 1 from public.clients c
    where c.id = client_id and c.assigned_expert_id = auth.uid()
  ));

create policy reports_select_access
  on public.reports for select
  using (public.can_access_client(client_id));

create policy reports_write_expert_or_ceo
  on public.reports for all
  using (public.is_ceo() or exists (
    select 1 from public.clients c
    where c.id = client_id and c.assigned_expert_id = auth.uid()
  ))
  with check (public.is_ceo() or exists (
    select 1 from public.clients c
    where c.id = client_id and c.assigned_expert_id = auth.uid()
  ));

create policy report_top_creatives_select_access
  on public.report_top_creatives for select
  using (exists (
    select 1 from public.reports r
    where r.id = report_id and public.can_access_client(r.client_id)
  ));

create policy report_top_creatives_write_expert_or_ceo
  on public.report_top_creatives for all
  using (public.is_ceo() or exists (
    select 1 from public.reports r
    join public.clients c on c.id = r.client_id
    where r.id = report_id and c.assigned_expert_id = auth.uid()
  ))
  with check (public.is_ceo() or exists (
    select 1 from public.reports r
    join public.clients c on c.id = r.client_id
    where r.id = report_id and c.assigned_expert_id = auth.uid()
  ));

create policy chat_messages_select_access
  on public.chat_messages for select
  using (public.can_access_client(client_id));

create policy chat_messages_insert_access
  on public.chat_messages for insert
  with check (
    public.is_ceo()
    or exists (
      select 1 from public.clients c
      where c.id = client_id
        and (c.user_id = auth.uid() or c.assigned_expert_id = auth.uid())
    )
  );

create policy chat_messages_update_ceo_or_expert
  on public.chat_messages for update
  using (public.is_ceo() or exists (
    select 1 from public.clients c
    where c.id = client_id and c.assigned_expert_id = auth.uid()
  ))
  with check (public.is_ceo() or exists (
    select 1 from public.clients c
    where c.id = client_id and c.assigned_expert_id = auth.uid()
  ));

create policy onboarding_checklists_select_access
  on public.onboarding_checklists for select
  using (public.can_access_client(client_id));

create policy onboarding_checklists_write_access
  on public.onboarding_checklists for all
  using (
    public.is_ceo()
    or exists (
      select 1 from public.clients c
      where c.id = client_id
        and (c.user_id = auth.uid() or c.assigned_expert_id = auth.uid())
    )
  )
  with check (
    public.is_ceo()
    or exists (
      select 1 from public.clients c
      where c.id = client_id
        and (c.user_id = auth.uid() or c.assigned_expert_id = auth.uid())
    )
  );

create policy revenue_tracking_ceo_only
  on public.revenue_tracking for all
  using (public.is_ceo()) with check (public.is_ceo());

-- ── Grants ────────────────────────────────────────────────────────────────────
grant usage on schema public to anon, authenticated, service_role;

grant select, update on public.profiles to authenticated, service_role;
grant select, insert, update, delete on public.clients to authenticated, service_role;
grant select, insert, update, delete on public.client_access_tokens to authenticated, service_role;
grant select, insert, update, delete on public.campaigns to authenticated, service_role;
grant select, insert, update, delete on public.metric_daily to authenticated, service_role;
grant select, insert, update, delete on public.alerts to authenticated, service_role;
grant select, insert, update, delete on public.action_logs to authenticated, service_role;
grant select, insert, update, delete on public.creatives to authenticated, service_role;
grant select, insert, update, delete on public.reports to authenticated, service_role;
grant select, insert, update, delete on public.report_top_creatives to authenticated, service_role;
grant select, insert, update, delete on public.chat_messages to authenticated, service_role;
grant select, insert, update, delete on public.onboarding_checklists to authenticated, service_role;
grant select, insert, update, delete on public.revenue_tracking to authenticated, service_role;

grant execute on function public.create_client_access_token(uuid, text, timestamptz) to authenticated, service_role;
grant execute on function public.revoke_client_access_token(uuid) to authenticated, service_role;
grant execute on function public.verify_client_access_token(text) to authenticated, service_role;

commit;
