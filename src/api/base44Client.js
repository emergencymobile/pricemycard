// Supabase-backed replacement for the Base44 SDK client.
//
// The app was built on Base44 and calls `base44.entities.*`, `base44.auth.*`,
// `base44.functions.invoke` and `base44.integrations.Core.*` from ~40 files.
// This module keeps that exact surface so pages don't need to change, and maps
// each call onto Supabase (Postgres tables, Auth, Edge Functions, Storage).
import { supabase } from '@/api/supabaseClient';

// Base44 entity name -> Postgres table (see supabase/migrations).
const TABLES = {
  User: 'profiles',
  Listing: 'listings',
  Order: 'orders',
  CartItem: 'cart_items',
  Offer: 'offers',
  Message: 'messages',
  Review: 'reviews',
  Favorite: 'favorites',
  Follower: 'followers',
  Notification: 'notifications',
  Coupon: 'coupons',
  Address: 'addresses',
  PremiumSubscription: 'premium_subscriptions',
  AccessRequest: 'access_requests',
  SavedSearch: 'saved_searches',
  SearchActivity: 'search_activity',
  ListingReport: 'listing_reports',
  ListingModeration: 'listing_moderation',
  ListingPriceHistory: 'listing_price_history',
  PopularCardsCache: 'popular_cards_cache',
  GuestSearchUsage: 'guest_search_usage',
  Announcement: 'announcements',
  ReportSettings: 'report_settings',
};

// Tables clients may insert into but not read back (e.g. guests logging search
// activity). Asking Postgres to RETURN the new row would fail RLS and reject the
// whole insert, so create() skips the read-back for these.
const WRITE_ONLY = new Set(['search_activity']);

// Base44 SDK errors carry an HTTP-ish `status`; callers check it in a few places.
function apiError(message, status, cause) {
  const err = new Error(message);
  err.status = status;
  if (cause) err.cause = cause;
  return err;
}

function check({ data, error, status }) {
  if (error) throw apiError(error.message, status || 400, error);
  return data;
}

// "-created_date" -> order by created_date desc
function applySort(query, sort) {
  if (!sort) return query;
  const desc = sort.startsWith('-');
  return query.order(desc ? sort.slice(1) : sort, { ascending: !desc });
}

// Base44 filters in this app are plain equality objects; arrays mean "one of".
function applyFilter(query, filter = {}) {
  for (const [field, value] of Object.entries(filter)) {
    if (value === null) query = query.is(field, null);
    else if (Array.isArray(value)) query = query.in(field, value);
    else query = query.eq(field, value);
  }
  return query;
}

function entity(table) {
  const select = (filter, sort = '-created_date', limit) => {
    let query = applySort(applyFilter(supabase.from(table).select('*'), filter), sort);
    if (limit) query = query.limit(limit);
    return query.then(check);
  };

  return {
    list: (sort, limit) => select({}, sort, limit),
    filter: (filter, sort, limit) => select(filter, sort, limit),
    async get(id) {
      const rows = check(await supabase.from(table).select('*').eq('id', id).limit(1));
      if (!rows.length) throw apiError('Not found', 404);
      return rows[0];
    },
    async create(data) {
      if (WRITE_ONLY.has(table)) {
        check(await supabase.from(table).insert(data));
        return { ...data };
      }
      const rows = check(await supabase.from(table).insert(data).select());
      return rows[0];
    },
    async bulkCreate(items) {
      return check(await supabase.from(table).insert(items).select());
    },
    async update(id, data) {
      const rows = check(await supabase.from(table).update(data).eq('id', id).select());
      if (!rows.length) throw apiError('Not found or not allowed', 404);
      return rows[0];
    },
    async delete(id) {
      check(await supabase.from(table).delete().eq('id', id));
    },
  };
}

const entities = Object.fromEntries(
  Object.entries(TABLES).map(([name, table]) => [name, entity(table)])
);

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
const PROFILE_FIELDS = ['full_name', 'display_name', 'profile_image'];

async function currentAuthUser() {
  const { data } = await supabase.auth.getSession();
  return data.session?.user ?? null;
}

const auth = {
  // Returns the app user ({ id, email, full_name, role, ... }) or throws 401.
  async me() {
    const authUser = await currentAuthUser();
    if (!authUser) throw apiError('Not authenticated', 401);
    const rows = check(await supabase.from('profiles').select('*').eq('id', authUser.id).limit(1));
    const profile = rows[0] ?? {};
    return {
      ...profile,
      id: authUser.id,
      email: authUser.email,
      role: profile.role ?? 'user',
      full_name: profile.full_name ?? authUser.user_metadata?.full_name ?? authUser.email,
    };
  },

  async isAuthenticated() {
    return Boolean(await currentAuthUser());
  },

  async updateMe(data) {
    const authUser = await currentAuthUser();
    if (!authUser) throw apiError('Not authenticated', 401);
    const patch = Object.fromEntries(Object.entries(data).filter(([k]) => PROFILE_FIELDS.includes(k)));
    check(await supabase.from('profiles').update(patch).eq('id', authUser.id));
    return auth.me();
  },

  redirectToLogin(returnUrl = window.location.href) {
    const url = new URL(returnUrl, window.location.origin);
    window.location.href = `/login?returnTo=${encodeURIComponent(url.pathname + url.search)}`;
  },

  async logout(redirectUrl) {
    await supabase.auth.signOut();
    if (redirectUrl) window.location.href = redirectUrl;
  },

  async loginViaEmailPassword(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw apiError(error.message, error.status || 400, error);
    return data;
  },

  async loginWithProvider(provider, redirectPath = '/') {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: new URL(redirectPath, window.location.origin).href },
    });
    if (error) throw apiError(error.message, error.status || 400, error);
  },

  // Sign-up sends a 6-digit code by email (the "Confirm signup" template must
  // include {{ .Token }}); Register.jsx then calls verifyOtp with it.
  async register({ email, password }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) throw apiError(error.message, error.status || 400, error);
    return data;
  },

  async verifyOtp({ email, otpCode }) {
    const { data, error } = await supabase.auth.verifyOtp({ email, token: otpCode, type: 'email' });
    if (error) throw apiError(error.message, error.status || 400, error);
    return { access_token: data.session?.access_token };
  },

  async resendOtp(email) {
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    if (error) throw apiError(error.message, error.status || 400, error);
  },

  // Supabase keeps the session itself; kept for API compatibility.
  setToken() {},

  // The emailed link lands on /reset-password with a recovery session already
  // established, so the page's `token` param is just a marker.
  async resetPasswordRequest(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password?token=recovery`,
    });
    if (error) throw apiError(error.message, error.status || 400, error);
  },

  async resetPassword({ newPassword }) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw apiError(error.message, error.status || 400, error);
  },
};

// ---------------------------------------------------------------------------
// Backend functions -> Supabase Edge Functions (supabase/functions/<name>)
// ---------------------------------------------------------------------------
const functions = {
  // Resolves to { data } like the Base44 SDK. Functions report problems as
  // JSON bodies ({ error }, { rate_limited }), which callers read from
  // res.data even on non-2xx responses, so surface the body instead of throwing.
  async invoke(name, body = {}) {
    const { data, error } = await supabase.functions.invoke(name, { body });
    if (!error) return { data };
    const response = error.context;
    if (response && typeof response.json === 'function') {
      const payload = await response.json().catch(() => null);
      if (payload) return { data: payload };
    }
    throw apiError(error.message, response?.status || 500, error);
  },
};

// ---------------------------------------------------------------------------
// Integrations
// ---------------------------------------------------------------------------
async function uploadFile({ file }) {
  const authUser = await currentAuthUser();
  if (!authUser) throw apiError('Sign in to upload files', 401);
  const safeName = (file.name || 'upload').replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
  const path = `${authUser.id}/${crypto.randomUUID()}-${safeName}`;
  const { error } = await supabase.storage
    .from('uploads')
    .upload(path, file, { contentType: file.type || undefined });
  if (error) throw apiError(error.message, 400, error);
  const { data } = supabase.storage.from('uploads').getPublicUrl(path);
  return { file_url: data.publicUrl };
}

const integrations = {
  Core: {
    UploadFile: uploadFile,
    UploadPublicFile: uploadFile,
  },
};

export const base44 = { entities, auth, functions, integrations };
