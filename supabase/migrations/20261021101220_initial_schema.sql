-- Kickoff Cards: initial schema, ported from the Base44 entities in base44/entities/*.jsonc.
--
-- Conventions kept from Base44 so the frontend needs minimal changes:
--   * ids are text (imported rows keep their Base44 ids; new rows get a uuid string)
--   * every table has created_date / updated_date / created_by_id
--   * user references (user_id, buyer_id, seller_id, created_by_id, ...) are text holding
--     the user's id: auth.uid()::text for new users, or a legacy Base44 id until that user
--     signs up again (private.relink_legacy_user rewrites them on first sign-up).
-- Access rules mirror each entity's Base44 "rls" block.

create extension if not exists pgcrypto;
create schema if not exists private;

-- ---------------------------------------------------------------------------
-- Profiles (replaces the Base44 built-in User entity)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  display_name text,
  profile_image text,
  role text not null default 'user' check (role in ('admin', 'user')),
  legacy_id text unique,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

-- Users that existed on Base44; consumed when they sign up again with the same email.
create table private.legacy_users (
  legacy_id text primary key,
  email text not null unique,
  full_name text,
  role text not null default 'user',
  created_date timestamptz
);

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

-- Shared triggers ------------------------------------------------------------
create or replace function private.touch_updated_date()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_date := now();
  return new;
end;
$$;

-- Clients cannot forge ownership: created_by_id is always the caller. Service-role
-- inserts (edge functions, imports) have no auth.uid() and keep the supplied value.
create or replace function private.stamp_created_by()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.uid() is not null then
    new.created_by_id := auth.uid()::text;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Entity tables
-- ---------------------------------------------------------------------------
create table public.listings (
  id text primary key default gen_random_uuid()::text,
  title text not null,
  player_name text not null,
  team text,
  nationality text,
  season text,
  competition text,
  manufacturer text,
  card_set text,
  card_number text,
  parallel text,
  variation text,
  is_autograph boolean default false,
  is_patch boolean default false,
  is_rookie boolean default false,
  is_limited_edition boolean default false,
  serial_number text,
  condition text check (condition in ('Mint','Near Mint','Excellent','Very Good','Good','Fair','Poor')),
  description text,
  price numeric(12,2) not null,
  shipping_cost numeric(12,2) default 0,
  international_shipping boolean default false,
  offers_allowed boolean default false,
  is_auction boolean default false,
  auction_end_date timestamptz,
  quantity integer default 1,
  images text[] default '{}',
  status text default 'draft' check (status in ('draft','active','sold','paused','deleted')),
  category text check (category in ('Singles','Lots','Boxes','Packs','Cases','Memorabilia')),
  views integer default 0,
  favorites_count integer default 0,
  seller_name text,
  seller_avatar text,
  is_featured boolean default false,
  needs_review boolean default false,
  created_by_id text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create index listings_status_created_idx on public.listings (status, created_date desc);
create index listings_created_by_idx on public.listings (created_by_id);

create table public.orders (
  id text primary key default gen_random_uuid()::text,
  listing_id text not null,
  listing_title text,
  listing_image text,
  seller_id text not null,
  buyer_id text,
  price numeric(12,2),
  shipping_cost numeric(12,2),
  tax numeric(12,2) default 0,
  discount numeric(12,2) default 0,
  total numeric(12,2) not null,
  status text default 'pending' check (status in ('pending','paid','shipped','delivered','completed','cancelled','returned','refunded')),
  tracking_number text,
  shipping_address jsonb,
  payment_intent_id text,
  quantity integer default 1,
  coupon_code text,
  created_by_id text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create index orders_buyer_idx on public.orders (buyer_id);
create index orders_seller_idx on public.orders (seller_id);

create table public.cart_items (
  id text primary key default gen_random_uuid()::text,
  user_id text not null,
  listing_id text not null,
  quantity integer default 1,
  listing_title text,
  listing_image text,
  listing_price numeric(12,2),
  seller_id text,
  shipping_cost numeric(12,2),
  created_by_id text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create index cart_items_user_idx on public.cart_items (user_id);

create table public.offers (
  id text primary key default gen_random_uuid()::text,
  listing_id text not null,
  buyer_id text not null,
  seller_id text not null,
  amount numeric(12,2) not null,
  status text default 'pending' check (status in ('pending','accepted','declined','expired','countered')),
  message text,
  counter_amount numeric(12,2),
  listing_title text,
  listing_image text,
  created_by_id text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create index offers_buyer_idx on public.offers (buyer_id);
create index offers_seller_idx on public.offers (seller_id);

create table public.messages (
  id text primary key default gen_random_uuid()::text,
  conversation_id text not null,
  sender_id text not null,
  receiver_id text,
  text text not null,
  image_url text,
  is_read boolean default false,
  listing_id text,
  listing_title text,
  created_by_id text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create index messages_sender_idx on public.messages (sender_id, created_date desc);
create index messages_receiver_idx on public.messages (receiver_id, created_date desc);

create table public.reviews (
  id text primary key default gen_random_uuid()::text,
  listing_id text not null,
  seller_id text not null,
  order_id text,
  rating numeric(2,1) not null,
  title text,
  comment text,
  images text[] default '{}',
  buyer_name text,
  buyer_avatar text,
  created_by_id text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create index reviews_listing_idx on public.reviews (listing_id);
create index reviews_created_by_idx on public.reviews (created_by_id);

create table public.favorites (
  id text primary key default gen_random_uuid()::text,
  listing_id text not null,
  user_id text not null,
  created_by_id text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create index favorites_user_listing_idx on public.favorites (user_id, listing_id);

create table public.followers (
  id text primary key default gen_random_uuid()::text,
  follower_id text not null,
  following_id text not null,
  created_by_id text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create index followers_follower_idx on public.followers (follower_id);
create index followers_following_idx on public.followers (following_id);

create table public.notifications (
  id text primary key default gen_random_uuid()::text,
  user_id text not null,
  type text not null check (type in ('message','offer','offer_accepted','item_sold','item_shipped','new_follower','review','system')),
  title text not null,
  body text,
  link text,
  is_read boolean default false,
  related_id text,
  created_by_id text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_date desc);

create table public.coupons (
  id text primary key default gen_random_uuid()::text,
  code text not null,
  discount_type text not null check (discount_type in ('percentage','fixed')),
  discount_value numeric(12,2) not null,
  min_order numeric(12,2) default 0,
  max_uses integer,
  uses_count integer default 0,
  is_active boolean default true,
  expires_at timestamptz,
  created_by_id text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create index coupons_code_idx on public.coupons (code);

create table public.addresses (
  id text primary key default gen_random_uuid()::text,
  user_id text not null,
  label text,
  full_name text not null,
  line1 text not null,
  line2 text,
  city text not null,
  state text,
  postal_code text,
  country text not null,
  phone text,
  is_default boolean default false,
  created_by_id text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create index addresses_user_idx on public.addresses (user_id);

create table public.premium_subscriptions (
  id text primary key default gen_random_uuid()::text,
  user_id text not null,
  stripe_customer_id text,
  stripe_subscription_id text not null,
  status text not null default 'active' check (status in ('active','canceled','past_due','trialing','incomplete')),
  current_period_end timestamptz,
  plan text default 'premium_search',
  created_by_id text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create index premium_subscriptions_user_idx on public.premium_subscriptions (user_id);
create index premium_subscriptions_stripe_idx on public.premium_subscriptions (stripe_subscription_id);

create table public.access_requests (
  id text primary key default gen_random_uuid()::text,
  user_id text,
  user_email text not null,
  device_type text check (device_type in ('mobile','tablet','desktop','unknown')),
  note text not null,
  status text not null default 'pending' check (status in ('pending','approved','denied')),
  created_by_id text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create index access_requests_email_idx on public.access_requests (user_email);

create table public.saved_searches (
  id text primary key default gen_random_uuid()::text,
  user_id text not null,
  keyword text not null,
  created_by_id text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create index saved_searches_user_idx on public.saved_searches (user_id);

create table public.search_activity (
  id text primary key default gen_random_uuid()::text,
  keyword text,
  activity_type text not null check (activity_type in ('search','click','visit')),
  listing_title text,
  listing_image text,
  created_by_id text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create index search_activity_created_idx on public.search_activity (created_date desc);

create table public.listing_reports (
  id text primary key default gen_random_uuid()::text,
  listing_url text not null,
  listing_title text,
  reported_from text,
  reason text not null check (reason in ('wrong_card','wrong_variant','wrong_condition','duplicate','other')),
  comment text default '',
  created_by_id text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create index listing_reports_url_idx on public.listing_reports (listing_url);

create table public.listing_moderation (
  id text primary key default gen_random_uuid()::text,
  listing_url text not null,
  listing_title text,
  status text not null check (status in ('manual_hide','manual_restore')),
  notes text default '',
  created_by_id text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create index listing_moderation_url_idx on public.listing_moderation (listing_url);

create table public.listing_price_history (
  id text primary key default gen_random_uuid()::text,
  listing_id text not null,
  price numeric(12,2) not null, -- AED
  date date not null,
  created_by_id text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  unique (listing_id, date)
);

create table public.popular_cards_cache (
  id text primary key default gen_random_uuid()::text,
  ranking jsonb not null default '[]',
  items_count integer default 0,
  created_by_id text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create table public.guest_search_usage (
  id text primary key default gen_random_uuid()::text,
  ip_address text not null, -- SHA-256 of the guest IP
  search_count integer not null default 1,
  created_by_id text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create index guest_search_usage_ip_idx on public.guest_search_usage (ip_address);

create table public.announcements (
  id text primary key default gen_random_uuid()::text,
  title text not null,
  body text not null,
  is_active boolean default true,
  type text default 'info' check (type in ('info','warning','promo')),
  created_by_id text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create table public.report_settings (
  id text primary key default gen_random_uuid()::text,
  auto_hide_threshold integer not null default 3,
  created_by_id text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

-- Triggers, RLS and Data API grants for every entity table --------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'listings','orders','cart_items','offers','messages','reviews','favorites','followers',
    'notifications','coupons','addresses','premium_subscriptions','access_requests',
    'saved_searches','search_activity','listing_reports','listing_moderation',
    'listing_price_history','popular_cards_cache','guest_search_usage','announcements',
    'report_settings'
  ] loop
    execute format('create trigger touch_updated_date before update on public.%I
                    for each row execute function private.touch_updated_date()', t);
    execute format('create trigger stamp_created_by before insert on public.%I
                    for each row execute function private.stamp_created_by()', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select, insert, update, delete on public.%I to anon, authenticated', t);
  end loop;
end;
$$;

create trigger touch_updated_date before update on public.profiles
  for each row execute function private.touch_updated_date();
alter table public.profiles enable row level security;
grant select, delete on public.profiles to authenticated;
-- Users may edit their own name/photo, never their role or email.
grant update (full_name, display_name, profile_image) on public.profiles to authenticated;

grant usage on schema private to anon, authenticated;
grant execute on function private.is_admin() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Policies (one block per Base44 entity rls)
-- ---------------------------------------------------------------------------
-- Shorthand used below:  me = (select auth.uid())::text,  admin = (select private.is_admin())

-- profiles: own row or admin
create policy "profiles: read own or admin" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select private.is_admin()));
create policy "profiles: update own or admin" on public.profiles for update to authenticated
  using (id = (select auth.uid()) or (select private.is_admin()))
  with check (id = (select auth.uid()) or (select private.is_admin()));
create policy "profiles: admin delete" on public.profiles for delete to authenticated
  using ((select private.is_admin()));

-- listings: anyone reads, signed-in users create, owner/admin edit
create policy "listings: read all" on public.listings for select to anon, authenticated using (true);
create policy "listings: signed-in create" on public.listings for insert to authenticated with check (true);
create policy "listings: owner or admin update" on public.listings for update to authenticated
  using (created_by_id = (select auth.uid())::text or (select private.is_admin()))
  with check (created_by_id = (select auth.uid())::text or (select private.is_admin()));
create policy "listings: owner or admin delete" on public.listings for delete to authenticated
  using (created_by_id = (select auth.uid())::text or (select private.is_admin()));

-- orders: buyer creates; buyer/seller/creator/admin read+edit
create policy "orders: buyer or admin create" on public.orders for insert to authenticated
  with check (buyer_id = (select auth.uid())::text or (select private.is_admin()));
create policy "orders: parties read" on public.orders for select to authenticated
  using (buyer_id = (select auth.uid())::text or seller_id = (select auth.uid())::text
         or created_by_id = (select auth.uid())::text or (select private.is_admin()));
create policy "orders: parties update" on public.orders for update to authenticated
  using (buyer_id = (select auth.uid())::text or seller_id = (select auth.uid())::text
         or created_by_id = (select auth.uid())::text or (select private.is_admin()))
  with check (buyer_id = (select auth.uid())::text or seller_id = (select auth.uid())::text
         or created_by_id = (select auth.uid())::text or (select private.is_admin()));
create policy "orders: parties delete" on public.orders for delete to authenticated
  using (buyer_id = (select auth.uid())::text or seller_id = (select auth.uid())::text
         or created_by_id = (select auth.uid())::text or (select private.is_admin()));

-- offers: same shape as orders
create policy "offers: buyer or admin create" on public.offers for insert to authenticated
  with check (buyer_id = (select auth.uid())::text or (select private.is_admin()));
create policy "offers: parties read" on public.offers for select to authenticated
  using (buyer_id = (select auth.uid())::text or seller_id = (select auth.uid())::text
         or created_by_id = (select auth.uid())::text or (select private.is_admin()));
create policy "offers: parties update" on public.offers for update to authenticated
  using (buyer_id = (select auth.uid())::text or seller_id = (select auth.uid())::text
         or created_by_id = (select auth.uid())::text or (select private.is_admin()))
  with check (buyer_id = (select auth.uid())::text or seller_id = (select auth.uid())::text
         or created_by_id = (select auth.uid())::text or (select private.is_admin()));
create policy "offers: parties delete" on public.offers for delete to authenticated
  using (buyer_id = (select auth.uid())::text or seller_id = (select auth.uid())::text
         or created_by_id = (select auth.uid())::text or (select private.is_admin()));

-- messages: sender creates; sender/receiver read+update; sender deletes
create policy "messages: sender create" on public.messages for insert to authenticated
  with check (sender_id = (select auth.uid())::text or (select private.is_admin()));
create policy "messages: parties read" on public.messages for select to authenticated
  using (sender_id = (select auth.uid())::text or receiver_id = (select auth.uid())::text
         or created_by_id = (select auth.uid())::text or (select private.is_admin()));
create policy "messages: parties update" on public.messages for update to authenticated
  using (sender_id = (select auth.uid())::text or receiver_id = (select auth.uid())::text
         or created_by_id = (select auth.uid())::text or (select private.is_admin()))
  with check (sender_id = (select auth.uid())::text or receiver_id = (select auth.uid())::text
         or created_by_id = (select auth.uid())::text or (select private.is_admin()));
create policy "messages: sender delete" on public.messages for delete to authenticated
  using (sender_id = (select auth.uid())::text or created_by_id = (select auth.uid())::text
         or (select private.is_admin()));

-- reviews: anyone reads, signed-in creates, author/admin edit
create policy "reviews: read all" on public.reviews for select to anon, authenticated using (true);
create policy "reviews: signed-in create" on public.reviews for insert to authenticated with check (true);
create policy "reviews: author or admin update" on public.reviews for update to authenticated
  using (created_by_id = (select auth.uid())::text or (select private.is_admin()))
  with check (created_by_id = (select auth.uid())::text or (select private.is_admin()));
create policy "reviews: author or admin delete" on public.reviews for delete to authenticated
  using (created_by_id = (select auth.uid())::text or (select private.is_admin()));

-- followers: Base44 had no rules; tightened to "anyone reads, you manage your own follows"
create policy "followers: read all" on public.followers for select to anon, authenticated using (true);
create policy "followers: own create" on public.followers for insert to authenticated
  with check (follower_id = (select auth.uid())::text);
create policy "followers: own delete" on public.followers for delete to authenticated
  using (follower_id = (select auth.uid())::text or (select private.is_admin()));

-- notifications: any signed-in user can notify someone; recipient reads/updates/deletes
create policy "notifications: signed-in create" on public.notifications for insert to authenticated with check (true);
create policy "notifications: recipient read" on public.notifications for select to authenticated
  using (user_id = (select auth.uid())::text or created_by_id = (select auth.uid())::text
         or (select private.is_admin()));
create policy "notifications: recipient update" on public.notifications for update to authenticated
  using (user_id = (select auth.uid())::text or created_by_id = (select auth.uid())::text
         or (select private.is_admin()))
  with check (user_id = (select auth.uid())::text or created_by_id = (select auth.uid())::text
         or (select private.is_admin()));
create policy "notifications: recipient delete" on public.notifications for delete to authenticated
  using (user_id = (select auth.uid())::text or created_by_id = (select auth.uid())::text
         or (select private.is_admin()));

-- "own rows" tables: favorites, cart_items, addresses, saved_searches
do $$
declare
  t text;
begin
  foreach t in array array['favorites','cart_items','addresses','saved_searches'] loop
    execute format($p$create policy "%1$s: own create" on public.%1$I for insert to authenticated
      with check (user_id = (select auth.uid())::text or (select private.is_admin()))$p$, t);
    execute format($p$create policy "%1$s: own read" on public.%1$I for select to authenticated
      using (user_id = (select auth.uid())::text or created_by_id = (select auth.uid())::text
             or (select private.is_admin()))$p$, t);
    execute format($p$create policy "%1$s: own update" on public.%1$I for update to authenticated
      using (user_id = (select auth.uid())::text or created_by_id = (select auth.uid())::text
             or (select private.is_admin()))
      with check (user_id = (select auth.uid())::text or (select private.is_admin()))$p$, t);
    execute format($p$create policy "%1$s: own delete" on public.%1$I for delete to authenticated
      using (user_id = (select auth.uid())::text or created_by_id = (select auth.uid())::text
             or (select private.is_admin()))$p$, t);
  end loop;
end;
$$;

-- "public read, admin write" tables
do $$
declare
  t text;
begin
  foreach t in array array['coupons','announcements','listing_moderation','report_settings',
                           'popular_cards_cache','listing_price_history'] loop
    execute format($p$create policy "%1$s: read all" on public.%1$I for select
      to anon, authenticated using (true)$p$, t);
    execute format($p$create policy "%1$s: admin insert" on public.%1$I for insert
      to authenticated with check ((select private.is_admin()))$p$, t);
    execute format($p$create policy "%1$s: admin update" on public.%1$I for update
      to authenticated using ((select private.is_admin())) with check ((select private.is_admin()))$p$, t);
    execute format($p$create policy "%1$s: admin delete" on public.%1$I for delete
      to authenticated using ((select private.is_admin()))$p$, t);
  end loop;
end;
$$;

-- premium_subscriptions: owner reads; writes only by admin (and edge functions via service role)
create policy "premium_subscriptions: own or admin read" on public.premium_subscriptions for select to authenticated
  using (user_id = (select auth.uid())::text or (select private.is_admin()));
create policy "premium_subscriptions: admin insert" on public.premium_subscriptions for insert to authenticated
  with check ((select private.is_admin()));
create policy "premium_subscriptions: admin update" on public.premium_subscriptions for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "premium_subscriptions: admin delete" on public.premium_subscriptions for delete to authenticated
  using ((select private.is_admin()));

-- access_requests: created by the submitAccessRequest edge function; admin manages
create policy "access_requests: admin read" on public.access_requests for select to authenticated
  using ((select private.is_admin()));
create policy "access_requests: admin update" on public.access_requests for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "access_requests: admin delete" on public.access_requests for delete to authenticated
  using ((select private.is_admin()));

-- search_activity: anyone (incl. guests) logs events; only admin reads/edits
create policy "search_activity: anyone create" on public.search_activity for insert
  to anon, authenticated with check (true);
create policy "search_activity: admin read" on public.search_activity for select to authenticated
  using ((select private.is_admin()));
create policy "search_activity: admin update" on public.search_activity for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "search_activity: admin delete" on public.search_activity for delete to authenticated
  using ((select private.is_admin()));

-- listing_reports: anyone reads (auto-hide counts), signed-in reports, admin edits
create policy "listing_reports: read all" on public.listing_reports for select to anon, authenticated using (true);
create policy "listing_reports: signed-in create" on public.listing_reports for insert to authenticated with check (true);
create policy "listing_reports: admin update" on public.listing_reports for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "listing_reports: admin delete" on public.listing_reports for delete to authenticated
  using ((select private.is_admin()));

-- guest_search_usage: admin only (edge functions use the service role)
create policy "guest_search_usage: admin all" on public.guest_search_usage for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- ---------------------------------------------------------------------------
-- New-user hook: create the profile and re-attach any Base44 data for that email
-- ---------------------------------------------------------------------------
create or replace function private.relink_legacy_user(old_id text, new_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.listings              set created_by_id = new_id where created_by_id = old_id;
  update public.orders                set buyer_id = new_id where buyer_id = old_id;
  update public.orders                set seller_id = new_id where seller_id = old_id;
  update public.orders                set created_by_id = new_id where created_by_id = old_id;
  update public.cart_items            set user_id = new_id where user_id = old_id;
  update public.offers                set buyer_id = new_id where buyer_id = old_id;
  update public.offers                set seller_id = new_id where seller_id = old_id;
  update public.messages              set sender_id = new_id where sender_id = old_id;
  update public.messages              set receiver_id = new_id where receiver_id = old_id;
  update public.reviews               set seller_id = new_id where seller_id = old_id;
  update public.reviews               set created_by_id = new_id where created_by_id = old_id;
  update public.favorites             set user_id = new_id where user_id = old_id;
  update public.followers             set follower_id = new_id where follower_id = old_id;
  update public.followers             set following_id = new_id where following_id = old_id;
  update public.notifications         set user_id = new_id where user_id = old_id;
  update public.addresses             set user_id = new_id where user_id = old_id;
  update public.premium_subscriptions set user_id = new_id where user_id = old_id;
  update public.access_requests       set user_id = new_id where user_id = old_id;
  update public.saved_searches        set user_id = new_id where user_id = old_id;
  update public.listing_reports       set created_by_id = new_id where created_by_id = old_id;
  update public.listing_moderation    set created_by_id = new_id where created_by_id = old_id;
end;
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  legacy private.legacy_users%rowtype;
begin
  select * into legacy from private.legacy_users where lower(email) = lower(new.email);

  insert into public.profiles (id, email, full_name, role, legacy_id, created_date)
  values (
    new.id,
    new.email,
    coalesce(legacy.full_name, new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    coalesce(legacy.role, 'user'),
    legacy.legacy_id,
    coalesce(legacy.created_date, now())
  );

  if legacy.legacy_id is not null then
    perform private.relink_legacy_user(legacy.legacy_id, new.id::text);
    delete from private.legacy_users where legacy_id = legacy.legacy_id;
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

revoke execute on function private.relink_legacy_user(text, text) from public, anon, authenticated;
revoke execute on function private.handle_new_user() from public, anon, authenticated;
